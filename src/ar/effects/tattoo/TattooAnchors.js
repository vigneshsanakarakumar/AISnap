/**
 * TattooAnchors — Landmark-based target position, scale, rotation & surface orientation
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

  computePose(placement, faceGeometry, width, height, manualOffsets = {}) {
    const {
      manualOffsetX = 0,
      manualOffsetY = 0,
      manualScale = 1.0,
      manualRotation = 0
    } = manualOffsets;

    let targetX = width * 0.5;
    let targetY = height * 0.5;
    let targetScale = 1.0;
    let targetRotation = 0;
    let targetYaw = 0;
    let targetPitch = 0;
    let targetRoll = 0;
    let isTracked = false;

    if (placement === 'cheek' && faceGeometry) {
      // Direct anatomical anchoring to Cheek / Temple / Zygomatic arch
      const { rightCheekCenter, rightCheek, noseTip, faceWidth, roll, yaw, pitch } = faceGeometry;
      
      targetX = (rightCheekCenter.x + rightCheek.x) * 0.5;
      targetY = rightCheekCenter.y;
      targetScale = (faceWidth / 220) * 0.55 * manualScale;
      targetRotation = roll + manualRotation;
      targetYaw = yaw;
      targetPitch = pitch;
      targetRoll = roll;
      isTracked = true;

    } else if (placement === 'hand') {
      // Hand / Forearm placement
      targetX = width * 0.5 + manualOffsetX;
      targetY = height * 0.52 + manualOffsetY;
      targetScale = (Math.min(width, height) / 480) * 0.95 * manualScale;
      targetRotation = manualRotation;
      targetYaw = 0;
      targetPitch = 0;
      isTracked = true;

    } else if (placement === 'stomach') {
      // Stomach / Torso placement
      targetX = width * 0.5 + manualOffsetX;
      targetY = height * 0.58 + manualOffsetY;
      targetScale = (Math.min(width, height) / 480) * 1.25 * manualScale;
      targetRotation = manualRotation;
      targetYaw = 0;
      targetPitch = 0;
      isTracked = true;

    } else if (placement === 'thigh') {
      // Thigh / Leg placement
      targetX = width * 0.5 + manualOffsetX;
      targetY = height * 0.55 + manualOffsetY;
      targetScale = (Math.min(width, height) / 480) * 1.35 * manualScale;
      targetRotation = manualRotation;
      targetYaw = 0;
      targetPitch = 0;
      isTracked = true;

    } else if (faceGeometry) {
      // Default to face tracking anchor
      const { eyeMidpoint, faceWidth, roll, yaw, pitch } = faceGeometry;
      targetX = eyeMidpoint.x + manualOffsetX;
      targetY = eyeMidpoint.y + faceWidth * 0.35 + manualOffsetY;
      targetScale = (faceWidth / 200) * 0.7 * manualScale;
      targetRotation = roll + manualRotation;
      targetYaw = yaw;
      targetPitch = pitch;
      isTracked = true;
    }

    // Adaptive Exponential Smoothing (Fast movement = lower factor for zero lag; Slow = higher factor for jitter-free stability)
    const now = performance.now();
    if (!this.hasValidTrack) {
      this.smoothedPose = {
        x: targetX,
        y: targetY,
        scale: targetScale,
        rotation: targetRotation,
        yaw: targetYaw,
        pitch: targetPitch,
        roll: targetRoll,
        confidence: isTracked ? 1.0 : 0.0
      };
      this.hasValidTrack = isTracked;
    } else {
      const dx = targetX - this.smoothedPose.x;
      const dy = targetY - this.smoothedPose.y;
      const dist = Math.hypot(dx, dy);

      // Adaptive factor: Quick snap on fast movement, ultra-smooth when stationary
      const alpha = dist > 40 ? 0.85 : dist > 10 ? 0.55 : 0.28;

      this.smoothedPose.x += (targetX - this.smoothedPose.x) * alpha;
      this.smoothedPose.y += (targetY - this.smoothedPose.y) * alpha;
      this.smoothedPose.scale += (targetScale - this.smoothedPose.scale) * alpha;
      this.smoothedPose.rotation += (targetRotation - this.smoothedPose.rotation) * alpha;
      this.smoothedPose.yaw += (targetYaw - this.smoothedPose.yaw) * alpha;
      this.smoothedPose.pitch += (targetPitch - this.smoothedPose.pitch) * alpha;
      this.smoothedPose.roll += (targetRoll - this.smoothedPose.roll) * alpha;

      if (isTracked) {
        this.lastValidTime = now;
        this.smoothedPose.confidence = Math.min(1.0, this.smoothedPose.confidence + 0.1);
      } else {
        // Smooth tracking loss decay over 300ms
        const elapsed = now - this.lastValidTime;
        if (elapsed > 400) {
          this.smoothedPose.confidence = Math.max(0, this.smoothedPose.confidence - 0.05);
        }
      }
    }

    return this.smoothedPose;
  }
}
