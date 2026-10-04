const FFmpegService = require('../src/ffmpeg-service');
const assert = require('assert');
const path = require('path');
const fs = require('fs');

async function runTests() {
  console.log('--- Avvio Test FFmpegService ---');
  const service = new FFmpegService();

  console.log(`FFmpeg path: ${service.ffmpegPath}`);
  console.log(`FFprobe path: ${service.ffprobePath}`);

  // Test 1: Probe su file di test esistente
  console.log('\n[Test 1] Probe di un file video generato...');
  const probeResult = await service.probeFile('/tmp/test_combined.mp4');
  console.log('Metadati estratti:', {
    fileName: probeResult.fileName,
    duration: probeResult.duration,
    hasVideo: probeResult.hasVideo,
    videoCodec: probeResult.video?.codec,
    width: probeResult.video?.width,
    height: probeResult.video?.height,
    hasAudio: probeResult.hasAudio,
    audioCodec: probeResult.audio?.codec
  });

  assert(probeResult.hasVideo === true, 'Deve rilevare la traccia video');
  assert(probeResult.hasAudio === true, 'Deve rilevare la traccia audio');
  assert(probeResult.duration > 6.5, 'La durata deve essere circa 7 secondi');

  // Test 2: Costruzione argomenti quando l'audio è più lungo del video (freeze frame)
  console.log('\n[Test 2] Calcolo argomenti per audio più lungo con freeze frame...');
  const argsFreeze = service.buildArguments({
    videoPath: '/tmp/test_v.mp4',
    audioPath: '/tmp/test_a.mp3',
    outputPath: '/tmp/out_freeze.mp4',
    videoDuration: 5.0,
    audioDuration: 12.0,
    audioOffset: 0,
    extendMode: 'freeze',
    videoCodec: 'h264_videotoolbox',
    audioCodec: 'aac'
  });

  const filterFreeze = argsFreeze.args.find(a => a.includes('tpad'));
  console.log('Filtro tpad generato:', filterFreeze);
  assert(filterFreeze.includes('tpad=stop_mode=clone:stop_duration=7.000'), 'Deve allungare il video di 7 secondi con clone');
  assert.strictEqual(argsFreeze.targetDuration, 12.0, 'La durata finale deve essere 12 secondi');

  // Test 3: Costruzione argomenti con Loop mode
  console.log('\n[Test 3] Calcolo argomenti per audio più lungo con Loop mode...');
  const argsLoop = service.buildArguments({
    videoPath: '/tmp/test_v.mp4',
    audioPath: '/tmp/test_a.mp3',
    outputPath: '/tmp/out_loop.mp4',
    videoDuration: 5.0,
    audioDuration: 12.0,
    audioOffset: 0,
    extendMode: 'loop',
    videoCodec: 'h264_videotoolbox',
    audioCodec: 'aac'
  });

  assert(argsLoop.args.includes('-stream_loop'), 'Deve includere -stream_loop per la modalità loop');
  assert(argsLoop.args.includes('-t'), 'Deve impostare la durata finale con -t');
  assert.strictEqual(argsLoop.targetDuration, 12.0);

  // Test 4: Costruzione argomenti con Audio Offset positivo (adelay)
  console.log('\n[Test 4] Calcolo argomenti con audio offset positivo (+2.5s)...');
  const argsOffset = service.buildArguments({
    videoPath: '/tmp/test_v.mp4',
    audioPath: '/tmp/test_a.mp3',
    outputPath: '/tmp/out_offset.mp4',
    videoDuration: 10.0,
    audioDuration: 10.0,
    audioOffset: 2.5,
    extendMode: 'freeze'
  });

  const filterOffset = argsOffset.args.find(a => a.includes('adelay'));
  console.log('Filtro adelay generato:', filterOffset);
  assert(filterOffset.includes('adelay=delays=2500:all=1'), 'Deve ritardare l audio di 2500ms');
  assert.strictEqual(argsOffset.targetDuration, 12.5, 'La durata finale deve essere 12.5s (10s audio + 2.5s offset)');

  // Test 5: Esecuzione reale dell'esportazione con notifica progress
  console.log('\n[Test 5] Esecuzione reale dell esportazione...');
  // Generiamo due file sorgente veloci: video da 2s e audio da 5s
  const { execSync } = require('child_process');
  execSync('/opt/homebrew/bin/ffmpeg -y -f lavfi -i testsrc=duration=2:size=320x240:rate=30 -c:v libx264 /tmp/src_vid.mp4', { stdio: 'ignore' });
  execSync('/opt/homebrew/bin/ffmpeg -y -f lavfi -i sine=frequency=880:duration=5 -c:a aac /tmp/src_aud.aac', { stdio: 'ignore' });

  let progressReceived = false;
  const result = await service.export({
    videoPath: '/tmp/src_vid.mp4',
    audioPath: '/tmp/src_aud.aac',
    outputPath: '/tmp/export_result.mp4',
    videoDuration: 2.0,
    audioDuration: 5.0,
    audioOffset: 0,
    extendMode: 'freeze',
    videoCodec: 'h264_videotoolbox',
    audioCodec: 'aac',
    qualityPreset: 'balanced'
  }, (prog) => {
    progressReceived = true;
    process.stdout.write(`Progresso: ${prog.percent}% (time: ${prog.currentTime?.toFixed(1)}s / ${prog.totalTime}s)\r`);
  });

  console.log('\nEsportazione completata:', result);
  assert(progressReceived, 'Deve ricevere eventi di progresso');
  assert(fs.existsSync('/tmp/export_result.mp4'), 'Il file di output deve esistere');

  const finalProbe = await service.probeFile('/tmp/export_result.mp4');
  console.log(`Durata finale misurata: ${finalProbe.duration.toFixed(2)}s (attesi ~5.00s)`);
  assert(finalProbe.duration >= 4.9 && finalProbe.duration <= 5.1, 'La durata del video esportato deve combaciare con l audio allungato');

  console.log('\n TUTTI I TEST BACKEND SONO PASSATI CON SUCCESSO!');
}

runTests().catch(err => {
  console.error('\n❌ Test fallito:', err);
  process.exit(1);
});
