/**
 * TattooAnchors — Landmark-based target position, scale, rotation & surface orientation
 * Supports Face (468-point), Hand (21-point), and Pose (33-point) geometry
 */

export class TattooAnchors {
  constructor() {
    this.smoothedPose = {
      x: 0,
      y: 0,
      scale: 1,
      rotation: 0,
      yaw: 0,
      pitch: 0,
      roll: 0,
      confidence: 0
    };
    this.lastValidTime = 0;
    this.hasValidTrack = false;
  }

  computePose(placement, trackingResult, width, height, manualOffsets = {}) {
    const {
      manualOffsetX = 0,
      manualOffsetY = 0,
      manualScale = 1.0,
      manualRotation = 0
    } = manualOffsets;

    const faceGeometry = trackingResult?.faceGeometry || (trackingResult?.leftCenter ? trackingResult : null);
    const handGeometry = trackingResult?.handGeometry;
    const poseGeometry = trackingResult?.poseGeometry;

    let targetX = width * 0.5;
    let targetY = height * 0.5;
    let targetScale = 1.0;
    let targetRotation = 0;
    let targetYaw = 0;
    let targetPitch = 0;
    let targetRoll = 0;
    let isTracked = false;

    // 1. CHEEK / FACE PLACEMENT (Using 468-point Face Landmarker)
    if (placement === 'cheek' && faceGeometry) {
      const { rightCheekCenter, rightCheek, faceWidth, roll, yaw, pitch } = faceGeometry;
      
      targetX = (rightCheekCenter.x + rightCheek.x) * 0.5 + manualOffsetX;
      targetY = rightCheekCenter.y + manualOffsetY;
      targetScale = (faceWidth / 220) * 0.55 * manualScale;
      targetRotation = roll + manualRotation;
      targetYaw = yaw;
      targetPitch = pitch;
      targetRoll = roll;
      isTracked = true;
    }
    // 2. HAND / WRIST PLACEMENT (Using 21-point Hand Landmarker)
    else if (placement === 'hand') {
      if (handGeometry) {
        const { palmCenter, handLength, handSpan, angle, pitch } = handGeometry;
        targetX = palmCenter.x + manualOffsetX;
        targetY = palmCenter.y + manualOffsetY;
        targetScale = (handLength / 120) * 0.85 * manualScale;
        targetRotation = angle + manualRotation;
        targetYaw = 0;
        targetPitch = pitch;
        targetRoll = angle;
        isTracked = true;
      }
    }
    // 3. STOMACH / TORSO PLACEMENT (Using 33-point Pose Landmarker)
    else if (placement === 'stomach') {
      if (poseGeometry) {
        const { stomachCenter, torsoHeight, shoulderWidth, torsoRoll } = poseGeometry;
        targetX = stomachCenter.x + manualOffsetX;
        targetY = stomachCenter.y + manualOffsetY;
        targetScale = (torsoHeight / 240) * 0.9 * manualScale;
        targetRotation = torsoRoll + manualRotation;
        targetYaw = 0;
        targetPitch = 0;
        targetRoll = torsoRoll;
        isTracked = true;
      }
    }
    // 4. THIGH / LEG PLACEMENT (Using 33-point Pose Landmarker)
    else if (placement === 'thigh') {
      if (poseGeometry) {
        const thigh = poseGeometry.rightThigh || poseGeometry.leftThigh;
        targetX = thigh.center.x + manualOffsetX;
        targetY = thigh.center.y + manualOffsetY;
        targetScale = (thigh.length / 180) * 0.85 * manualScale;
        targetRotation = thigh.angle + manualRotation;
        targetYaw = 0;
        targetPitch = 0;
        targetRoll = thigh.angle;
        isTracked = true;
      }
    }

    // Adaptive Exponential Smoothing
    const now = performance.now();
    if (!this.hasValidTrack && isTracked) {
      this.smoothedPose = {
        x: targetX,
        y: targetY,
        scale: targetScale,
        rotation: targetRotation,
        yaw: targetYaw,
        pitch: targetPitch,
        roll: targetRoll,
        confidence: 1.0
      };
      this.hasValidTrack = true;
      this.lastValidTime = now;
    } else if (isTracked) {
      const dx = targetX - this.smoothedPose.x;
      const dy = targetY - this.smoothedPose.y;
      const dist = Math.hypot(dx, dy);

      // Adaptive factor: Fast tracking during quick movement, high stability when stationary
      const alpha = dist > 40 ? 0.85 : dist > 10 ? 0.55 : 0.28;

      this.smoothedPose.x += (targetX - this.smoothedPose.x) * alpha;
      this.smoothedPose.y += (targetY - this.smoothedPose.y) * alpha;
      this.smoothedPose.scale += (targetScale - this.smoothedPose.scale) * alpha;
      this.smoothedPose.rotation += (targetRotation - this.smoothedPose.rotation) * alpha;
      this.smoothedPose.yaw += (targetYaw - this.smoothedPose.yaw) * alpha;
      this.smoothedPose.pitch += (targetPitch - this.smoothedPose.pitch) * alpha;
      this.smoothedPose.roll += (targetRoll - this.smoothedPose.roll) * alpha;

      this.lastValidTime = now;
      this.smoothedPose.confidence = Math.min(1.0, this.smoothedPose.confidence + 0.15);
    } else {
      // Smooth tracking loss decay over 350ms (no abrupt jump/glitch)
      const elapsed = now - this.lastValidTime;
      if (elapsed > 200) {
        this.smoothedPose.confidence = Math.max(0, this.smoothedPose.confidence - 0.08);
      }
      if (this.smoothedPose.confidence <= 0.01) {
        this.hasValidTrack = false;
      }
    }

    return this.smoothedPose;
  }

  reset() {
    this.hasValidTrack = false;
    this.lastValidTime = 0;
    this.smoothedPose = {
      x: 0,
      y: 0,
      scale: 1,
      rotation: 0,
      yaw: 0,
      pitch: 0,
      roll: 0,
      confidence: 0
    };
  }
}
