class TimelineController {
  constructor(options = {}) {
    this.videoDuration = 0;
    this.audioDuration = 0;
    this.audioOffset = 0;
    this.zoom = 1.0;
    this.basePps = 45; // base pixels per second
    this.currentTime = 0;
    this.isPlaying = false;
    this.extendMode = 'freeze';

    this.onOffsetChange = options.onOffsetChange || (() => {});
    this.onSeek = options.onSeek || (() => {});
    this.onPlayStateChange = options.onPlayStateChange || (() => {});

    // DOM Elements
    this.viewport = document.getElementById('timelineViewport');
    this.ruler = document.getElementById('timelineRuler');
    this.videoLane = document.getElementById('videoTrackLane');
    this.audioLane = document.getElementById('audioTrackLane');
    this.videoClip = document.getElementById('videoClip');
    this.videoExtendedClip = document.getElementById('videoExtendedClip');
    this.audioClip = document.getElementById('audioClip');
    this.playhead = document.getElementById('timelinePlayhead');
    this.currentTimeDisplay = document.getElementById('currentTimeDisplay');
    this.totalTimeDisplay = document.getElementById('totalTimeDisplay');
    this.zoomLevelDisplay = document.getElementById('zoomLevel');

    this.videoClipTitle = document.getElementById('videoClipTitle');
    this.videoClipDuration = document.getElementById('videoClipDuration');
    this.videoExtendedTitle = document.getElementById('videoExtendedTitle');
    this.audioClipTitle = document.getElementById('audioClipTitle');
    this.audioClipDuration = document.getElementById('audioClipDuration');

    this.isDraggingAudio = false;
    this.dragStartX = 0;
    this.dragStartOffset = 0;

    this.initEvents();
  }

  get pps() {
    return this.basePps * this.zoom;
  }

  get totalDuration() {
    const audioEnd = Math.max(0, this.audioOffset) + this.audioDuration;
    return Math.max(this.videoDuration, audioEnd, 1.0);
  }

  initEvents() {
    // Zoom buttons
    document.getElementById('btnZoomIn')?.addEventListener('click', () => this.setZoom(this.zoom * 1.25));
    document.getElementById('btnZoomOut')?.addEventListener('click', () => this.setZoom(this.zoom / 1.25));

    // Audio clip drag handling
    this.audioClip.addEventListener('mousedown', (e) => {
      if (this.audioDuration <= 0) return;
      this.isDraggingAudio = true;
      this.dragStartX = e.clientX;
      this.dragStartOffset = this.audioOffset;
      document.body.style.cursor = 'grabbing';
      e.preventDefault();
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDraggingAudio) return;
      const dx = e.clientX - this.dragStartX;
      const dSeconds = dx / this.pps;
      let newOffset = Math.round((this.dragStartOffset + dSeconds) * 20) / 20; // step di 0.05s
      this.setOffset(newOffset);
    });

    window.addEventListener('mouseup', () => {
      if (this.isDraggingAudio) {
        this.isDraggingAudio = false;
        document.body.style.cursor = 'default';
      }
    });

    // Ruler click seeking
    this.ruler.addEventListener('click', (e) => {
      const rect = this.ruler.getBoundingClientRect();
      const clickX = e.clientX - rect.left + this.viewport.scrollLeft;
      const seekTime = Math.max(0, Math.min(this.totalDuration, clickX / this.pps));
      this.seekTo(seekTime);
    });
  }

  setZoom(newZoom) {
    this.zoom = Math.max(0.4, Math.min(3.5, newZoom));
    if (this.zoomLevelDisplay) {
      this.zoomLevelDisplay.textContent = `${Math.round(this.zoom * 100)}%`;
    }
    this.render();
  }

  setMedia({ videoDuration, videoName, audioDuration, audioName }) {
    if (videoDuration !== undefined) {
      this.videoDuration = videoDuration;
      if (this.videoClipTitle && videoName) this.videoClipTitle.textContent = videoName;
      if (this.videoClipDuration) this.videoClipDuration.textContent = this.formatTime(videoDuration);
    }
    if (audioDuration !== undefined) {
      this.audioDuration = audioDuration;
      if (this.audioClipTitle && audioName) this.audioClipTitle.textContent = audioName;
      if (this.audioClipDuration) this.audioClipDuration.textContent = this.formatTime(audioDuration);
    }
    this.render();
  }

  setOffset(newOffset) {
    this.audioOffset = Math.round(newOffset * 100) / 100;
    this.onOffsetChange(this.audioOffset);
    this.render();
  }

  setExtendMode(mode) {
    this.extendMode = mode;
    this.render();
  }

  render() {
    const totalDur = this.totalDuration;
    const totalPx = Math.max(600, totalDur * this.pps + 80);

    // Aggiorna larghezza minima del righello e delle piste
    this.ruler.style.width = `${totalPx}px`;
    this.videoLane.style.width = `${totalPx}px`;
    this.audioLane.style.width = `${totalPx}px`;

    // Renderizza i tick del righello
    this.renderRuler(totalDur, totalPx);

    // Posizionamento e larghezza clip video
    if (this.videoDuration > 0) {
      const videoPx = this.videoDuration * this.pps;
      this.videoClip.style.width = `${videoPx}px`;
      this.videoClip.style.display = 'flex';

      // Calcola se l'audio supera il video
      const effectiveAudioEnd = Math.max(0, this.audioOffset) + this.audioDuration;
      const extendedDur = effectiveAudioEnd - this.videoDuration;

      if (extendedDur > 0.05 && this.audioDuration > 0) {
        this.videoExtendedClip.classList.remove('hidden');
        this.videoExtendedClip.style.left = `${videoPx}px`;
        this.videoExtendedClip.style.width = `${extendedDur * this.pps}px`;

        if (this.extendMode === 'freeze') {
          this.videoExtendedTitle.textContent = `🖼️ Congela (+${extendedDur.toFixed(1)}s)`;
        } else if (this.extendMode === 'loop') {
          this.videoExtendedTitle.textContent = `🔁 Loop (+${extendedDur.toFixed(1)}s)`;
        } else {
          this.videoExtendedTitle.textContent = `⏳ Rallenta (+${extendedDur.toFixed(1)}s)`;
        }
      } else {
        this.videoExtendedClip.classList.add('hidden');
      }
    } else {
      this.videoClip.style.width = '120px';
      this.videoExtendedClip.classList.add('hidden');
    }

    // Posizionamento clip audio
    if (this.audioDuration > 0) {
      const audioPx = this.audioDuration * this.pps;
      const audioLeftPx = this.audioOffset * this.pps;
      this.audioClip.style.width = `${audioPx}px`;
      this.audioClip.style.transform = `translateX(${audioLeftPx}px)`;
      this.audioClip.style.display = 'flex';
    } else {
      this.audioClip.style.width = '120px';
      this.audioClip.style.transform = 'none';
    }

    if (this.totalTimeDisplay) {
      this.totalTimeDisplay.textContent = this.formatTime(totalDur);
    }

    this.updatePlayheadPosition();
  }

  renderRuler(totalDur, totalPx) {
    this.ruler.innerHTML = '';
    // Determina l'intervallo tra i tick in base allo zoom
    let interval = 5; // secondi
    if (this.pps > 70) interval = 2;
    if (this.pps > 120) interval = 1;
    if (this.pps < 25) interval = 10;
    if (this.pps < 12) interval = 30;

    for (let t = 0; t <= totalDur + interval; t += interval) {
      const tick = document.createElement('div');
      tick.className = 'ruler-tick';
      tick.style.left = `${t * this.pps}px`;
      tick.textContent = this.formatTime(t);
      this.ruler.appendChild(tick);
    }
  }

  seekTo(seconds) {
    this.currentTime = Math.max(0, Math.min(this.totalDuration, seconds));
    this.updatePlayheadPosition();
    this.onSeek(this.currentTime);
  }

  setCurrentTime(seconds) {
    this.currentTime = seconds;
    this.updatePlayheadPosition();
  }

  updatePlayheadPosition() {
    const playheadX = 90 + (this.currentTime * this.pps);
    if (this.playhead) {
      this.playhead.style.transform = `translateX(${this.currentTime * this.pps}px)`;
    }
    if (this.currentTimeDisplay) {
      this.currentTimeDisplay.textContent = this.formatTimePrecise(this.currentTime);
    }
  }

  formatTime(sec) {
    if (isNaN(sec) || sec < 0) sec = 0;
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  formatTimePrecise(sec) {
    if (isNaN(sec) || sec < 0) sec = 0;
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 100);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  }
}

window.TimelineController = TimelineController;
