const { spawn, execFile } = require('child_process');
const path = require('path');
const fs = require('fs');

class FFmpegService {
  constructor() {
    this.ffmpegPath = this.detectBinary('ffmpeg');
    this.ffprobePath = this.detectBinary('ffprobe');
    this.currentProcess = null;
  }

  detectBinary(name) {
    const candidates = [
      `/opt/homebrew/bin/${name}`,
      `/usr/local/bin/${name}`,
      `/usr/bin/${name}`
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) {
        return c;
      }
    }
    return name; // fallback to PATH
  }

  async probeFile(filePath) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File non trovato: ${filePath}`);
    }

    return new Promise((resolve, reject) => {
      const args = [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        filePath
      ];

      execFile(this.ffprobePath, args, { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
        if (err) {
          return reject(new Error(`Errore durante l'analisi del file: ${stderr || err.message}`));
        }

        try {
          const data = JSON.parse(stdout);
          const format = data.format || {};
          const streams = data.streams || [];

          const videoStream = streams.find(s => s.codec_type === 'video');
          const audioStreams = streams.filter(s => s.codec_type === 'audio');

          const duration = parseFloat(format.duration || (videoStream && videoStream.duration) || 0);

          let fps = 0;
          if (videoStream && videoStream.r_frame_rate) {
            const parts = videoStream.r_frame_rate.split('/');
            if (parts.length === 2 && parseFloat(parts[1]) > 0) {
              fps = Math.round((parseFloat(parts[0]) / parseFloat(parts[1])) * 100) / 100;
            }
          }

          const result = {
            filePath,
            fileName: path.basename(filePath),
            fileSize: parseInt(format.size || 0, 10),
            duration: duration,
            bitRate: parseInt(format.bit_rate || 0, 10),
            formatName: format.format_long_name || format.format_name || 'Sconosciuto',
            hasVideo: Boolean(videoStream),
            hasAudio: audioStreams.length > 0,
            video: videoStream ? {
              codec: videoStream.codec_name,
              codecLong: videoStream.codec_long_name,
              width: videoStream.width,
              height: videoStream.height,
              fps: fps || 30,
              pixFmt: videoStream.pix_fmt,
              duration: parseFloat(videoStream.duration || duration)
            } : null,
            audio: audioStreams.length > 0 ? {
              codec: audioStreams[0].codec_name,
              codecLong: audioStreams[0].codec_long_name,
              channels: audioStreams[0].channels,
              sampleRate: parseInt(audioStreams[0].sample_rate || 44100, 10),
              bitRate: parseInt(audioStreams[0].bit_rate || 0, 10),
              duration: parseFloat(audioStreams[0].duration || duration)
            } : null
          };

          resolve(result);
        } catch (parseErr) {
          reject(new Error(`Errore nel parsing dei metadati: ${parseErr.message}`));
        }
      });
    });
  }

  buildArguments(options) {
    const {
      videoPath,
      audioPath,
      outputPath,
      videoDuration,
      audioDuration,
      audioOffset = 0,         // offset in seconds (can be positive or negative)
      extendMode = 'freeze',   // 'freeze', 'loop', 'stretch'
      videoCodec = 'h264_videotoolbox',
      audioCodec = 'aac',
      qualityPreset = 'balanced', // 'hardware', 'quality', 'balanced', 'compressed', 'custom'
      crf = 23,
      videoBitrate = '4000k',
      audioBitrate = '192k',
      resolution = 'original', // 'original', '3840x2160', '1920x1080', '1280x720'
      mixOriginalAudio = false,
      originalAudioVolume = 0.5,
      newAudioVolume = 1.0
    } = options;

    const args = ['-y'];

    // Calcolo delle durate effettive e posizionamento timeline
    // Video va da 0 a videoDuration
    // Audio va da audioOffset a audioOffset + audioDuration
    const audioStart = Math.max(0, audioOffset);
    const audioTrimStart = audioOffset < 0 ? Math.abs(audioOffset) : 0;
    const effectiveAudioEnd = audioStart + (audioDuration - audioTrimStart);
    const audioLongerBy = effectiveAudioEnd - videoDuration;

    const needsVideoExtension = audioLongerBy > 0.05;
    const targetDuration = Math.max(videoDuration, effectiveAudioEnd);

    // Se usiamo 'loop' come estensione del video
    if (needsVideoExtension && extendMode === 'loop') {
      args.push('-stream_loop', '-1');
    }

    // Input 0: Video
    args.push('-i', videoPath);

    // Input 1: Nuova traccia Audio
    args.push('-i', audioPath);

    // Configurazione filtri
    const filterComplex = [];
    let videoOutLabel = '0:v';
    let audioOutLabel = '1:a';

    // 1. Trattamento Video: Risoluzione + Allungamento (se audio è più lungo)
    const videoFilters = [];

    // Scaling se richiesto
    if (resolution !== 'original' && resolution.includes('x')) {
      const [w, h] = resolution.split('x');
      videoFilters.push(`scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2`);
    } else {
      // Assicura dimensioni divisibili per 2 per yuv420p
      videoFilters.push('scale=trunc(iw/2)*2:trunc(ih/2)*2');
    }

    // Allungamento video
    if (needsVideoExtension) {
      if (extendMode === 'freeze') {
        // Blocca l'ultimo frame con tpad
        const padDuration = (audioLongerBy).toFixed(3);
        videoFilters.push(`tpad=stop_mode=clone:stop_duration=${padDuration}`);
      } else if (extendMode === 'stretch') {
        // Rallenta il video per adattarlo alla durata dell'audio
        const speedFactor = (effectiveAudioEnd / videoDuration).toFixed(4);
        videoFilters.push(`setpts=${speedFactor}*PTS`);
      }
      // Se extendMode === 'loop', il video viene looppato dall'input stream_loop e poi troncato a targetDuration
    }

    if (videoFilters.length > 0) {
      filterComplex.push(`[0:v]${videoFilters.join(',')}[v_processed]`);
      videoOutLabel = '[v_processed]';
    }

    // 2. Trattamento Audio: Offset, Trim, Delay e Mix opzionale
    const audioFilters = [];

    if (audioTrimStart > 0) {
      audioFilters.push(`atrim=start=${audioTrimStart.toFixed(3)},asetpts=PTS-STARTPTS`);
    }
    if (audioStart > 0) {
      const delayMs = Math.round(audioStart * 1000);
      audioFilters.push(`adelay=delays=${delayMs}:all=1`);
    }

    if (newAudioVolume !== 1.0) {
      audioFilters.push(`volume=${newAudioVolume.toFixed(2)}`);
    }

    // Assicura sempre campionamento standard stereo 48000Hz e sincronizzazione PTS
    audioFilters.push('aformat=channel_layouts=stereo:sample_rates=48000');
    audioFilters.push('asetpts=PTS-STARTPTS');

    if (mixOriginalAudio) {
      // In caso di mix, prendiamo l'audio dal video [0:a] e lo uniamo a [1:a]
      filterComplex.push(`[1:a]${audioFilters.join(',')}[a_new]`);
      filterComplex.push(`[0:a]aformat=channel_layouts=stereo:sample_rates=48000,volume=${originalAudioVolume.toFixed(2)}[a_orig]`);
      filterComplex.push(`[a_new][a_orig]amix=inputs=2:duration=longest:dropout_transition=2[a_mixed]`);
      audioOutLabel = '[a_mixed]';
    } else {
      filterComplex.push(`[1:a]${audioFilters.join(',')}[a_processed]`);
      audioOutLabel = '[a_processed]';
    }

    // Applica Filter Complex se generato
    if (filterComplex.length > 0) {
      args.push('-filter_complex', filterComplex.join(';'));
      args.push('-map', videoOutLabel);
      args.push('-map', audioOutLabel);
    } else {
      args.push('-map', '0:v');
      args.push('-map', '1:a');
    }

    // Imposta la durata massima di output in base all'allungamento
    args.push('-t', targetDuration.toFixed(3));

    // Configurazione Codec Video
    if (videoCodec === 'copy' && filterComplex.length === 0) {
      args.push('-c:v', 'copy');
    } else {
      let vCodecToUse = videoCodec === 'copy' ? 'h264_videotoolbox' : videoCodec;
      args.push('-c:v', vCodecToUse);

      if (vCodecToUse === 'h264_videotoolbox' || vCodecToUse === 'hevc_videotoolbox') {
        // VideoToolbox hardware encoder su macOS
        if (qualityPreset === 'quality') {
          args.push('-b:v', '8000k', '-maxrate', '12000k');
        } else if (qualityPreset === 'compressed') {
          args.push('-b:v', '2000k', '-maxrate', '3000k');
        } else if (qualityPreset === 'custom') {
          args.push('-b:v', videoBitrate);
        } else {
          // balanced / default
          args.push('-b:v', '4500k', '-maxrate', '6500k');
        }
        args.push('-pix_fmt', 'yuv420p');
      } else if (vCodecToUse === 'libx264' || vCodecToUse === 'libx265') {
        const crfValue = qualityPreset === 'quality' ? 18 : qualityPreset === 'compressed' ? 28 : (qualityPreset === 'custom' ? crf : 23);
        args.push('-crf', crfValue.toString());
        args.push('-preset', 'fast');
        args.push('-pix_fmt', 'yuv420p');
      } else if (vCodecToUse === 'libsvtav1') {
        args.push('-crf', (crf || 28).toString(), '-preset', '6', '-pix_fmt', 'yuv420p10le');
      } else if (vCodecToUse === 'prores_ks') {
        args.push('-profile:v', '3', '-pix_fmt', 'yuv422p10le');
      }

      // CRUCIALE PER MACOS & QUICKTIME:
      // Se il codec video è HEVC / H.265 (sia hardware VideoToolbox che libx265),
      // macOS QuickTime e AVFoundation richiedono tassativamente il FourCC tag 'hvc1'
      // invece del predefinito 'hev1', altrimenti il video non si apre su Mac!
      if (vCodecToUse === 'hevc_videotoolbox' || vCodecToUse === 'libx265') {
        args.push('-tag:v', 'hvc1');
      }
    }

    // Opzioni per file compatibili con QuickTime / macOS
    const ext = path.extname(outputPath).toLowerCase();

    // Configurazione Codec Audio
    let aCodecToUse = audioCodec === 'copy' ? 'aac' : audioCodec;

    // FONDAMENTALE PER MACOS & QUICKTIME:
    // I contenitori Apple MP4 e MOV NON supportano flussi MP3, Opus o FLAC tramite il decoder di sistema CoreAudio/AVFoundation.
    // Se viene generato un file .mp4/.mov con MP3/Opus/FLAC, QuickTime apre il video ma NON RIPRODUCE ALCUN SUONO.
    // Forziamo quindi sempre AAC (lo standard nativo MPEG-4 Audio) per i file .mp4, .mov, .m4v.
    if ((ext === '.mp4' || ext === '.mov' || ext === '.m4v') && (aCodecToUse === 'libmp3lame' || aCodecToUse === 'libopus' || aCodecToUse === 'flac')) {
      console.log(`[FFmpeg] Rilevato container ${ext} con codec audio ${aCodecToUse}: impostato automaticamente su 'aac' per compatibilità audio macOS QuickTime`);
      aCodecToUse = 'aac';
    }

    args.push('-c:a', aCodecToUse);
    if (['aac', 'libmp3lame', 'libopus'].includes(aCodecToUse)) {
      args.push('-b:a', audioBitrate || '192k');
    }

    if (ext === '.mp4' || ext === '.mov' || ext === '.m4v') {
      args.push('-movflags', '+faststart');
    }

    args.push(outputPath);

    return {
      args,
      targetDuration
    };
  }

  export(options, onProgress) {
    return new Promise((resolve, reject) => {
      try {
        const { args, targetDuration } = this.buildArguments(options);

        // Aggiungi flag per progress parsing regolare su stderr
        const fullArgs = ['-progress', 'pipe:1', ...args];

        console.log(`[FFmpeg] Avvio processo: ${this.ffmpegPath} ${fullArgs.join(' ')}`);

        const proc = spawn(this.ffmpegPath, fullArgs);
        this.currentProcess = proc;

        let totalDurationUs = targetDuration * 1000000;
        let lastReportedPercent = 0;
        let stderrBuffer = '';

        proc.stdout.on('data', (data) => {
          const lines = data.toString().split('\n');
          const progressData = {};

          for (const line of lines) {
            const [key, value] = line.split('=');
            if (key && value) {
              progressData[key.trim()] = value.trim();
            }
          }

          if (progressData.out_time_us) {
            const currentUs = parseInt(progressData.out_time_us, 10);
            if (!isNaN(currentUs) && totalDurationUs > 0) {
              let percent = Math.min(100, Math.max(0, (currentUs / totalDurationUs) * 100));
              percent = Math.round(percent * 10) / 10;

              if (percent !== lastReportedPercent) {
                lastReportedPercent = percent;
                if (typeof onProgress === 'function') {
                  onProgress({
                    percent,
                    currentTime: (currentUs / 1000000),
                    totalTime: targetDuration,
                    fps: progressData.fps || '0',
                    speed: progressData.speed || '1x',
                    frame: progressData.frame || '0'
                  });
                }
              }
            }
          }

          if (progressData.progress === 'end') {
            if (typeof onProgress === 'function') {
              onProgress({
                percent: 100,
                currentTime: targetDuration,
                totalTime: targetDuration,
                fps: progressData.fps || '0',
                speed: progressData.speed || '1x',
                frame: progressData.frame || '0'
              });
            }
          }
        });

        proc.stderr.on('data', (data) => {
          stderrBuffer += data.toString();
          // Manteniamo solo gli ultimi 2000 caratteri per non sovraccaricare la memoria
          if (stderrBuffer.length > 5000) {
            stderrBuffer = stderrBuffer.slice(-5000);
          }
        });

        proc.on('error', (err) => {
          this.currentProcess = null;
          reject(new Error(`Errore nell'avvio di FFmpeg: ${err.message}`));
        });

        proc.on('close', (code) => {
          this.currentProcess = null;
          if (code === 0) {
            resolve({
              outputPath: options.outputPath,
              duration: targetDuration
            });
          } else {
            reject(new Error(`FFmpeg terminato con codice di errore ${code}.\n${stderrBuffer.slice(-1000)}`));
          }
        });

      } catch (err) {
        this.currentProcess = null;
        reject(err);
      }
    });
  }

  cancelExport() {
    if (this.currentProcess) {
      console.log('[FFmpeg] Annullamento esportazione richiesta');
      this.currentProcess.kill('SIGINT');
      this.currentProcess = null;
      return true;
    }
    return false;
  }
}

module.exports = FFmpegService;
