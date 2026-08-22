/**
 * PiercingAnchors — Anatomical Stomach & Belly Button Anchor Computation
 * Provides precision navel positioning from PoseLandmarker with 60FPS fluid smoothing
 */

export class PiercingAnchors {
  constructor() {
    this.smoothedNavel = null;
    this.alpha = 0.35; // Responsive EMA factor
    this.lastTimestamp = 0;
  }

  reset() {
    this.smoothedNavel = null;
  }

  /**
   * Compute Navel / Belly Button Anchor from Torso Landmarks
   * Uses proportional anatomical navel positioning (62% down the sternum-to-pelvis line)
   */
  computeNavelAnchor(poseGeometry, canvasWidth, canvasHeight, userScale = 1.0) {
    if (!poseGeometry) {
      return null;
    }

    const {
      leftShoulder,
      rightShoulder,
      leftHip,
      rightHip,
      shoulderMid,
      hipMid,
      torsoHeight,
      shoulderWidth,
      torsoRoll
    } = poseGeometry;

    // Verify key landmark visibility / coordinates
    const leftShoulderVis = leftShoulder?.visibility !== undefined ? leftShoulder.visibility : 1;
    const rightShoulderVis = rightShoulder?.visibility !== undefined ? rightShoulder.visibility : 1;
    const leftHipVis = leftHip?.visibility !== undefined ? leftHip.visibility : 1;
    const rightHipVis = rightHip?.visibility !== undefined ? rightHip.visibility : 1;

    const visConfidence = (leftShoulderVis + rightShoulderVis + leftHipVis + rightHipVis) * 0.25;

    // Must have at least basic torso presence
    if (visConfidence < 0.25 && torsoHeight < 25) {
      return null;
    }

    // Anatomical navel position is ~62% down from the mid-shoulder line to the mid-hip line
    const navelRatio = 0.62;
    const rawX = shoulderMid.x * (1 - navelRatio) + hipMid.x * navelRatio;
    const rawY = shoulderMid.y * (1 - navelRatio) + hipMid.y * navelRatio;

    // Torso yaw/twist perspective calculation from 3D z-depth differences
    const dzShoulder = (rightShoulder.z || 0) - (leftShoulder.z || 0);
    const dzHip = (rightHip.z || 0) - (leftHip.z || 0);
    const avgDz = (dzShoulder + dzHip) * 0.5;
    const torsoYaw = Math.max(-0.6, Math.min(0.6, avgDz * 1.8));

    // Base jewelry pixel scale proportional to user's torso size in view
    // A standard navel barbell is ~25-30% of torso width
    const hipWidth = Math.hypot(rightHip.x - leftHip.x, rightHip.y - leftHip.y);
    const refTorsoWidth = Math.max(shoulderWidth, hipWidth) || 160;
    const baseSize = (refTorsoWidth * 0.14) * userScale;

    const rawNavel = {
      x: rawX,
      y: rawY,
      scale: Math.max(14, Math.min(100, baseSize)),
      rotation: torsoRoll || 0,
      yaw: torsoYaw,
      confidence: Math.max(0.1, Math.min(1.0, visConfidence)),
      torsoHeight,
      torsoWidth: refTorsoWidth
    };

    // Smooth point with adaptive acceleration
    if (!this.smoothedNavel) {
      this.smoothedNavel = { ...rawNavel };
    } else {
      const dx = rawNavel.x - this.smoothedNavel.x;
      const dy = rawNavel.y - this.smoothedNavel.y;
      const dist = Math.hypot(dx, dy);

      // Adaptive smoothing: catch up fast if user moved, lock tightly if stationary
      const adaptiveAlpha = dist > 40 ? 0.65 : dist > 10 ? 0.45 : 0.28;

      this.smoothedNavel.x += (rawNavel.x - this.smoothedNavel.x) * adaptiveAlpha;
      this.smoothedNavel.y += (rawNavel.y - this.smoothedNavel.y) * adaptiveAlpha;
      this.smoothedNavel.scale += (rawNavel.scale - this.smoothedNavel.scale) * adaptiveAlpha;
      this.smoothedNavel.rotation += (rawNavel.rotation - this.smoothedNavel.rotation) * adaptiveAlpha;
      this.smoothedNavel.yaw += (rawNavel.yaw - this.smoothedNavel.yaw) * adaptiveAlpha;
      this.smoothedNavel.confidence += (rawNavel.confidence - this.smoothedNavel.confidence) * 0.2;
    }

    return this.smoothedNavel;
  }
}
