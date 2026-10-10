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
| 8 | Creazione repository GitHub, push e pubblicazione release v1.0.0 | COMPLETED | Repo: muccio/video-audio-joiner-splitter, Release: v1.0.0 pubblicata |
| 9 | Creazione .app standalone, DMG/ZIP installer e pubblicazione Release v1.1.0 | COMPLETED | Generati MediaJoiner Pro.app, DMG e ZIP con release v1.1.0 su GitHub |
