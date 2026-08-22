/**
 * PiercingAnchors — Anatomical Anchor Engine with Outlier Rejection & Smooth Fade
 * Provides rock-solid, jitter-free anatomical tracking for Ear and Navel piercings.
 */

class AnatomicalSmoother {
  constructor(holdDurationMs = 250) {
    this.current = null;
    this.target = null;
    this.lastSeenTime = 0;
    this.alpha = 0.32; // Smoothing EMA
    this.holdDurationMs = holdDurationMs;
    this.opacity = 0;
  }

  reset() {
    this.current = null;
    this.target = null;
    this.lastSeenTime = 0;
    this.opacity = 0;
  }

  update(rawPoint, referenceDimension, now = performance.now()) {
    if (rawPoint && rawPoint.confidence > 0.08) {
      this.lastSeenTime = now;
      this.target = { ...rawPoint };

      if (!this.current) {
        // Initial acquisition
        this.current = { ...rawPoint };
        this.opacity = 0.1;
      } else {
        // 1. Outlier Rejection / Movement Clamp per frame
        const maxJump = Math.max(15, (referenceDimension || 100) * 0.15);
        const dx = this.target.x - this.current.x;
        const dy = this.target.y - this.current.y;
        const dist = Math.hypot(dx, dy);

        let targetX = this.target.x;
        let targetY = this.target.y;

        if (dist > maxJump) {
          const ratio = maxJump / dist;
          targetX = this.current.x + dx * ratio;
          targetY = this.current.y + dy * ratio;
        }

        // 2. Adaptive Exponential Moving Average
        const smoothingFactor = dist > 30 ? 0.55 : dist > 8 ? 0.38 : 0.24;

        this.current.x += (targetX - this.current.x) * smoothingFactor;
        this.current.y += (targetY - this.current.y) * smoothingFactor;
        this.current.scale += (this.target.scale - this.current.scale) * smoothingFactor;
        this.current.rotation += (this.target.rotation - this.current.rotation) * smoothingFactor;
        if (this.target.yaw !== undefined) {
          this.current.yaw = (this.current.yaw || 0) + (this.target.yaw - (this.current.yaw || 0)) * smoothingFactor;
        }
      }

      // Smoothly fade opacity in
      this.opacity = Math.min(1.0, this.opacity + 0.15);
      this.current.opacity = this.opacity * Math.min(1.0, rawPoint.confidence);
      return this.current;
    } else {
      // 3. Tracking Loss Hold & Fade (No sudden snapping to 0 or screen center)
      const elapsedSinceSeen = now - this.lastSeenTime;
      if (this.current && elapsedSinceSeen < this.holdDurationMs) {
        // Hold previous stable pose briefly, gently decaying opacity
        this.opacity = Math.max(0, 1.0 - (elapsedSinceSeen / this.holdDurationMs));
        this.current.opacity = this.opacity;
        return this.current;
      } else {
        // Fully lost
        this.opacity = 0;
        return null;
      }
    }
  }
}

export class PiercingAnchors {
  constructor() {
    this.leftEarSmoother = new AnatomicalSmoother(250);
    this.rightEarSmoother = new AnatomicalSmoother(250);
    this.navelSmoother = new AnatomicalSmoother(300);
  }

  reset() {
    this.leftEarSmoother.reset();
    this.rightEarSmoother.reset();
    this.navelSmoother.reset();
  }

  /**
   * Compute Anatomically Stable Ear Anchors from Face Geometry
   * Anchored strictly relative to ear/cheek boundary along head axes
   */
  computeEarAnchors(faceGeometry, canvasWidth, canvasHeight, userScale = 1.0, now = performance.now()) {
    if (!faceGeometry || !faceGeometry.leftCheek || !faceGeometry.rightCheek) {
      const left = this.leftEarSmoother.update(null, 100, now);
      const right = this.rightEarSmoother.update(null, 100, now);
      if (!left && !right) return null;
      return { left, right, yaw: 0, roll: 0, faceWidth: 100 };
    }

    const {
      leftCheek,
      rightCheek,
      faceWidth,
      faceHeight,
      roll,
      yaw
    } = faceGeometry;

    const baseSize = (faceWidth * 0.082) * userScale;

    // Unit vectors matching head roll
    const cosR = Math.cos(roll || 0);
    const sinR = Math.sin(roll || 0);
    const rightX = cosR;
    const rightY = sinR;
    const downX = -sinR;
    const downY = cosR;

    // Anatomical offset for earlobe position
    const earOffsetDist = faceWidth * 0.135;
    const earDropDist = faceHeight * 0.115;

    // Left Ear raw anchor (Left cheek landmark 234 - outward lateral + downward vertical)
    const rawLeft = {
      x: leftCheek.x - rightX * earOffsetDist + downX * earDropDist,
      y: leftCheek.y - rightY * earOffsetDist + downY * earDropDist,
      scale: baseSize,
      rotation: roll || 0,
      yaw: yaw || 0,
      // Left ear visibility decays when turning head left (yaw < -0.2)
      confidence: Math.max(0.05, Math.min(1.0, 0.9 + (yaw || 0) * 0.85)),
      side: 'left'
    };

    // Right Ear raw anchor (Right cheek landmark 454 + outward lateral + downward vertical)
    const rawRight = {
      x: rightCheek.x + rightX * earOffsetDist + downX * earDropDist,
      y: rightCheek.y + rightY * earOffsetDist + downY * earDropDist,
      scale: baseSize,
      rotation: roll || 0,
      yaw: yaw || 0,
      // Right ear visibility decays when turning head right (yaw > 0.2)
      confidence: Math.max(0.05, Math.min(1.0, 0.9 - (yaw || 0) * 0.85)),
      side: 'right'
    };

    const smoothedLeft = this.leftEarSmoother.update(rawLeft, faceWidth, now);
    const smoothedRight = this.rightEarSmoother.update(rawRight, faceWidth, now);

    return {
      left: smoothedLeft,
      right: smoothedRight,
      yaw: yaw || 0,
      roll: roll || 0,
      faceWidth
    };
  }

  /**
   * Dedicated Navel Anchor Estimator
   * Strictly calculates belly button ~62% down the sternum-to-pelvis axis
   */
  computeNavelAnchor(poseGeometry, canvasWidth, canvasHeight, userScale = 1.0, now = performance.now()) {
    if (!poseGeometry) {
      return this.navelSmoother.update(null, 100, now);
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

    // Strict validation: both shoulders and hips must have sufficient visibility
    const leftShoulderVis = leftShoulder?.visibility !== undefined ? leftShoulder.visibility : 1;
    const rightShoulderVis = rightShoulder?.visibility !== undefined ? rightShoulder.visibility : 1;
    const leftHipVis = leftHip?.visibility !== undefined ? leftHip.visibility : 1;
    const rightHipVis = rightHip?.visibility !== undefined ? rightHip.visibility : 1;

    const visConfidence = (leftShoulderVis + rightShoulderVis + leftHipVis + rightHipVis) * 0.25;

    // Reject if torso is too small or untracked
    if (visConfidence < 0.25 || torsoHeight < 28 || shoulderWidth < 25) {
      return this.navelSmoother.update(null, shoulderWidth || 100, now);
    }

    // Anatomical ratio down torso center axis: ~62% from shoulder midpoint to hip midpoint
    const NAVEL_RATIO = 0.62;
    const rawX = shoulderMid.x * (1 - NAVEL_RATIO) + hipMid.x * NAVEL_RATIO;
    const rawY = shoulderMid.y * (1 - NAVEL_RATIO) + hipMid.y * NAVEL_RATIO;

    // Torso yaw from 3D z-depth
    const dzShoulder = (rightShoulder.z || 0) - (leftShoulder.z || 0);
    const dzHip = (rightHip.z || 0) - (leftHip.z || 0);
    const torsoYaw = Math.max(-0.6, Math.min(0.6, ((dzShoulder + dzHip) * 0.5) * 1.6));

    const hipWidth = Math.hypot(rightHip.x - leftHip.x, rightHip.y - leftHip.y);
    const refTorsoWidth = Math.max(shoulderWidth, hipWidth) || 160;
    const baseSize = (refTorsoWidth * 0.135) * userScale;

    const rawNavel = {
      x: rawX,
      y: rawY,
      scale: Math.max(14, Math.min(95, baseSize)),
      rotation: torsoRoll || 0,
      yaw: torsoYaw,
      confidence: Math.max(0.1, Math.min(1.0, visConfidence))
    };

    return this.navelSmoother.update(rawNavel, refTorsoWidth, now);
  }
}
