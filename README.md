# MediaJoiner Pro (macOS)
### Video & Audio Joiner, Timeline Alignment & Hardware-Accelerated Compressor

Un'applicazione desktop nativa per macOS che permette di caricare un file video e una traccia audio, allinearli con una timeline interattiva, accoppiarli ed esportarli con compressione personalizzata e codec hardware Apple VideoToolbox.

Se la traccia audio è più lunga del video (o anticipata/ritardata tramite offset), il video viene automaticamente allungato secondo la modalità preferita.

---

## 🚀 Caratteristiche Principali

- **Drag & Drop Diretto dal Finder**:
  - Trascina il file video (`.mp4`, `.mov`, `.mkv`, `.webm`, `.avi`) e la traccia audio (`.mp3`, `.wav`, `.aac`, `.m4a`, `.flac`, `.aiff`).
  - Anteprima immediata di durata, risoluzione, framerate, canali audio e bitrate.

- **⏱️ Timeline di Allineamento Interattiva**:
  - Traccia Video e Traccia Audio con righello millimetrico in tempo reale.
  - **Trascina la clip audio** direttamente col mouse a destra o a sinistra per impostare l'offset desiderato.
  - Pulsanti rapidi di regolazione fine (`-1s`, `-0.1s`, `+0.1s`, `+1s`) e pulsanti di allineamento a `0.0s` o a fine video.
  - **Riproduzione Sincronizzata (Play/Pausa / Spazio)** con playhead mobile e cursore continuo.

- **⚡ Allungamento Automatico del Video (se l'audio è più lungo)**:
  - Rilevamento automatico della discrepanza di durata (anche tenendo conto dell'offset audio).
  - 3 modalità di estensione del video:
    1. **🖼️ Congela Ultimo Fotogramma (Freeze Frame)** *(Predefinito)*: mantiene l'ultimo frame statico mentre l'audio continua fino al termine.
    2. **🔁 Ripeti in Loop (Loop Video)**: ripete il video a ciclo continuo dall'inizio fino alla fine della musica/voce.
    3. **⏳ Rallenta Video (Time Stretch)**: adatta e rallenta la velocità visiva per coprire esattamente la lunghezza dell'audio.

- **⚙️ Codec e Compressione ad Alte Prestazioni**:
  - **Apple VideoToolbox (Hardware)**: accelerazione GPU nativa per processori Apple Silicon (M1/M2/M3/M4) e Intel Mac (`h264_videotoolbox`, `hevc_videotoolbox`) per esportazioni istantanee con tag `hvc1` nativo.
  - Codec software supportati: H.264 (`libx264`), HEVC (`libx265`), AV1 (`libsvtav1`), Apple ProRes 422 (`prores_ks`), Copia Stream.
  - Codec audio: AAC (standard nativo Apple/QuickTime), MP3 (LAME), Opus, FLAC Lossless, PCM WAV. Per i container `.mp4` e `.mov`, l'audio viene codificato in AAC stereo a 48kHz per garantire riproduzione perfetta e senza muto su QuickTime, iOS e Finder.
  - Slider qualità / compressione CRF (da 16 a 32).
  - Ridimensionamento risoluzione (Originale, 4K UHD, 2K, 1080p, 720p).
  - Opzione per silenziare/sostituire l'audio del video oppure mixarlo con la nuova traccia.

- **📊 Monitor di Esportazione**:
  - Avanzamento percentuale in tempo reale, velocità di encoding (es. 8.5x), framerate e tempo rimanente.
  - Pulsanti "Mostra nel Finder" e "Riproduci Video" al completamento.

---

## 🍏 Installazione Standalone per macOS (Senza Riga di Comando)

Non è necessario aprire il terminale: puoi utilizzare l'applicazione nativa come qualsiasi app macOS.

1. **Scarica l'applicazione**:
   - Scarica il file **`MediaJoiner-Pro-1.1.0-arm64.dmg`** o **`MediaJoiner-Pro-1.1.0-mac-arm64.zip`** dalla sezione [GitHub Releases](https://github.com/muccio/video-audio-joiner-splitter/releases).
2. **Installazione**:
   - Apri il file `.dmg` e trascina **MediaJoiner Pro.app** nella cartella **Applicazioni** (o scompatta lo zip e fai doppio clic sull'app).
3. **Avvio Diretto**:
   - Fai doppio clic sull'icona di **MediaJoiner Pro** nel Launchpad o nel Finder per avviarla subito!

---

## 💻 Modalità Sviluppatore / Da Riga di Comando

Se desideri eseguire l'app dai sorgenti:

```bash
# Avvio in modalità sviluppo
npm start

# Compilazione dell'applicazione standalone .app
npm run build:app

# Creazione pacchetto DMG e ZIP per la distribuzione
npm run dist:mac
```

---

## 🧪 Esecuzione dei Test

Per eseguire i test unitari e di integrazione multimediale con simulazione QuickTime Player:

```bash
npm test
```
