import { ARFilter } from './ARFilter.js';
import {
  DEBUG,
  PLACEMENTS,
  getDesignsForPlacement
} from '../effects/piercing/PiercingConfig.js';
import { PiercingAnchors } from '../effects/piercing/PiercingAnchors.js';
import { PiercingRenderer } from '../effects/piercing/PiercingRenderer.js';

export class ARPiercingFilter extends ARFilter {
  constructor() {
    super(
      'ar_piercing',
      'AR Piercing Studio',
      '💎',
      'Jewelry',
      'Realistic virtual jewelry preview for ear, tongue, and navel piercings with physics-based metals and perspective rendering'
    );

    this.placement = 'ear'; // 'ear' | 'tongue' | 'navel'
    this.placements = PLACEMENTS;
    this.designIndex = 0;
    this.sizeMultiplier = 1.0; // 0.75 (small), 1.0 (med), 1.35 (large)

    // Active body tracking target for ARRenderer dispatch ('face' or 'torso')
    this.targetBodyPart = 'face';

    // Subsystems
    this.anchors = new PiercingAnchors();
    this.renderer = new PiercingRenderer();
  }

  setPlacement(placeId) {
    if (this.placements.some((p) => p.id === placeId)) {
      this.placement = placeId;
      const meta = this.placements.find((p) => p.id === placeId);
      this.targetBodyPart = meta?.tracker === 'pose' ? 'torso' : 'face';
      this.designIndex = 0;
      this.anchors.reset();
    }
  }

  setDesign(index) {
    const list = getDesignsForPlacement(this.placement);
    this.designIndex = Math.max(0, Math.min(index, list.length - 1));
  }

  setSize(sizeStr) {
    if (sizeStr === 'small') this.sizeMultiplier = 0.75;
    else if (sizeStr === 'large') this.sizeMultiplier = 1.35;
    else this.sizeMultiplier = 1.0;
  }

  render(ctx, canvas, video, trackingResult, timestamp = performance.now()) {
    const { width, height } = canvas;

    // 1. Base video pass-through with subtle clarity enhancement
    ctx.save();
    ctx.filter = 'contrast(104%) brightness(102%)';
    ctx.drawImage(video, 0, 0, width, height);
    ctx.restore();

    const designs = getDesignsForPlacement(this.placement);
    const activeDesign = designs[this.designIndex] || designs[0];

    let hasValidAnchor = false;
    let anchorTelemetry = {};

    // 2. Render Placement
    if (this.placement === 'ear') {
      const faceGeo = trackingResult?.faceGeometry || (trackingResult?.eyeMidpoint ? trackingResult : null);
      if (faceGeo) {
        const earAnchors = this.anchors.computeEarAnchors(faceGeo, width, height, this.sizeMultiplier);
        if (earAnchors && (earAnchors.left?.confidence > 0.05 || earAnchors.right?.confidence > 0.05)) {
          this.renderer.renderEar(ctx, earAnchors, activeDesign);
          hasValidAnchor = true;
          anchorTelemetry = {
            x: earAnchors.left?.x,
            y: earAnchors.left?.y,
            scale: earAnchors.left?.scale,
            confidence: earAnchors.left?.confidence,
            rot: earAnchors.roll
          };
        }
      }
    } else if (this.placement === 'tongue') {
      const faceGeo = trackingResult?.faceGeometry || (trackingResult?.eyeMidpoint ? trackingResult : null);
      if (faceGeo) {
        const tongueAnchor = this.anchors.computeTongueAnchor(faceGeo, width, height, this.sizeMultiplier);
        if (tongueAnchor && tongueAnchor.isOpen && tongueAnchor.confidence > 0.05) {
          this.renderer.renderTongue(ctx, tongueAnchor, activeDesign);
          hasValidAnchor = true;
          anchorTelemetry = {
            x: tongueAnchor.x,
            y: tongueAnchor.y,
            scale: tongueAnchor.scale,
            confidence: tongueAnchor.confidence,
            rot: tongueAnchor.rotation
          };
        } else if (tongueAnchor && !tongueAnchor.isOpen) {
          this.renderHintPill(ctx, width, height, '👅 Open your mouth to preview');
        }
      }
    } else if (this.placement === 'navel') {
      const poseGeo = trackingResult?.poseGeometry || (trackingResult?.shoulderMid ? trackingResult : null);
      if (poseGeo) {
        const navelAnchor = this.anchors.computeNavelAnchor(poseGeo, width, height, this.sizeMultiplier);
        if (navelAnchor && navelAnchor.confidence > 0.05) {
          this.renderer.renderNavel(ctx, navelAnchor, activeDesign);
          hasValidAnchor = true;
          anchorTelemetry = {
            x: navelAnchor.x,
            y: navelAnchor.y,
            scale: navelAnchor.scale,
            confidence: navelAnchor.confidence,
            rot: navelAnchor.rotation
          };
        }
      }
    }

    // 3. Fallback tracking prompt if no anchor
    if (!hasValidAnchor && this.placement !== 'tongue') {
      const meta = this.placements.find((p) => p.id === this.placement);
      this.renderHintPill(ctx, width, height, `🔍 ${meta?.hint || 'Keep subject visible'}`);
    }

    // 4. Debug overlay when DEBUG is true
    if (DEBUG) {
      this.renderDebugOverlay(ctx, width, height, activeDesign, hasValidAnchor, anchorTelemetry, trackingResult);
    }
  }

  renderHintPill(ctx, width, height, text) {
    ctx.save();
    ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    const pillY = height * 0.88;

    ctx.fillStyle = 'rgba(15, 15, 22, 0.78)';
    ctx.beginPath();
    ctx.roundRect(width * 0.5 - 130, pillY - 17, 260, 34, 17);
    ctx.fill();
    ctx.strokeStyle = 'rgba(236, 72, 153, 0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#f472b6';
    ctx.fillText(text, width * 0.5, pillY + 5);
    ctx.restore();
  }

  renderDebugOverlay(ctx, width, height, design, hasValidAnchor, telemetry, trackingResult) {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(10, height - 175, 230, 145);
    ctx.fillStyle = '#10b981';
    ctx.font = '11px monospace';
    ctx.textAlign = 'left';

    ctx.fillText(`Placement: ${this.placement}`, 18, height - 155);
    ctx.fillText(`Jewelry: ${design?.name || 'none'}`, 18, height - 140);
    ctx.fillText(`Tracker: ${this.targetBodyPart} (${trackingResult ? 'ACTIVE' : 'IDLE'})`, 18, height - 125);
    ctx.fillText(`Anchor: ${hasValidAnchor ? 'VALID' : 'SEARCHING'}`, 18, height - 110);
    if (hasValidAnchor && telemetry.x) {
      ctx.fillText(`X: ${telemetry.x.toFixed(1)}  Y: ${telemetry.y.toFixed(1)}`, 18, height - 95);
      ctx.fillText(`Scale: ${telemetry.scale?.toFixed(1)}  Rot: ${telemetry.rot?.toFixed(2)}`, 18, height - 80);
      ctx.fillText(`Conf: ${(telemetry.confidence * 100).toFixed(0)}%`, 18, height - 65);
    }
    ctx.restore();
  }
}
