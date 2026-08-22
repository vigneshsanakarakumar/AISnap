/**
 * ARRecorder — Video Recording Engine with MediaRecorder & Canvas Streams
 */

export class ARRecorder {
  constructor() {
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.isRecording = false;
    this.startTime = null;
    this.timerInterval = null;
    this.onTimerUpdate = null;
  }

  static isSupported() {
    return (
      typeof window !== 'undefined' &&
      typeof window.MediaRecorder === 'function' &&
      typeof HTMLCanvasElement.prototype.captureStream === 'function'
    );
  }

  startRecording(canvasElement, onTimerUpdate = null) {
    if (!ARRecorder.isSupported()) {
      throw new Error('Video recording is not supported in this browser.');
    }

    if (this.isRecording) return;

    this.recordedChunks = [];
    this.onTimerUpdate = onTimerUpdate;

    const stream = canvasElement.captureStream(30);

    // Pick best supported MIME type
    let mimeType = 'video/webm;codecs=vp9';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm;codecs=vp8';
    }
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm';
    }
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/mp4';
    }

    const options = MediaRecorder.isTypeSupported(mimeType) ? { mimeType } : {};

    try {
      this.mediaRecorder = new MediaRecorder(stream, options);
    } catch (e) {
      this.mediaRecorder = new MediaRecorder(stream);
    }

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        this.recordedChunks.push(event.data);
      }
    };

    this.mediaRecorder.start(100);
    this.isRecording = true;
    this.startTime = Date.now();

    // Start timer interval
    this.timerInterval = setInterval(() => {
      if (this.startTime && typeof this.onTimerUpdate === 'function') {
        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        const mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
        const secs = String(elapsed % 60).padStart(2, '0');
        this.onTimerUpdate(`${mins}:${secs}`);
      }
    }, 1000);
  }

  async stopRecording() {
    if (!this.isRecording || !this.mediaRecorder) return null;

    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    return new Promise((resolve) => {
      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, { type: this.mediaRecorder.mimeType || 'video/webm' });
        const url = URL.createObjectURL(blob);
        this.isRecording = false;
        this.startTime = null;
        resolve({ blob, url });
      };

      this.mediaRecorder.stop();
    });
  }

  downloadVideo(url, filterName = 'SnapAI') {
    const a = document.createElement('a');
    a.href = url;
    a.download = `SnapAI_${filterName}_${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}
