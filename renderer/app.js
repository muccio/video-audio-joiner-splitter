document.addEventListener('DOMContentLoaded', () => {
  // Application State
  const state = {
    videoFile: null,
    videoMeta: null,
    audioFile: null,
    audioMeta: null,
    audioOffset: 0.0,
    extendMode: 'freeze',
    preset: 'hardware',
    videoCodec: 'h264_videotoolbox',
    audioCodec: 'aac',
    crf: 23,
    videoBitrate: '4500k',
    audioBitrate: '192k',
    resolution: 'original',
    mixOriginalAudio: false,
    isPlaying: false,
    exportedFilePath: null
  };

  // DOM Elements
  const videoCard = document.getElementById('videoCard');
  const videoDropZone = document.getElementById('videoDropZone');
  const videoDropEmpty = document.getElementById('videoDropEmpty');
  const videoPreviewContainer = document.getElementById('videoPreviewContainer');
  const videoPreviewEl = document.getElementById('videoPreviewEl');
  const videoDetails = document.getElementById('videoDetails');
  const btnBrowseVideo = document.getElementById('btnBrowseVideo');

  const audioCard = document.getElementById('audioCard');
  const audioDropZone = document.getElementById('audioDropZone');
  const audioDropEmpty = document.getElementById('audioDropEmpty');
  const audioPreviewContainer = document.getElementById('audioPreviewContainer');
  const audioPreviewEl = document.getElementById('audioPreviewEl');
  const audioVisualizerCanvas = document.getElementById('audioVisualizerCanvas');
  const audioDetails = document.getElementById('audioDetails');
  const btnBrowseAudio = document.getElementById('btnBrowseAudio');

  const extensionBanner = document.getElementById('extensionBanner');
  const extensionTitle = document.getElementById('extensionTitle');

  const audioOffsetInput = document.getElementById('audioOffsetInput');
  const btnOffsetMinus1 = document.getElementById('btnOffsetMinus1');
  const btnOffsetMinus01 = document.getElementById('btnOffsetMinus01');
  const btnOffsetPlus01 = document.getElementById('btnOffsetPlus01');
  const btnOffsetPlus1 = document.getElementById('btnOffsetPlus1');
  const btnAlignStart = document.getElementById('btnAlignStart');
  const btnAlignEnd = document.getElementById('btnAlignEnd');
  const mixOriginalAudioCheckbox = document.getElementById('mixOriginalAudioCheckbox');

  const btnPlayPause = document.getElementById('btnPlayPause');
  const btnStop = document.getElementById('btnStop');

  const presetCards = document.querySelectorAll('.preset-card');
  const videoCodecSelect = document.getElementById('videoCodecSelect');
  const audioCodecSelect = document.getElementById('audioCodecSelect');
  const qualitySlider = document.getElementById('qualitySlider');
  const qualityValueLabel = document.getElementById('qualityValueLabel');
  const resolutionSelect = document.getElementById('resolutionSelect');
  const audioBitrateSelect = document.getElementById('audioBitrateSelect');

  const outputDurationSummary = document.getElementById('outputDurationSummary');
  const outputModeSummary = document.getElementById('outputModeSummary');
  const outputCodecSummary = document.getElementById('outputCodecSummary');
  const btnExport = document.getElementById('btnExport');

  // Modal elements
  const progressModal = document.getElementById('progressModal');
  const modalTitle = document.getElementById('modalTitle');
  const progressBarFill = document.getElementById('progressBarFill');
  const progressPercent = document.getElementById('progressPercent');
  const progressTime = document.getElementById('progressTime');
  const progressSpeed = document.getElementById('progressSpeed');
  const progressFps = document.getElementById('progressFps');
  const btnCancelExport = document.getElementById('btnCancelExport');
  const exportSuccessBox = document.getElementById('exportSuccessBox');
  const successFilePath = document.getElementById('successFilePath');
  const btnOpenExported = document.getElementById('btnOpenExported');
  const btnShowInFinder = document.getElementById('btnShowInFinder');
  const modalFooterNormal = document.getElementById('modalFooterNormal');
  const modalFooterDone = document.getElementById('modalFooterDone');
  const btnCloseModal = document.getElementById('btnCloseModal');

  // Inizializza Timeline
  const timeline = new window.TimelineController({
    onOffsetChange: (newOffset) => {
      state.audioOffset = newOffset;
      audioOffsetInput.value = newOffset.toFixed(2);
      checkExtension();
      updateSummary();
    },
    onSeek: (seconds) => {
      seekPreview(seconds);
    }
  });

  // Gestione File Drop & Picker
  setupDragAndDrop();
  setupPickerEvents();
  setupTimelineControls();
  setupEncodingControls();
  setupExport();

  function setupDragAndDrop() {
    [videoDropZone, audioDropZone].forEach(zone => {
      zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.classList.add('dragover');
      });
      zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
    });

    videoDropZone.addEventListener('drop', async (e) => {
      e.preventDefault();
      videoDropZone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        await handleVideoFile(file.path || file.name, file);
      }
    });

    audioDropZone.addEventListener('drop', async (e) => {
      e.preventDefault();
      audioDropZone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        await handleAudioFile(file.path || file.name, file);
      }
    });

    // Permette il click diretto sulle drop zone per sfogliare
    videoDropZone.addEventListener('click', (e) => {
      if (e.target.tagName !== 'VIDEO') btnBrowseVideo.click();
    });
    audioDropZone.addEventListener('click', () => btnBrowseAudio.click());
  }

  function setupPickerEvents() {
    btnBrowseVideo.addEventListener('click', async () => {
      try {
        const res = await window.electronAPI.selectFile({ type: 'video' });
        if (res && res.filePath) {
          await handleVideoMetadata(res.filePath, res.probeData);
        }
      } catch (err) {
        alert(`Errore selezione video: ${err.message}`);
      }
    });

    btnBrowseAudio.addEventListener('click', async () => {
      try {
        const res = await window.electronAPI.selectFile({ type: 'audio' });
        if (res && res.filePath) {
          await handleAudioMetadata(res.filePath, res.probeData);
        }
      } catch (err) {
        alert(`Errore selezione audio: ${err.message}`);
      }
    });
  }

  async function handleVideoFile(filePath, fileObj) {
    try {
      const probeData = await window.electronAPI.probeFile(filePath);
      await handleVideoMetadata(filePath, probeData, fileObj);
    } catch (err) {
      alert(`Errore lettura file video: ${err.message}`);
    }
  }

  async function handleAudioFile(filePath, fileObj) {
    try {
      const probeData = await window.electronAPI.probeFile(filePath);
      await handleAudioMetadata(filePath, probeData, fileObj);
    } catch (err) {
      alert(`Errore lettura file audio: ${err.message}`);
    }
  }

  async function handleVideoMetadata(filePath, meta, fileObj) {
    state.videoFile = filePath;
    state.videoMeta = meta;

    // UI Updates
    videoDropEmpty.classList.add('hidden');
    videoPreviewContainer.classList.remove('hidden');
    videoDropZone.classList.add('has-file');
    videoDetails.classList.remove('hidden');

    document.getElementById('videoName').textContent = meta.fileName;
    document.getElementById('videoDurationTag').textContent = formatTime(meta.duration);
    document.getElementById('videoResolutionTag').textContent = meta.video ? `${meta.video.width}x${meta.video.height}` : 'N/D';
    document.getElementById('videoFpsTag').textContent = meta.video ? `${meta.video.fps} fps` : '-';
    document.getElementById('videoCodecTag').textContent = meta.video ? meta.video.codec.toUpperCase() : '-';
    document.getElementById('videoSizeTag').textContent = `${(meta.fileSize / (1024 * 1024)).toFixed(1)} MB`;

    // Carica preview video
    videoPreviewEl.src = `file://${filePath}`;
    videoPreviewEl.load();

    timeline.setMedia({
      videoDuration: meta.duration,
      videoName: meta.fileName
    });

    checkExtension();
    updateSummary();
    validateExportButton();
  }

  async function handleAudioMetadata(filePath, meta, fileObj) {
    state.audioFile = filePath;
    state.audioMeta = meta;

    // UI Updates
    audioDropEmpty.classList.add('hidden');
    audioPreviewContainer.classList.remove('hidden');
    audioDropZone.classList.add('has-file');
    audioDetails.classList.remove('hidden');

    document.getElementById('audioName').textContent = meta.fileName;
    document.getElementById('audioDurationTag').textContent = formatTime(meta.duration);
    document.getElementById('audioChannelsTag').textContent = meta.audio ? `${meta.audio.channels} canali` : '-';
    document.getElementById('audioSampleRateTag').textContent = meta.audio ? `${meta.audio.sampleRate} Hz` : '-';
    document.getElementById('audioCodecTag').textContent = meta.audio ? meta.audio.codec.toUpperCase() : '-';
    document.getElementById('audioSizeTag').textContent = `${(meta.fileSize / (1024 * 1024)).toFixed(1)} MB`;

    // Carica preview audio
    audioPreviewEl.src = `file://${filePath}`;
    audioPreviewEl.load();

    drawSimulatedWaveform();

    timeline.setMedia({
      audioDuration: meta.duration,
      audioName: meta.fileName
    });

    checkExtension();
    updateSummary();
    validateExportButton();
  }

  function drawSimulatedWaveform() {
    const canvas = audioVisualizerCanvas;
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.parentElement.clientWidth || 300;
    canvas.height = canvas.parentElement.clientHeight || 124;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const bars = Math.floor(canvas.width / 4);
    const mid = canvas.height / 2;

    const grad = ctx.createLinearGradient(0, 0, canvas.width, 0);
    grad.addColorStop(0, '#30d158');
    grad.addColorStop(1, '#64d2ff');
    ctx.fillStyle = grad;

    for (let i = 0; i < bars; i++) {
      const h = Math.max(4, Math.sin(i * 0.15) * Math.cos(i * 0.05) * (canvas.height * 0.4) + Math.random() * (canvas.height * 0.3));
      ctx.fillRect(i * 4, mid - h / 2, 2.5, h);
    }
  }

  function checkExtension() {
    if (!state.videoMeta || !state.audioMeta) {
      extensionBanner.classList.add('hidden');
      return;
    }

    const videoDur = state.videoMeta.duration;
    const effectiveAudioEnd = Math.max(0, state.audioOffset) + state.audioMeta.duration;
    const diff = effectiveAudioEnd - videoDur;

    if (diff > 0.05) {
      extensionBanner.classList.remove('hidden');
      extensionTitle.textContent = `⚡ Audio più lungo del video (+${diff.toFixed(2)}s) — Il video verrà allungato`;
      timeline.setExtendMode(state.extendMode);
    } else {
      extensionBanner.classList.add('hidden');
    }
  }

  function setupTimelineControls() {
    // Gestione radio per modalità allungamento
    document.querySelectorAll('input[name="extendMode"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        state.extendMode = e.target.value;
        document.querySelectorAll('.radio-card').forEach(c => c.classList.remove('active'));
        e.target.closest('.radio-card').classList.add('active');
        timeline.setExtendMode(state.extendMode);
        updateSummary();
      });
    });

    // Offset numerico manuale
    audioOffsetInput.addEventListener('change', () => {
      const val = parseFloat(audioOffsetInput.value) || 0;
      state.audioOffset = val;
      timeline.setOffset(val);
      checkExtension();
      updateSummary();
    });

    btnOffsetMinus1.addEventListener('click', () => adjustOffset(-1.0));
    btnOffsetMinus01.addEventListener('click', () => adjustOffset(-0.1));
    btnOffsetPlus01.addEventListener('click', () => adjustOffset(0.1));
    btnOffsetPlus1.addEventListener('click', () => adjustOffset(1.0));

    btnAlignStart.addEventListener('click', () => {
      adjustOffset(-state.audioOffset);
    });

    btnAlignEnd.addEventListener('click', () => {
      if (state.videoMeta && state.audioMeta) {
        const targetOffset = state.videoMeta.duration - state.audioMeta.duration;
        state.audioOffset = Math.round(targetOffset * 100) / 100;
        audioOffsetInput.value = state.audioOffset.toFixed(2);
        timeline.setOffset(state.audioOffset);
        checkExtension();
        updateSummary();
      }
    });

    mixOriginalAudioCheckbox.addEventListener('change', (e) => {
      state.mixOriginalAudio = e.target.checked;
      updateSummary();
    });

    // Riproduzione Sincronizzata
    btnPlayPause.addEventListener('click', togglePlayPause);
    btnStop.addEventListener('click', stopPlayback);

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && e.target.tagName !== 'INPUT') {
        e.preventDefault();
        togglePlayPause();
      }
    });
  }

  function adjustOffset(delta) {
    state.audioOffset = Math.round((state.audioOffset + delta) * 100) / 100;
    audioOffsetInput.value = state.audioOffset.toFixed(2);
    timeline.setOffset(state.audioOffset);
    checkExtension();
    updateSummary();
  }

  let animationFrameId = null;

  function togglePlayPause() {
    if (state.isPlaying) {
      pausePlayback();
    } else {
      startPlayback();
    }
  }

  function startPlayback() {
    if (!state.videoMeta && !state.audioMeta) return;

    state.isPlaying = true;
    btnPlayPause.textContent = '⏸️ Pausa';

    const curTime = timeline.currentTime;
    syncMediaElements(curTime);

    function loop() {
      if (!state.isPlaying) return;

      const dur = timeline.totalDuration;
      let nextTime = timeline.currentTime + 0.033; // ~30 fps tick

      if (nextTime >= dur) {
        stopPlayback();
        return;
      }

      timeline.setCurrentTime(nextTime);
      syncMediaElements(nextTime);
      animationFrameId = requestAnimationFrame(loop);
    }

    animationFrameId = requestAnimationFrame(loop);
  }

  function pausePlayback() {
    state.isPlaying = false;
    btnPlayPause.textContent = '▶️ Play';
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    videoPreviewEl.pause();
    audioPreviewEl.pause();
  }

  function stopPlayback() {
    pausePlayback();
    timeline.seekTo(0);
    seekPreview(0);
  }

  function seekPreview(time) {
    syncMediaElements(time);
  }

  function syncMediaElements(time) {
    // Sincronizza video
    if (state.videoMeta) {
      if (time <= state.videoMeta.duration) {
        videoPreviewEl.currentTime = time;
        if (state.isPlaying && videoPreviewEl.paused) videoPreviewEl.play().catch(() => {});
      } else {
        // Se siamo oltre la durata video (estensione con freeze o loop)
        if (state.extendMode === 'freeze') {
          videoPreviewEl.currentTime = state.videoMeta.duration - 0.05;
          videoPreviewEl.pause();
        } else if (state.extendMode === 'loop') {
          const loopTime = time % state.videoMeta.duration;
          videoPreviewEl.currentTime = loopTime;
          if (state.isPlaying && videoPreviewEl.paused) videoPreviewEl.play().catch(() => {});
        }
      }
    }

    // Sincronizza audio tenendo conto dell'offset
    if (state.audioMeta) {
      const audioLocalTime = time - state.audioOffset;
      if (audioLocalTime >= 0 && audioLocalTime <= state.audioMeta.duration) {
        if (Math.abs(audioPreviewEl.currentTime - audioLocalTime) > 0.15) {
          audioPreviewEl.currentTime = audioLocalTime;
        }
        if (state.isPlaying && audioPreviewEl.paused) {
          audioPreviewEl.play().catch(() => {});
        }
      } else {
        audioPreviewEl.pause();
      }
    }
  }

  function setupEncodingControls() {
    // Presets
    presetCards.forEach(card => {
      card.addEventListener('click', () => {
        presetCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        state.preset = card.dataset.preset;
        applyPreset(state.preset);
        updateSummary();
      });
    });

    videoCodecSelect.addEventListener('change', (e) => {
      state.videoCodec = e.target.value;
      updateSummary();
    });

    audioCodecSelect.addEventListener('change', (e) => {
      state.audioCodec = e.target.value;
      updateSummary();
    });

    qualitySlider.addEventListener('input', (e) => {
      state.crf = parseInt(e.target.value, 10);
      let desc = `Bilanciato (${state.crf})`;
      if (state.crf <= 18) desc = `Alta Qualità (${state.crf})`;
      else if (state.crf >= 28) desc = `Massima Compressione (${state.crf})`;
      qualityValueLabel.textContent = desc;
      updateSummary();
    });

    resolutionSelect.addEventListener('change', (e) => {
      state.resolution = e.target.value;
      updateSummary();
    });

    audioBitrateSelect.addEventListener('change', (e) => {
      state.audioBitrate = e.target.value;
      updateSummary();
    });
  }

  function applyPreset(preset) {
    if (preset === 'hardware') {
      videoCodecSelect.value = 'h264_videotoolbox';
      audioCodecSelect.value = 'aac';
      qualitySlider.value = 23;
      audioBitrateSelect.value = '192k';
      state.videoCodec = 'h264_videotoolbox';
      state.audioCodec = 'aac';
    } else if (preset === 'quality') {
      videoCodecSelect.value = 'libx264';
      audioCodecSelect.value = 'aac';
      qualitySlider.value = 18;
      audioBitrateSelect.value = '256k';
      state.videoCodec = 'libx264';
      state.audioCodec = 'aac';
    } else if (preset === 'compressed') {
      videoCodecSelect.value = 'hevc_videotoolbox';
      audioCodecSelect.value = 'aac';
      qualitySlider.value = 28;
      audioBitrateSelect.value = '128k';
      state.videoCodec = 'hevc_videotoolbox';
      state.audioCodec = 'aac';
    } else if (preset === 'prores') {
      videoCodecSelect.value = 'prores_ks';
      audioCodecSelect.value = 'pcm_s16le';
      qualitySlider.value = 16;
      state.videoCodec = 'prores_ks';
      state.audioCodec = 'pcm_s16le';
    }
    qualitySlider.dispatchEvent(new Event('input'));
  }

  function updateSummary() {
    if (!state.videoMeta && !state.audioMeta) {
      outputDurationSummary.textContent = '00:00';
      outputModeSummary.textContent = 'Normale';
      return;
    }

    const dur = timeline.totalDuration;
    outputDurationSummary.textContent = formatTime(dur);

    const videoDur = state.videoMeta ? state.videoMeta.duration : 0;
    const effectiveAudioEnd = state.audioMeta ? Math.max(0, state.audioOffset) + state.audioMeta.duration : 0;

    if (effectiveAudioEnd > videoDur && state.audioMeta && state.videoMeta) {
      const modeNames = {
        freeze: 'Allungamento (Freeze frame)',
        loop: 'Allungamento (Loop video)',
        stretch: 'Allungamento (Time stretch)'
      };
      outputModeSummary.textContent = modeNames[state.extendMode] || 'Allungamento';
      outputModeSummary.style.color = '#bf5af2';
    } else {
      outputModeSummary.textContent = 'Pareggio normale';
      outputModeSummary.style.color = '#30d158';
    }

    outputCodecSummary.textContent = `${videoCodecSelect.options[videoCodecSelect.selectedIndex].text.split('(')[0].trim()} + ${audioCodecSelect.value.toUpperCase()}`;
  }

  function validateExportButton() {
    const isValid = Boolean(state.videoFile && state.audioFile);
    btnExport.disabled = !isValid;
  }

  function setupExport() {
    btnExport.addEventListener('click', async () => {
      if (!state.videoFile || !state.audioFile) return;

      // Suggerisci nome file salvataggio
      const baseName = state.videoMeta.fileName.replace(/\.[^/.]+$/, '');
      const suggestedName = `${baseName}_joined.mp4`;

      const outputPath = await window.electronAPI.selectOutputFile({ defaultName: suggestedName });
      if (!outputPath) return; // annullato dall'utente

      // Reset modal UI
      progressModal.classList.remove('hidden');
      modalTitle.textContent = 'Esportazione & Compressione in corso...';
      progressBarFill.style.width = '0%';
      progressPercent.textContent = '0%';
      progressTime.textContent = '0.0s / 0.0s';
      progressSpeed.textContent = '-';
      progressFps.textContent = '-';
      exportSuccessBox.classList.add('hidden');
      modalFooterNormal.classList.remove('hidden');
      modalFooterDone.classList.add('hidden');

      const config = {
        videoPath: state.videoFile,
        audioPath: state.audioFile,
        outputPath,
        videoDuration: state.videoMeta.duration,
        audioDuration: state.audioMeta.duration,
        audioOffset: state.audioOffset,
        extendMode: state.extendMode,
        videoCodec: state.videoCodec,
        audioCodec: state.audioCodec,
        qualityPreset: state.preset,
        crf: state.crf,
        videoBitrate: state.videoBitrate,
        audioBitrate: state.audioBitrate,
        resolution: state.resolution,
        mixOriginalAudio: state.mixOriginalAudio
      };

      try {
        const result = await window.electronAPI.startExport(config);
        state.exportedFilePath = result.outputPath;

        // Visualizza completamento
        modalTitle.textContent = 'Esportazione Terminata!';
        progressBarFill.style.width = '100%';
        progressPercent.textContent = '100%';
        exportSuccessBox.classList.remove('hidden');
        successFilePath.textContent = result.outputPath;
        modalFooterNormal.classList.add('hidden');
        modalFooterDone.classList.remove('hidden');
      } catch (err) {
        alert(`Errore durante l'esportazione: ${err.message}`);
        progressModal.classList.add('hidden');
      }
    });

    window.electronAPI.onExportProgress((p) => {
      progressBarFill.style.width = `${p.percent}%`;
      progressPercent.textContent = `${Math.round(p.percent)}%`;
      progressTime.textContent = `${p.currentTime?.toFixed(1) || 0}s / ${p.totalTime?.toFixed(1) || 0}s`;
      progressSpeed.textContent = p.speed || '-';
      progressFps.textContent = `${p.fps || 0} fps`;
    });

    btnCancelExport.addEventListener('click', async () => {
      await window.electronAPI.cancelExport();
      progressModal.classList.add('hidden');
    });

    btnCloseModal.addEventListener('click', () => {
      progressModal.classList.add('hidden');
    });

    btnOpenExported.addEventListener('click', () => {
      if (state.exportedFilePath) {
        window.electronAPI.openPath(state.exportedFilePath);
      }
    });

    btnShowInFinder.addEventListener('click', () => {
      if (state.exportedFilePath) {
        window.electronAPI.showInFolder(state.exportedFilePath);
      }
    });
  }

  function formatTime(sec) {
    if (isNaN(sec) || sec < 0) sec = 0;
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
});
