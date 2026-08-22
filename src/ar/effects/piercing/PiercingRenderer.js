/**
 * PiercingRenderer — Compositor for Ear and Navel Piercings
 */
import {
  drawStud,
  drawStarStud,
  drawHoop,
  drawNavelJewelry
} from './PiercingGeometry.js';

export class PiercingRenderer {
  renderEar(ctx, earAnchors, design) {
    if (!earAnchors) return;

    const { left, right, yaw } = earAnchors;

    // 1. Left Earlobe
    if (left && Number.isFinite(left.x) && Number.isFinite(left.y) && left.opacity > 0.02) {
      ctx.save();
      ctx.translate(left.x, left.y);
      ctx.rotate(left.rotation || 0);
      ctx.globalAlpha = Math.max(0, Math.min(1.0, left.opacity));

      // Perspective foreshortening: compress hoop when turning head
      const foreshorten = Math.max(0.2, Math.min(1.0, 0.85 + (yaw || 0) * 0.7));
      this.drawEarJewelry(ctx, design, left.scale || 18, foreshorten);
      ctx.restore();
    }

    // 2. Right Earlobe
    if (right && Number.isFinite(right.x) && Number.isFinite(right.y) && right.opacity > 0.02) {
      ctx.save();
      ctx.translate(right.x, right.y);
      ctx.rotate(right.rotation || 0);
      ctx.globalAlpha = Math.max(0, Math.min(1.0, right.opacity));

      const foreshorten = Math.max(0.2, Math.min(1.0, 0.85 - (yaw || 0) * 0.7));
      this.drawEarJewelry(ctx, design, right.scale || 18, foreshorten);
      ctx.restore();
    }
  }

  drawEarJewelry(ctx, design, scale, foreshorten = 1.0) {
    const type = design.type || 'stud';
    const metal = design.metal || 'silver';
    const gem = design.gem || null;

    if (type === 'stud') {
      drawStud(ctx, scale * 0.5, metal, gem);
    } else if (type === 'star') {
      drawStarStud(ctx, scale * 0.55, metal);
    } else if (type === 'hoop') {
      const R = scale * 0.75;
      const tubeR = scale * 0.12;
      drawHoop(ctx, R, tubeR, metal, foreshorten);
    } else {
      drawStud(ctx, scale * 0.5, metal, gem);
    }
  }

  renderNavel(ctx, navelAnchor, design) {
    if (!navelAnchor || navelAnchor.opacity <= 0.02) {
      return;
    }

    if (!Number.isFinite(navelAnchor.x) || !Number.isFinite(navelAnchor.y)) {
      return;
    }

    ctx.save();
    ctx.translate(navelAnchor.x, navelAnchor.y);
    ctx.rotate(navelAnchor.rotation || 0);
    ctx.globalAlpha = Math.max(0, Math.min(1.0, navelAnchor.opacity));

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const scale = navelAnchor.scale || 26;
    drawNavelJewelry(ctx, design, scale, navelAnchor.yaw || 0);

    ctx.restore();
  }
}
