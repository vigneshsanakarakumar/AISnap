/**
 * PiercingAnchors — Anatomical anchor computation & temporal smoothing for:
 * 1. Ear (Left/Right Earlobe, Helix) from FaceLandmarker
 * 2. Tongue (Mouth Cavity Center, Opening Gate) from FaceLandmarker
 * 3. Navel (Stomach / Belly Button) from PoseLandmarker
 */

export class PiercingAnchors {
  constructor() {
    this.smoothed = {
      earLeft: null,
      earRight: null,
      tongue: null,
      navel: null
    };
    this.mouthOpenSmoothed = 0;
    this.alpha = 0.35; // Exponential moving average smoothing factor
  }

  reset() {
    this.smoothed.earLeft = null;
    this.smoothed.earRight = null;
    this.smoothed.tongue = null;
    this.smoothed.navel = null;
    this.mouthOpenSmoothed = 0;
  }

  smoothPoint(prev, next, alpha = this.alpha) {
    if (!prev) return { ...next };
    return {
      x: prev.x * (1 - alpha) + next.x * alpha,
      y: prev.y * (1 - alpha) + next.y * alpha,
      scale: (prev.scale || 1) * (1 - alpha) + (next.scale || 1) * alpha,
      rotation: (prev.rotation || 0) * (1 - alpha) + (next.rotation || 0) * alpha,
      confidence: (prev.confidence || 0) * (1 - alpha) + (next.confidence || 0) * alpha,
      yaw: (prev.yaw || 0) * (1 - alpha) + (next.yaw || 0) * alpha
    };
  }

  /**
   * Compute Ear Anchors from Face Landmarks
   */
  computeEarAnchors(faceGeometry, canvasWidth, canvasHeight, userScale = 1.0) {
    if (!faceGeometry || !faceGeometry.rawLandmarks || faceGeometry.rawLandmarks.length < 468) {
      return null;
    }

    const {
      leftCheek,
      rightCheek,
      leftEarTop,
      rightEarTop,
      chin,
      forehead,
      eyeMidpoint,
      faceWidth,
      faceHeight,
      roll,
      yaw
    } = faceGeometry;

    // Base unit size derived from facial geometry scale
    const baseSize = (faceWidth * 0.08) * userScale;

    // Face Landmarker doesn't track deep earlobe surface directly,
    // so we derive stable anatomical ear anchors:
    // Left Earlobe: extends outward from left cheek/tragus landmark along head roll axis
    const cosR = Math.cos(roll);
    const sinR = Math.sin(roll);
    
    // Normal vector perpendicular to head tilt (pointing down along face)
    const downX = -sinR;
    const downY = cosR;
    // Lateral vector (pointing right across face)
    const rightX = cosR;
    const rightY = sinR;

    // Earlobe is slightly lower than ear top / tragus
    const earOffsetDist = faceWidth * 0.14;
    const earDropDist = faceHeight * 0.12;

    const rawLeft = {
      x: leftCheek.x - rightX * earOffsetDist + downX * earDropDist,
      y: leftCheek.y - rightY * earOffsetDist + downY * earDropDist,
      scale: baseSize,
      rotation: roll,
      yaw: yaw,
      // Left ear is more visible when turning head right (yaw > 0)
      confidence: Math.max(0.1, Math.min(1.0, 0.85 + yaw * 0.8)),
      side: 'left'
    };

    const rawRight = {
      x: rightCheek.x + rightX * earOffsetDist + downX * earDropDist,
      y: rightCheek.y + rightY * earOffsetDist + downY * earDropDist,
      scale: baseSize,
      rotation: roll,
      yaw: yaw,
      // Right ear is more visible when turning head left (yaw < 0)
      confidence: Math.max(0.1, Math.min(1.0, 0.85 - yaw * 0.8)),
      side: 'right'
    };

    // Helix / Upper ear anchors
    const helixOffsetDist = faceWidth * 0.16;
    const helixUpDist = faceHeight * 0.08;
    const rawLeftHelix = {
      x: (leftEarTop?.x || leftCheek.x) - rightX * helixOffsetDist - downX * helixUpDist,
      y: (leftEarTop?.y || leftCheek.y) - rightY * helixOffsetDist - downY * helixUpDist,
      scale: baseSize * 0.85,
      rotation: roll,
      yaw: yaw,
      confidence: rawLeft.confidence,
      side: 'left_helix'
    };

    this.smoothed.earLeft = this.smoothPoint(this.smoothed.earLeft, rawLeft);
    this.smoothed.earRight = this.smoothPoint(this.smoothed.earRight, rawRight);

    return {
      left: this.smoothed.earLeft,
      right: this.smoothed.earRight,
      leftHelix: rawLeftHelix,
      faceWidth,
      roll,
      yaw
    };
  }

  /**
   * Compute Tongue Anchor from Mouth/Lip Landmarks
   * Strictly verifies mouth openness threshold!
   */
  computeTongueAnchor(faceGeometry, canvasWidth, canvasHeight, userScale = 1.0) {
    if (!faceGeometry || !faceGeometry.rawLandmarks) {
      return null;
    }

    const {
      upperLip,
      lowerLip,
      upperLipTop,
      lowerLipBottom,
      mouthLeft,
      mouthRight,
      faceHeight,
      faceWidth,
      roll,
      yaw
    } = faceGeometry;

    // Measure vertical mouth opening relative to face height
    const lipDistance = Math.hypot(lowerLip.y - upperLip.y, lowerLip.x - upperLip.x);
    const normalizedOpening = lipDistance / (faceHeight || 1);

    this.mouthOpenSmoothed = this.mouthOpenSmoothed * 0.7 + normalizedOpening * 0.3;

    // Threshold: Mouth must be open at least 4.5% of face height
    const isOpen = this.mouthOpenSmoothed > 0.045;
    
    // Confidence falls off smoothly as mouth closes
    const confidence = Math.max(0, Math.min(1.0, (this.mouthOpenSmoothed - 0.04) / 0.05));

    // Mouth Center Point
    const mouthCenterX = (mouthLeft.x + mouthRight.x + upperLip.x + lowerLip.x) * 0.25;
    const mouthCenterY = (mouthLeft.y + mouthRight.y + upperLip.y + lowerLip.y) * 0.25;

    // Tongue surface center sits slightly forward/lower in mouth cavity
    const cosR = Math.cos(roll);
    const sinR = Math.sin(roll);
    const downX = -sinR;
    const downY = cosR;

    const rawTongue = {
      x: mouthCenterX + downX * (lipDistance * 0.15),
      y: mouthCenterY + downY * (lipDistance * 0.15),
      scale: (faceWidth * 0.075) * userScale,
      rotation: roll,
      confidence: isOpen ? confidence : 0,
      isOpen: isOpen,
      mouthWidth: Math.hypot(mouthRight.x - mouthLeft.x, mouthRight.y - mouthLeft.y),
      lipDistance: lipDistance,
      mouthOpenSmoothed: this.mouthOpenSmoothed
    };

    this.smoothed.tongue = this.smoothPoint(this.smoothed.tongue, rawTongue);
    this.smoothed.tongue.isOpen = isOpen;
    this.smoothed.tongue.lipDistance = lipDistance;
    this.smoothed.tongue.mouthOpenSmoothed = this.mouthOpenSmoothed;

    return this.smoothed.tongue;
  }

  /**
   * Compute Navel / Belly Button Anchor from Pose Landmarks
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

    // Check visibility / presence of key landmarks
    const visConfidence = (
      (leftShoulder.visibility || 0.8) +
      (rightShoulder.visibility || 0.8) +
      (leftHip.visibility || 0.8) +
      (rightHip.visibility || 0.8)
    ) * 0.25;

    if (visConfidence < 0.3 || torsoHeight < 20) {
      return null;
    }

    // Navel is located ~62% down the torso line from mid-shoulders to mid-hips
    const navelRatio = 0.62;
    const rawX = shoulderMid.x * (1 - navelRatio) + hipMid.x * navelRatio;
    const rawY = shoulderMid.y * (1 - navelRatio) + hipMid.y * navelRatio;

    const baseSize = (shoulderWidth * 0.12) * userScale;

    const rawNavel = {
      x: rawX,
      y: rawY,
      scale: baseSize,
      rotation: torsoRoll,
      confidence: Math.max(0.1, Math.min(1.0, visConfidence)),
      torsoHeight,
      shoulderWidth
    };

    this.smoothed.navel = this.smoothPoint(this.smoothed.navel, rawNavel);
    return this.smoothed.navel;
  }
}
