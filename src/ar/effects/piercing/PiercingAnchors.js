/**
 * PiercingAnchors — Precision Anatomical Navel Estimator with Velocity Tracking
 */

export class PiercingAnchors {
  constructor() {
    this.current = null;
    this.lastSeenTime = 0;
    this.holdDurationMs = 280;
    this.opacity = 0;
    this.prevX = 0;
    this.prevY = 0;
    this.vx = 0;
    this.vy = 0;
  }

  reset() {
    this.current = null;
    this.lastSeenTime = 0;
    this.opacity = 0;
    this.prevX = 0;
    this.prevY = 0;
    this.vx = 0;
    this.vy = 0;
  }

  /**
   * Anatomical Navel Estimator
   * Computes navel center, 3D yaw/pitch/roll, and motion velocity for pendulum physics
   */
  computeNavelAnchor(poseGeometry, canvasWidth, canvasHeight, userScale = 1.0, now = performance.now()) {
    if (!poseGeometry) {
      return this.handleTrackingLoss(now);
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

    // Strict validation: check visibility scores
    const leftShoulderVis = leftShoulder?.visibility !== undefined ? leftShoulder.visibility : 1;
    const rightShoulderVis = rightShoulder?.visibility !== undefined ? rightShoulder.visibility : 1;
    const leftHipVis = leftHip?.visibility !== undefined ? leftHip.visibility : 1;
    const rightHipVis = rightHip?.visibility !== undefined ? rightHip.visibility : 1;

    const visConfidence = (leftShoulderVis + rightShoulderVis + leftHipVis + rightHipVis) * 0.25;

    // Reject if torso is too small or untracked
    if (visConfidence < 0.25 || torsoHeight < 28 || shoulderWidth < 25) {
      return this.handleTrackingLoss(now);
    }

    // Anatomical ratio down torso center axis: ~62% from shoulder midpoint to hip midpoint
    const NAVEL_RATIO = 0.62;
    const rawX = shoulderMid.x * (1 - NAVEL_RATIO) + hipMid.x * NAVEL_RATIO;
    const rawY = shoulderMid.y * (1 - NAVEL_RATIO) + hipMid.y * NAVEL_RATIO;

    // 3D Torso Twist / Yaw from depth coordinates
    const dzShoulder = (rightShoulder.z || 0) - (leftShoulder.z || 0);
    const dzHip = (rightHip.z || 0) - (leftHip.z || 0);
    const torsoYaw = Math.max(-0.6, Math.min(0.6, ((dzShoulder + dzHip) * 0.5) * 1.6));

    const hipWidth = Math.hypot(rightHip.x - leftHip.x, rightHip.y - leftHip.y);
    const refTorsoWidth = Math.max(shoulderWidth, hipWidth) || 160;
    const baseSize = (refTorsoWidth * 0.14) * userScale;

    this.lastSeenTime = now;

    if (!this.current) {
      this.current = {
        x: rawX,
        y: rawY,
        scale: baseSize,
        rotation: torsoRoll || 0,
        yaw: torsoYaw,
        confidence: visConfidence,
        opacity: 0.1,
        vx: 0,
        vy: 0
      };
      this.prevX = rawX;
      this.prevY = rawY;
      this.opacity = 0.1;
    } else {
      // 1. Outlier Rejection & Movement Clamping
      const maxJump = Math.max(16, refTorsoWidth * 0.15);
      const dx = rawX - this.current.x;
      const dy = rawY - this.current.y;
      const dist = Math.hypot(dx, dy);

      let targetX = rawX;
      let targetY = rawY;

      if (dist > maxJump) {
        const ratio = maxJump / dist;
        targetX = this.current.x + dx * ratio;
        targetY = this.current.y + dy * ratio;
      }

      // Track physical velocity for pendulum inertia physics
      this.vx = (targetX - this.prevX) * 0.5 + this.vx * 0.5;
      this.vy = (targetY - this.prevY) * 0.5 + this.vy * 0.5;
      this.prevX = targetX;
      this.prevY = targetY;

      // 2. Adaptive Exponential Smoothing
      const smoothingFactor = dist > 35 ? 0.6 : dist > 10 ? 0.42 : 0.28;

      this.current.x += (targetX - this.current.x) * smoothingFactor;
      this.current.y += (targetY - this.current.y) * smoothingFactor;
      this.current.scale += (baseSize - this.current.scale) * smoothingFactor;
      this.current.rotation += ((torsoRoll || 0) - this.current.rotation) * smoothingFactor;
      this.current.yaw += (torsoYaw - this.current.yaw) * smoothingFactor;
      this.current.vx = this.vx;
      this.current.vy = this.vy;

      this.opacity = Math.min(1.0, this.opacity + 0.15);
      this.current.opacity = this.opacity * Math.min(1.0, visConfidence);
    }

    return this.current;
  }

  handleTrackingLoss(now) {
    const elapsed = now - this.lastSeenTime;
    if (this.current && elapsed < this.holdDurationMs) {
      this.opacity = Math.max(0, 1.0 - (elapsed / this.holdDurationMs));
      this.current.opacity = this.opacity;
      return this.current;
    } else {
      this.opacity = 0;
      return null;
    }
  }
}
