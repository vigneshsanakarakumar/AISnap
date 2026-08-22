/**
 * PiercingRenderer — Orchestrates Canvas2D rendering for all piercing types
 */
import {
  drawStud,
  drawStarStud,
  drawHoop,
  drawBarbell,
  drawCurvedBarbell
} from './PiercingGeometry.js';
import { PiercingOcclusion } from './PiercingOcclusion.js';

export class PiercingRenderer {
  renderEar(ctx, earAnchors, design) {
    if (!earAnchors) return;

    const { left, right, leftHelix, roll, yaw } = earAnchors;

    // 1. Left Earlobe
    if (left && Number.isFinite(left.x) && Number.isFinite(left.y) && left.confidence > 0.05) {
      ctx.save();
      ctx.translate(left.x, left.y);
      ctx.rotate(left.rotation || 0);
      ctx.globalAlpha = left.confidence;

      const fore = PiercingOcclusion.getEarForeshortening(yaw, 'left');
      this.drawJewelryByDesign(ctx, design, left.scale || 16, fore);
      ctx.restore();
    }

    // 2. Right Earlobe
    if (right && Number.isFinite(right.x) && Number.isFinite(right.y) && right.confidence > 0.05) {
      ctx.save();
      ctx.translate(right.x, right.y);
      ctx.rotate(right.rotation || 0);
      ctx.globalAlpha = right.confidence;

      const fore = PiercingOcclusion.getEarForeshortening(yaw, 'right');
      this.drawJewelryByDesign(ctx, design, right.scale || 16, fore);
      ctx.restore();
    }
  }

  renderTongue(ctx, tongueAnchor, design) {
    if (!tongueAnchor || !tongueAnchor.isOpen || tongueAnchor.confidence <= 0.05) {
      return;
    }

    if (!Number.isFinite(tongueAnchor.x) || !Number.isFinite(tongueAnchor.y)) {
      return;
    }

    ctx.save();
    ctx.translate(tongueAnchor.x, tongueAnchor.y);
    ctx.rotate(tongueAnchor.rotation || 0);
    ctx.globalAlpha = tongueAnchor.confidence;

    const scale = tongueAnchor.scale || 18;
    const length = scale * 1.6;
    const ballR = scale * 0.45;

    drawBarbell(
      ctx,
      length,
      ballR,
      design.metal || 'silver',
      design.gem || null,
      design.doubled || false
    );

    ctx.restore();
  }

  renderNavel(ctx, navelAnchor, design) {
    if (!navelAnchor || navelAnchor.confidence <= 0.05) {
      return;
    }

    if (!Number.isFinite(navelAnchor.x) || !Number.isFinite(navelAnchor.y)) {
      return;
    }

    ctx.save();
    ctx.translate(navelAnchor.x, navelAnchor.y);
    ctx.rotate(navelAnchor.rotation || 0);
    ctx.globalAlpha = navelAnchor.confidence;

    const scale = navelAnchor.scale || 22;
    const length = scale * 1.8;
    const ballR = scale * 0.42;

    drawCurvedBarbell(
      ctx,
      length,
      ballR,
      design.metal || 'silver',
      design.charm || null
    );

    ctx.restore();
  }

  drawJewelryByDesign(ctx, design, scale, foreshorten = 1.0) {
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
    } else if (type === 'barbell') {
      drawBarbell(ctx, scale * 1.5, scale * 0.4, metal, gem);
    } else if (type === 'curved_barbell') {
      drawCurvedBarbell(ctx, scale * 1.6, scale * 0.4, metal, design.charm);
    } else {
      drawStud(ctx, scale * 0.5, metal, gem);
    }
  }
}
