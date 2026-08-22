/**
 * PiercingRenderer — Navel / Belly Button Piercing Compositor
 */
import { drawNavelJewelry } from './PiercingGeometry.js';

export class PiercingRenderer {
  renderNavel(ctx, navelAnchor, design, timestamp = performance.now()) {
    if (!navelAnchor || navelAnchor.confidence <= 0.05) {
      return;
    }

    if (!Number.isFinite(navelAnchor.x) || !Number.isFinite(navelAnchor.y)) {
      return;
    }

    const time = timestamp / 1000;

    ctx.save();
    ctx.translate(navelAnchor.x, navelAnchor.y);
    ctx.rotate(navelAnchor.rotation || 0);
    ctx.globalAlpha = Math.max(0, Math.min(1.0, navelAnchor.confidence));

    // High quality sub-pixel anti-aliasing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const scale = navelAnchor.scale || 26;
    drawNavelJewelry(ctx, design, scale, navelAnchor.yaw || 0, time);

    ctx.restore();
  }
}
