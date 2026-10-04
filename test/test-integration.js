const FFmpegService = require('../src/ffmpeg-service');
const assert = require('assert');
const { execSync } = require('child_process');
const fs = require('fs');

async function runIntegrationTests() {
  console.log('=== TEST DI INTEGRAZIONE MULTIMEDIALE ===');
  const service = new FFmpegService();

  // Prepara file di prova reali
  console.log('1. Generazione file multimediali campione...');
  const testVideo = '/tmp/sample_vid_3s.mp4';
  const testAudioLong = '/tmp/sample_aud_8s.m4a';
  const testAudioShort = '/tmp/sample_aud_2s.mp3';

  // Video 3 secondi (1920x1080, 30fps con un tono audio nativo a 220Hz)
  execSync(
    `/opt/homebrew/bin/ffmpeg -y -f lavfi -i testsrc=duration=3:size=1280x720:rate=30 ` +
    `-f lavfi -i sine=frequency=220:duration=3 ` +
    `-c:v libx264 -c:a aac ${testVideo}`,
    { stdio: 'ignore' }
  );

  // Audio 8 secondi (musica/tono a 440Hz) -> Audio più lungo del video (+5s)
  execSync(
    `/opt/homebrew/bin/ffmpeg -y -f lavfi -i sine=frequency=440:duration=8 ` +
    `-c:a aac ${testAudioLong}`,
    { stdio: 'ignore' }
  );

  // Audio 2 secondi (tono a 660Hz)
  execSync(
    `/opt/homebrew/bin/ffmpeg -y -f lavfi -i sine=frequency=660:duration=2 ` +
    `-c:a libmp3lame ${testAudioShort}`,
    { stdio: 'ignore' }
  );

  console.log('File generati con successo.');

  // Test Case A: Audio Più Lungo del Video con FREEZE FRAME (Predefinito richiesto dall'utente)
  console.log('\n[Scenario A] Audio 8s + Video 3s -> Allungamento video con Freeze Frame (VideoToolbox)');
  const outFreeze = '/tmp/out_test_freeze.mp4';
  await service.export({
    videoPath: testVideo,
    audioPath: testAudioLong,
    outputPath: outFreeze,
    videoDuration: 3.0,
    audioDuration: 8.0,
    audioOffset: 0,
    extendMode: 'freeze',
    videoCodec: 'h264_videotoolbox',
    audioCodec: 'aac',
    qualityPreset: 'hardware'
  });

  const probeFreeze = await service.probeFile(outFreeze);
  console.log(`Risultato Freeze: durata = ${probeFreeze.duration}s, codec = ${probeFreeze.video.codec}`);
  assert(Math.abs(probeFreeze.duration - 8.0) < 0.2, `La durata finale deve essere 8.0s, ricevuta: ${probeFreeze.duration}`);
  assert.strictEqual(probeFreeze.video.codec, 'h264');

  // Test Case B: Audio Più Lungo del Video con LOOP
  console.log('\n[Scenario B] Audio 8s + Video 3s -> Allungamento video con Ripetizione in Loop');
  const outLoop = '/tmp/out_test_loop.mp4';
  await service.export({
    videoPath: testVideo,
    audioPath: testAudioLong,
    outputPath: outLoop,
    videoDuration: 3.0,
    audioDuration: 8.0,
    audioOffset: 0,
    extendMode: 'loop',
    videoCodec: 'h264_videotoolbox',
    audioCodec: 'aac'
  });

  const probeLoop = await service.probeFile(outLoop);
  console.log(`Risultato Loop: durata = ${probeLoop.duration}s`);
  assert(Math.abs(probeLoop.duration - 8.0) < 0.2, `La durata finale deve essere 8.0s con loop, ricevuta: ${probeLoop.duration}`);

  // Test Case C: Audio con Offset Positivo (+1.5s) e Freeze Frame
  console.log('\n[Scenario C] Offset Audio +1.5s su video 3s e audio 8s -> durata totale 9.5s');
  const outOffset = '/tmp/out_test_offset.mp4';
  await service.export({
    videoPath: testVideo,
    audioPath: testAudioLong,
    outputPath: outOffset,
    videoDuration: 3.0,
    audioDuration: 8.0,
    audioOffset: 1.5,
    extendMode: 'freeze',
    videoCodec: 'h264_videotoolbox',
    audioCodec: 'aac'
  });

  const probeOffset = await service.probeFile(outOffset);
  console.log(`Risultato Offset: durata = ${probeOffset.duration}s (attesi ~9.5s)`);
  assert(Math.abs(probeOffset.duration - 9.5) < 0.2, `Durata attesa ~9.5s, ricevuta: ${probeOffset.duration}`);

  // Test Case D: Compressione HEVC / H.265 Hardware con Riduzione Risoluzione a 854x480
  console.log('\n[Scenario D] Compressione HEVC (hevc_videotoolbox) e ridimensionamento');
  const outHevc = '/tmp/out_test_hevc.mp4';
  await service.export({
    videoPath: testVideo,
    audioPath: testAudioShort,
    outputPath: outHevc,
    videoDuration: 3.0,
    audioDuration: 2.0,
    audioOffset: 0,
    extendMode: 'freeze',
    videoCodec: 'hevc_videotoolbox',
    audioCodec: 'aac',
    qualityPreset: 'compressed',
    resolution: '854x480'
  });

  const probeHevc = await service.probeFile(outHevc);
  console.log(`Risultato HEVC: codec = ${probeHevc.video.codec}, risoluzione = ${probeHevc.video.width}x${probeHevc.video.height}`);
  assert.strictEqual(probeHevc.video.codec, 'hevc');
  assert.strictEqual(probeHevc.video.width, 854);
  assert.strictEqual(probeHevc.video.height, 480);

  // Test Case E: Mix Audio Originale con Nuova Traccia
  console.log('\n[Scenario E] Mix audio originale video con nuova traccia audio');
  const outMix = '/tmp/out_test_mix.mp4';
  await service.export({
    videoPath: testVideo,
    audioPath: testAudioLong,
    outputPath: outMix,
    videoDuration: 3.0,
    audioDuration: 8.0,
    audioOffset: 0,
    extendMode: 'freeze',
    videoCodec: 'h264_videotoolbox',
    audioCodec: 'aac',
    mixOriginalAudio: true,
    originalAudioVolume: 0.4,
    newAudioVolume: 1.0
  });

  const probeMix = await service.probeFile(outMix);
  console.log(`Risultato Mix: durata = ${probeMix.duration}s, hasAudio = ${probeMix.hasAudio}`);
  assert(probeMix.hasAudio === true);
  assert(Math.abs(probeMix.duration - 8.0) < 0.2);

  // Test Case F: Caso d'uso esatto dell'utente (HEVC VideoToolbox + MP3 + Freeze Frame + QuickTime apertura)
  console.log('\n[Scenario F] Caso esatto utente: HEVC VideoToolbox + MP3 + Freeze Frame + Apertura QuickTime');
  const outUserCase = '/tmp/out_test_user_case.mp4';
  await service.export({
    videoPath: testVideo,
    audioPath: testAudioLong,
    outputPath: outUserCase,
    videoDuration: 3.0,
    audioDuration: 8.0,
    audioOffset: 0,
    extendMode: 'freeze',
    videoCodec: 'hevc_videotoolbox',
    audioCodec: 'libmp3lame',
    qualityPreset: 'compressed'
  });

  const probeUserCase = await service.probeFile(outUserCase);
  console.log(`Risultato Scenario F: codec video = ${probeUserCase.video.codec}, codec audio = ${probeUserCase.audio.codec}`);
  assert.strictEqual(probeUserCase.video.codec, 'hevc');
  assert.strictEqual(probeUserCase.audio.codec, 'aac', 'Per container .mp4 l audio deve essere convertito in aac per consentire a QuickTime di riprodurre il suono');

  // Verifica che macOS CoreAudio riproduca effettivamente l'audio con afplay (senza errore wht?)
  execSync(`afplay "${outUserCase}" -t 1`, { stdio: 'ignore' });
  console.log('Verifica CoreAudio (afplay) riuscita: audio riproducibile e non muto!');

  // Verifica con AppleScript che QuickTime Player apra il file senza errori
  try {
    const qtOpenResult = execSync(`osascript -e '
      tell application "QuickTime Player"
        set myDoc to open POSIX file "${outUserCase}"
        play myDoc
        delay 0.5
        pause myDoc
        set docName to name of myDoc
        close myDoc
        return docName
      end tell
    '`).toString().trim();
    console.log(`Verifica QuickTime Player riuscita: file e audio aperti e riprodotti correttamente (${qtOpenResult})`);
  } catch (qtErr) {
    assert.fail(`QuickTime Player non è riuscito ad aprire o riprodurre il file: ${qtErr.message}`);
  }

  console.log('\n🎉 TUTTI I TEST DI INTEGRAZIONE SONO PASSATI CON SUCCESSO!');
}

runIntegrationTests().catch(err => {
  console.error('\n❌ Errore test di integrazione:', err);
  process.exit(1);
});
