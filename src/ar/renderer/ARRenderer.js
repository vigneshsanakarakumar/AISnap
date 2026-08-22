/**
 * ARRenderer — High-Performance 60FPS AR Compositing & Render Loop Engine
 */

export class ARRenderer {
  constructor(canvasElement, videoElement, faceTracker) {
    this.canvas = canvasElement;
    this.ctx = canvasElement ? canvasElement.getContext('2d', { willReadFrequently: false }) : null;
    this.video = videoElement;
    this.tracker = faceTracker;
    this.activeFilter = null;

    this.isRunning = false;
    this.animationFrameId = null;

    // Metrics
    this.fps = 0;
    this.frameCount = 0;
    this.lastFpsUpdateTime = performance.now();
    this.onFpsUpdate = null;
    this.onFrameRendered = null; // Callback for live broadcasting
  }

  setCanvas(canvasEl) {
    this.canvas = canvasEl;
    this.ctx = canvasEl ? canvasEl.getContext('2d', { willReadFrequently: false }) : null;
  }

  setVideo(videoEl) {
    this.video = videoEl;
  }

  setFilter(filter) {
    this.activeFilter = filter;
    if (this.tracker && typeof this.tracker.resetState === 'function') {
      this.tracker.resetState();
    }
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.frameCount = 0;
    this.lastFpsUpdateTime = performance.now();

    const loop = (timestamp) => {
      if (!this.isRunning) return;

      this.renderFrame(timestamp);
      this.animationFrameId = requestAnimationFrame(loop);
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  renderFrame(timestamp) {
    if (!this.canvas || !this.ctx || !this.video || this.video.readyState < 2) {
      return;
    }

    let videoWidth = this.video.videoWidth || 640;
    let videoHeight = this.video.videoHeight || 480;

    // High Clarity HD Resolution processing (Cap at 720p for crystal-clear visuals & high 60 FPS)
    const MAX_HEIGHT = 720;
    if (videoHeight > MAX_HEIGHT) {
      const ratio = MAX_HEIGHT / videoHeight;
      videoHeight = MAX_HEIGHT;
      videoWidth = Math.floor(videoWidth * ratio);
    }

    // Sync canvas buffer resolution with native video resolution
    if (this.canvas.width !== videoWidth || this.canvas.height !== videoHeight) {
      this.canvas.width = videoWidth;
      this.canvas.height = videoHeight;
    }

    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';

    // 1. Detect Landmarks (Multi-Modal on Demand)
    let trackingResult = null;
    if (this.tracker && this.tracker.isReady) {
      if (this.activeFilter && (this.activeFilter.id === 'ar_piercing' || this.activeFilter.targetBodyPart)) {
        const bodyPart = this.activeFilter.targetBodyPart || 'face';
        trackingResult = this.tracker.detectAll(this.video, videoWidth, videoHeight, timestamp, bodyPart);
      } else {
        trackingResult = this.tracker.detectFace(this.video, videoWidth, videoHeight, timestamp);
      }
    }

    // 2. Render Active AR Filter
    if (this.activeFilter && typeof this.activeFilter.render === 'function') {
      try {
        if (typeof this.activeFilter.update === 'function') {
          this.activeFilter.update(null, trackingResult, timestamp);
        }
        this.activeFilter.render(this.ctx, this.canvas, this.video, trackingResult, timestamp);
      } catch (err) {
        console.warn('Filter render error:', err);
        this.ctx.drawImage(this.video, 0, 0, videoWidth, videoHeight);
      }
    } else {
      this.ctx.drawImage(this.video, 0, 0, videoWidth, videoHeight);
    }

    // 3. FPS Monitoring
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFpsUpdateTime >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastFpsUpdateTime = now;

      if (typeof this.onFpsUpdate === 'function') {
        const hasTrack = trackingResult && (trackingResult.faceGeometry || trackingResult.leftCenter || trackingResult.stomachCenter || trackingResult.wrist);
        this.onFpsUpdate(this.fps, !!hasTrack);
      }
    }

    // 4. Notify frame hook (for snapshot or broadcast)
    if (typeof this.onFrameRendered === 'function') {
      this.onFrameRendered(this.canvas, this.activeFilter, timestamp);
    }
  }

  stop() {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.fps = 0;
  }

  captureSnapshot() {
    if (!this.canvas) return null;
    return this.canvas.toDataURL('image/jpeg', 0.92);
  }

  getCanvasStream(fps = 60) {
    if (!this.canvas || !this.canvas.captureStream) return null;
    return this.canvas.captureStream(fps);
  }
}
