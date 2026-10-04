# Task Tracker: Video & Audio Joiner / Compressor per macOS

| ID | Task | Status | Note |
|---|---|---|---|
| 1 | Analisi requisiti e setup architettura macOS | COMPLETED | Setup Electron v41 + FFmpeg 8.1.1 verificati |
| 2 | Sviluppo Backend (FFmpeg engine, estensione video, encoding) | COMPLETED | Test unitari superati: freeze, loop, offset, videotoolbox |
| 3 | Sviluppo Frontend UI (Timeline alignment, drag&drop, codec selector) | COMPLETED | UI macOS Dark, timeline interattiva, sync preview, preset |
| 4 | Integrazione e test con file multimediali reali | COMPLETED | Test end-to-end con 5 scenari reali passati al 100% |
| 5 | Verifica e collaudo finale | COMPLETED | Smoke test Electron CSP e pipeline verificati senza errori |
| 6 | Fix compatibilità macOS QuickTime (FourCC tag hvc1 per HEVC) | COMPLETED | Risolto: aggiunto -tag:v hvc1 e scaling pari per apertura nativa QuickTime |
| 7 | Fix audio assente su macOS (forzatura AAC su MP4 + aformat stereo) | COMPLETED | Risolto: CoreAudio non supporta MP3 in MP4; forzato AAC con aformat stereo 48kHz |
