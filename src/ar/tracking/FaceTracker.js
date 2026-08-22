/**
 * FaceTracker — Real-Time Face Landmark Tracking with MediaPipe Tasks Vision
 */

import { FilesetResolver, FaceLandmarker } from '@mediapipe/tasks-vision';
import { LandmarkSmoother, extractFaceGeometry } from '../utils/math.js';

export class FaceTracker {
  constructor() {
    this.faceLandmarker = null;
    this.isInitializing = false;
    this.isReady = false;
    this.smoother = new LandmarkSmoother(0.65);
    this.lastVideoTime = -1;
    this.lastResult = null;
    this.onStatusChange = null;
  }

  setStatusCallback(cb) {
    this.onStatusChange = cb;
  }

  notify(status, error = null) {
    if (typeof this.onStatusChange === 'function') {
      this.onStatusChange({ status, error, isReady: this.isReady });
    }
  }

  async initialize() {
    if (this.isReady) return true;
    if (this.isInitializing) return false;

    this.isInitializing = true;
    this.notify('loading');

    try {
      // Load wasm binary from Google MediaPipe CDN
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );

      this.faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
          delegate: 'GPU'
        },
        outputFaceBlendshapes: false,
        runningMode: 'VIDEO',
        numFaces: 1
      });

      this.isReady = true;
      this.isInitializing = false;
      this.notify('ready');
      return true;
    } catch (err) {
      console.warn('FaceLandmarker GPU init failed, attempting CPU fallback:', err);
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );

        this.faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'CPU'
          },
          outputFaceBlendshapes: false,
          runningMode: 'VIDEO',
          numFaces: 1
        });

        this.isReady = true;
        this.isInitializing = false;
        this.notify('ready');
        return true;
      } catch (fallbackErr) {
        console.error('FaceLandmarker CPU fallback error:', fallbackErr);
        this.isInitializing = false;
        this.isReady = false;
        this.notify('error', fallbackErr.message);
        return false;
      }
    }
  }

  detectFace(videoElement, canvasWidth, canvasHeight, timestamp = performance.now()) {
    if (!this.isReady || !this.faceLandmarker || !videoElement || videoElement.readyState < 2) {
      return null;
    }

    try {
      if (videoElement.currentTime !== this.lastVideoTime) {
        this.lastVideoTime = videoElement.currentTime;
        const results = this.faceLandmarker.detectForVideo(videoElement, timestamp);
        this.lastResult = results;
      }

      if (this.lastResult && this.lastResult.faceLandmarks && this.lastResult.faceLandmarks.length > 0) {
        const rawLandmarks = this.lastResult.faceLandmarks[0];
        const smoothedLandmarks = this.smoother.smooth(rawLandmarks);
        return extractFaceGeometry(smoothedLandmarks, canvasWidth, canvasHeight);
      } else {
        this.smoother.reset();
        return null;
      }
    } catch (err) {
      console.warn('Face detection loop warning:', err);
      return null;
    }
  }

  dispose() {
    if (this.faceLandmarker) {
      try {
        this.faceLandmarker.close();
      } catch (e) {
        console.warn('FaceLandmarker close error:', e);
      }
      this.faceLandmarker = null;
    }
    this.smoother.reset();
    this.isReady = false;
    this.isInitializing = false;
    this.notify('disposed');
  }
}
