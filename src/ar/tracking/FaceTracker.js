/**
 * FaceTracker — Multi-Modal Vision Engine (Face, Hand, Pose Tracking)
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

    this.lastFaceVideoTime = -1;
    this.lastHandVideoTime = -1;
    this.lastPoseVideoTime = -1;

    this.lastFaceResult = null;
    this.lastHandResult = null;
    this.lastPoseResult = null;

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

  // Lazy initialize Hand Landmarker when needed
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

  // Lazy initialize Pose Landmarker when needed
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

    try {
      if (videoElement.currentTime !== this.lastFaceVideoTime) {
        this.lastFaceVideoTime = videoElement.currentTime;
        const results = this.faceLandmarker.detectForVideo(videoElement, timestamp);
        this.lastFaceResult = results;
      }

      if (this.lastFaceResult && this.lastFaceResult.faceLandmarks && this.lastFaceResult.faceLandmarks.length > 0) {
        const rawLandmarks = this.lastFaceResult.faceLandmarks[0];
        const smoothedLandmarks = this.faceSmoother.smooth(rawLandmarks);
        return extractFaceGeometry(smoothedLandmarks, canvasWidth, canvasHeight);
      } else {
        this.faceSmoother.reset();
        return null;
      }
    } catch (err) {
      return null;
    }
  }

  detectHand(videoElement, canvasWidth, canvasHeight, timestamp = performance.now()) {
    if (!this.handLandmarker || !videoElement || videoElement.readyState < 2) {
      this.ensureHandLandmarker().catch(() => {});
      return null;
    }

    try {
      if (videoElement.currentTime !== this.lastHandVideoTime) {
        this.lastHandVideoTime = videoElement.currentTime;
        this.lastHandResult = this.handLandmarker.detectForVideo(videoElement, timestamp);
      }

      if (this.lastHandResult && this.lastHandResult.landmarks && this.lastHandResult.landmarks.length > 0) {
        const rawLandmarks = this.lastHandResult.landmarks[0];
        const smoothedLandmarks = this.handSmoother.smooth(rawLandmarks);
        return extractHandGeometry(smoothedLandmarks, canvasWidth, canvasHeight);
      } else {
        this.handSmoother.reset();
        return null;
      }
    } catch (err) {
      return null;
    }
  }

  detectPose(videoElement, canvasWidth, canvasHeight, timestamp = performance.now()) {
    if (!this.poseLandmarker || !videoElement || videoElement.readyState < 2) {
      this.ensurePoseLandmarker().catch(() => {});
      return null;
    }

    try {
      if (videoElement.currentTime !== this.lastPoseVideoTime) {
        this.lastPoseVideoTime = videoElement.currentTime;
        this.lastPoseResult = this.poseLandmarker.detectForVideo(videoElement, timestamp);
      }

      if (this.lastPoseResult && this.lastPoseResult.landmarks && this.lastPoseResult.landmarks.length > 0) {
        const rawLandmarks = this.lastPoseResult.landmarks[0];
        const smoothedLandmarks = this.poseSmoother.smooth(rawLandmarks);
        return extractPoseGeometry(smoothedLandmarks, canvasWidth, canvasHeight);
      } else {
        this.poseSmoother.reset();
        return null;
      }
    } catch (err) {
      return null;
    }
  }

  detectAll(videoElement, canvasWidth, canvasHeight, timestamp = performance.now(), activeBodyMode = 'face') {
    const faceGeometry = this.detectFace(videoElement, canvasWidth, canvasHeight, timestamp);
    let handGeometry = null;
    let poseGeometry = null;

    if (activeBodyMode === 'hand') {
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
    this.faceSmoother.reset();
    this.handSmoother.reset();
    this.poseSmoother.reset();
    this.isReady = false;
    this.isInitializing = false;
    this.notify('disposed');
  }
}
