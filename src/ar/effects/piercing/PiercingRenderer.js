/**
 * PiercingRenderer — Physics-Driven Navel Jewelry Compositor
 */
import { drawNavelJewelry } from './PiercingGeometry.js';

export class PiercingRenderer {
  constructor() {
    this.dangleAngle = 0;
    this.dangleVelocity = 0;
    this.lastTimestamp = 0;
    this.lastTorsoRotation = 0;
  }

  reset() {
    this.dangleAngle = 0;
    this.dangleVelocity = 0;
    this.lastTimestamp = 0;
    this.lastTorsoRotation = 0;
  }

  renderNavel(ctx, navelAnchor, design, timestamp = performance.now()) {
    if (!navelAnchor || navelAnchor.opacity <= 0.02) {
      return;
    }

    if (!Number.isFinite(navelAnchor.x) || !Number.isFinite(navelAnchor.y)) {
      return;
    }

    // ─── Real-Time Dangle Pendulum Physics Simulation ──────────────────────
    const dt = Math.min(0.05, Math.max(0.005, (timestamp - (this.lastTimestamp || timestamp)) / 1000));
    this.lastTimestamp = timestamp;

    const rotDelta = (navelAnchor.rotation || 0) - (this.lastTorsoRotation || 0);
    this.lastTorsoRotation = navelAnchor.rotation || 0;

    // Linear motion inertia force
    const linearInertia = -(navelAnchor.vx || 0) * 0.003;

    // Gravity restoring torque
    const gravityForce = -Math.sin(this.dangleAngle + (navelAnchor.rotation || 0)) * 16;

    const damping = 0.88;
    this.dangleVelocity = (this.dangleVelocity + (gravityForce + linearInertia - rotDelta * 22) * dt) * damping;
    this.dangleAngle += this.dangleVelocity * dt;
    this.dangleAngle = Math.max(-0.6, Math.min(0.6, this.dangleAngle));

    const time = timestamp / 1000;

    // ─── Render Pass ────────────────────────────────────────────────────────
    ctx.save();
    ctx.translate(navelAnchor.x, navelAnchor.y);
    ctx.rotate(navelAnchor.rotation || 0);
    ctx.globalAlpha = Math.max(0, Math.min(1.0, navelAnchor.opacity));

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const scale = navelAnchor.scale || 26;
    drawNavelJewelry(ctx, design, scale, navelAnchor.yaw || 0, time, this.dangleAngle);

    ctx.restore();
  }
}
