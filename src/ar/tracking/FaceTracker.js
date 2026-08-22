/**
 * FaceTracker — Multi-Modal Vision Engine (Face, Hand, Pose Tracking)
 * Features Decoupled Detection Rates, Zero Inactive Inference, and Precision Performance Telemetry
 */

import { FilesetResolver, FaceLandmarker, HandLandmarker, PoseLandmarker } from '@mediapipe/tasks-vision';
import {
  LandmarkSmoother,
  extractFaceGeometry,
  extractHandGeometry,
  extractPoseGeometry
} from '../utils/math.js';

export class FaceTracker {
  constructor() {
    this.visionTasks = null;
    this.faceLandmarker = null;
    this.handLandmarker = null;
    this.poseLandmarker = null;

    this.isInitializing = false;
    this.isReady = false;

    this.faceSmoother = new LandmarkSmoother(0.5);
    this.handSmoother = new LandmarkSmoother(0.5);
    this.poseSmoother = new LandmarkSmoother(0.5);

    // Decoupled Detection Timing (Target ~30 FPS detection to prevent GPU thermal throttling)
    this.detectionInterval = 33; // 33ms ~ 30 detection FPS
    this.lastDetectionTimestamp = 0;
    this.lastVideoTime = -1;

    // Cached geometries between detection ticks
    this.cachedFaceGeometry = null;
    this.cachedHandGeometry = null;
    this.cachedPoseGeometry = null;

    // Performance Telemetry
    this.telemetry = {
      faceInferenceMs: 0,
      handInferenceMs: 0,
      poseInferenceMs: 0,
      detectionFps: 0,
      detectionFrames: 0,
      lastFpsUpdate: performance.now()
    };

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

  async getVisionTasks() {
    if (!this.visionTasks) {
      this.visionTasks = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );
    }
    return this.visionTasks;
  }

  async initialize() {
    if (this.isReady) return true;
    if (this.isInitializing) return false;

    this.isInitializing = true;
    this.notify('loading');

    try {
      const vision = await this.getVisionTasks();

      // Initialize primary Face Landmarker
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
      console.warn('FaceLandmarker GPU init fallback to CPU:', err);
      try {
        const vision = await this.getVisionTasks();
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

  async ensureHandLandmarker() {
    if (this.handLandmarker) return this.handLandmarker;
    try {
      const vision = await this.getVisionTasks();
      this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          delegate: 'GPU'
        },
        runningMode: 'VIDEO',
        numHands: 1
      });
      return this.handLandmarker;
    } catch (e) {
      console.warn('HandLandmarker fallback to CPU:', e);
      const vision = await this.getVisionTasks();
      this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          delegate: 'CPU'
        },
        runningMode: 'VIDEO',
        numHands: 1
      });
      return this.handLandmarker;
    }
  }

  async ensurePoseLandmarker() {
    if (this.poseLandmarker) return this.poseLandmarker;
    try {
      const vision = await this.getVisionTasks();
      this.poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
          delegate: 'GPU'
        },
        runningMode: 'VIDEO',
        numPoses: 1
      });
      return this.poseLandmarker;
    } catch (e) {
      console.warn('PoseLandmarker fallback to CPU:', e);
      const vision = await this.getVisionTasks();
      this.poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
          delegate: 'CPU'
        },
        runningMode: 'VIDEO',
        numPoses: 1
      });
      return this.poseLandmarker;
    }
  }

  detectFace(videoElement, canvasWidth, canvasHeight, timestamp = performance.now()) {
    if (!this.isReady || !this.faceLandmarker || !videoElement || videoElement.readyState < 2) {
      return null;
    }

    // Decoupled rate limiting: return cached geometry if within rate limit
    if (timestamp - this.lastDetectionTimestamp < this.detectionInterval && this.cachedFaceGeometry) {
      return this.cachedFaceGeometry;
    }

    try {
      const t0 = performance.now();
      const results = this.faceLandmarker.detectForVideo(videoElement, timestamp);
      const t1 = performance.now();
      this.telemetry.faceInferenceMs = t1 - t0;
      this.lastDetectionTimestamp = timestamp;
      this.recordDetectionFrame();

      if (results && results.faceLandmarks && results.faceLandmarks.length > 0) {
        const rawLandmarks = results.faceLandmarks[0];
        const smoothedLandmarks = this.faceSmoother.smooth(rawLandmarks);
        this.cachedFaceGeometry = extractFaceGeometry(smoothedLandmarks, canvasWidth, canvasHeight);
      } else {
        this.faceSmoother.reset();
        this.cachedFaceGeometry = null;
      }
      return this.cachedFaceGeometry;
    } catch (err) {
      return this.cachedFaceGeometry;
    }
  }

  detectHand(videoElement, canvasWidth, canvasHeight, timestamp = performance.now()) {
    if (!this.handLandmarker || !videoElement || videoElement.readyState < 2) {
      this.ensureHandLandmarker().catch(() => {});
      return this.cachedHandGeometry;
    }

    if (timestamp - this.lastDetectionTimestamp < this.detectionInterval && this.cachedHandGeometry) {
      return this.cachedHandGeometry;
    }

    try {
      const t0 = performance.now();
      const results = this.handLandmarker.detectForVideo(videoElement, timestamp);
      const t1 = performance.now();
      this.telemetry.handInferenceMs = t1 - t0;
      this.lastDetectionTimestamp = timestamp;
      this.recordDetectionFrame();

      if (results && results.landmarks && results.landmarks.length > 0) {
        const rawLandmarks = results.landmarks[0];
        const smoothedLandmarks = this.handSmoother.smooth(rawLandmarks);
        this.cachedHandGeometry = extractHandGeometry(smoothedLandmarks, canvasWidth, canvasHeight);
      } else {
        this.handSmoother.reset();
        this.cachedHandGeometry = null;
      }
      return this.cachedHandGeometry;
    } catch (err) {
      return this.cachedHandGeometry;
    }
  }

  detectPose(videoElement, canvasWidth, canvasHeight, timestamp = performance.now()) {
    if (!this.poseLandmarker || !videoElement || videoElement.readyState < 2) {
      this.ensurePoseLandmarker().catch(() => {});
      return this.cachedPoseGeometry;
    }

    if (timestamp - this.lastDetectionTimestamp < this.detectionInterval && this.cachedPoseGeometry) {
      return this.cachedPoseGeometry;
    }

    try {
      const t0 = performance.now();
      const results = this.poseLandmarker.detectForVideo(videoElement, timestamp);
      const t1 = performance.now();
      this.telemetry.poseInferenceMs = t1 - t0;
      this.lastDetectionTimestamp = timestamp;
      this.recordDetectionFrame();

      if (results && results.landmarks && results.landmarks.length > 0) {
        const rawLandmarks = results.landmarks[0];
        const smoothedLandmarks = this.poseSmoother.smooth(rawLandmarks);
        this.cachedPoseGeometry = extractPoseGeometry(smoothedLandmarks, canvasWidth, canvasHeight);
      } else {
        this.poseSmoother.reset();
        this.cachedPoseGeometry = null;
      }
      return this.cachedPoseGeometry;
    } catch (err) {
      return this.cachedPoseGeometry;
    }
  }

  // Multi-Modal Dispatch: RUN ONLY THE ACTIVE TRACKER (Zero inactive inference!)
  detectAll(videoElement, canvasWidth, canvasHeight, timestamp = performance.now(), activeBodyMode = 'face') {
    let faceGeometry = null;
    let handGeometry = null;
    let poseGeometry = null;

    if (activeBodyMode === 'face') {
      faceGeometry = this.detectFace(videoElement, canvasWidth, canvasHeight, timestamp);
    } else if (activeBodyMode === 'hand') {
      handGeometry = this.detectHand(videoElement, canvasWidth, canvasHeight, timestamp);
    } else if (activeBodyMode === 'torso' || activeBodyMode === 'leg') {
      poseGeometry = this.detectPose(videoElement, canvasWidth, canvasHeight, timestamp);
    }

    return {
      faceGeometry,
      handGeometry,
      poseGeometry
    };
  }

  recordDetectionFrame() {
    this.telemetry.detectionFrames++;
    const now = performance.now();
    if (now - this.telemetry.lastFpsUpdate >= 1000) {
      this.telemetry.detectionFps = this.telemetry.detectionFrames;
      this.telemetry.detectionFrames = 0;
      this.telemetry.lastFpsUpdate = now;
    }
  }

  resetState() {
    this.cachedFaceGeometry = null;
    this.cachedHandGeometry = null;
    this.cachedPoseGeometry = null;
    this.faceSmoother.reset();
    this.handSmoother.reset();
    this.poseSmoother.reset();
  }

  dispose() {
    if (this.faceLandmarker) {
      try { this.faceLandmarker.close(); } catch (e) {}
      this.faceLandmarker = null;
    }
    if (this.handLandmarker) {
      try { this.handLandmarker.close(); } catch (e) {}
      this.handLandmarker = null;
    }
    if (this.poseLandmarker) {
      try { this.poseLandmarker.close(); } catch (e) {}
      this.poseLandmarker = null;
    }
    this.resetState();
    this.isReady = false;
    this.isInitializing = false;
    this.notify('disposed');
  }
}
