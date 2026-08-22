/**
 * CameraManager — Modular, robust hardware camera management
 */

export class CameraManager {
  constructor() {
    this.currentStream = null;
    this.videoElement = null;
    this.facingMode = 'user'; // 'user' | 'environment'
    this.selectedDeviceId = null;
    this.isInitializing = false;
    this.onStatusChange = null; // Callback (status, error)
  }

  setVideoElement(videoEl) {
    this.videoElement = videoEl;
  }

  setStatusCallback(cb) {
    this.onStatusChange = cb;
  }

  notify(status, error = null) {
    if (typeof this.onStatusChange === 'function') {
      this.onStatusChange({ status, error, facingMode: this.facingMode });
    }
  }

  async getAvailableCameras() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      return [];
    }
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter((d) => d.kind === 'videoinput');
    } catch (e) {
      console.warn('enumerateDevices error:', e);
      return [];
    }
  }

  async startCamera(constraints = {}) {
    if (this.isInitializing) return this.currentStream;
    this.isInitializing = true;
    this.notify('initializing');

    // Clean up any existing stream before starting a new one
    this.stopCamera();

    // Check secure context
    if (window.isSecureContext === false && window.location.hostname !== 'localhost') {
      const err = new Error('Camera requires a secure HTTPS context or localhost.');
      this.notify('error', err.message);
      this.isInitializing = false;
      throw err;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const err = new Error('Camera API (getUserMedia) is not supported in this browser.');
      this.notify('error', err.message);
      this.isInitializing = false;
      throw err;
    }

    const videoConstraints = {
      width: { ideal: 1280, max: 1920 },
      height: { ideal: 720, max: 1080 },
      frameRate: { ideal: 60, max: 120 }
    };

    if (this.selectedDeviceId) {
      videoConstraints.deviceId = { exact: this.selectedDeviceId };
    } else {
      videoConstraints.facingMode = { ideal: this.facingMode };
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { ...videoConstraints, ...constraints },
        audio: false
      });

      this.currentStream = stream;

      if (this.videoElement) {
        this.videoElement.srcObject = stream;
        this.videoElement.setAttribute('playsinline', 'true');
        this.videoElement.setAttribute('autoplay', 'true');
        this.videoElement.muted = true;
        
        await new Promise((resolve) => {
          this.videoElement.onloadedmetadata = () => {
            this.videoElement.play().catch(console.warn);
            resolve();
          };
          // Fallback if metadata is already loaded
          if (this.videoElement.readyState >= 2) {
            resolve();
          }
        });
      }

      this.isInitializing = false;
      this.notify('active');
      return stream;
    } catch (err) {
      this.isInitializing = false;
      let userFriendlyMessage = 'Failed to access camera: ' + err.message;

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        userFriendlyMessage = 'Camera permission denied. Please allow camera access in browser settings.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        userFriendlyMessage = 'No camera found on this device.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        userFriendlyMessage = 'Camera is already in use by another application or tab.';
      } else if (err.name === 'OverconstrainedError') {
        userFriendlyMessage = 'Requested camera resolution is not supported by hardware.';
      }

      this.notify('error', userFriendlyMessage);
      throw new Error(userFriendlyMessage);
    }
  }

  async switchCamera() {
    this.facingMode = this.facingMode === 'user' ? 'environment' : 'user';
    this.selectedDeviceId = null; // Reset specific device ID to use facingMode
    return this.startCamera();
  }

  async selectCamera(deviceId) {
    this.selectedDeviceId = deviceId;
    return this.startCamera();
  }

  stopCamera() {
    if (this.currentStream) {
      this.currentStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {
          console.warn('Track stop error:', e);
        }
      });
      this.currentStream = null;
    }

    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }

    this.notify('stopped');
  }

  isActive() {
    return Boolean(
      this.currentStream &&
      this.currentStream.active &&
      this.currentStream.getVideoTracks().some((t) => t.readyState === 'live')
    );
  }
}
