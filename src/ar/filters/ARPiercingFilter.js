import { ARFilter } from './ARFilter.js';
import { DEBUG, PLACEMENTS, getDesignsForPlacement } from '../effects/piercing/PiercingConfig.js';
import { PiercingAnchors } from '../effects/piercing/PiercingAnchors.js';
import { PiercingRenderer } from '../effects/piercing/PiercingRenderer.js';

export class ARPiercingFilter extends ARFilter {
  constructor() {
    super(
      'ar_piercing',
      'AR Piercing Studio',
      '💎',
      'Jewelry',
      'Realistic Ear & Navel Piercing AR preview with anatomical tracking and physical metal shading'
    );

    this.placement = 'ear'; // 'ear' | 'navel'
    this.placements = PLACEMENTS;
    this.designIndex = 0;
    this.sizeMultiplier = 1.0; // 0.8 (small), 1.0 (med), 1.3 (large)
    this.targetBodyPart = 'face'; // 'face' or 'torso'

    this.anchors = new PiercingAnchors();
    this.renderer = new PiercingRenderer();
  }

  setPlacement(placeId) {
    if (this.placements.some((p) => p.id === placeId)) {
      this.placement = placeId;
      const meta = this.placements.find((p) => p.id === placeId);
      this.targetBodyPart = meta?.tracker === 'torso' ? 'torso' : 'face';
      this.designIndex = 0;
      this.anchors.reset();
    }
  }

  setDesign(index) {
    const list = getDesignsForPlacement(this.placement);
    this.designIndex = Math.max(0, Math.min(index, list.length - 1));
  }

  setSize(sizeStr) {
    if (sizeStr === 'small') this.sizeMultiplier = 0.8;
    else if (sizeStr === 'large') this.sizeMultiplier = 1.3;
    else this.sizeMultiplier = 1.0;
  }

  render(ctx, canvas, video, trackingResult, timestamp = performance.now()) {
    const { width, height } = canvas;

    // 1. Clean camera feed pass-through with subtle studio grading
    ctx.save();
    ctx.filter = 'contrast(104%) brightness(102%)';
    ctx.drawImage(video, 0, 0, width, height);
    ctx.restore();

    const designs = getDesignsForPlacement(this.placement);
    const activeDesign = designs[this.designIndex] || designs[0];

    let hasValidRender = false;

    if (this.placement === 'ear') {
      const faceGeo = trackingResult?.faceGeometry || (trackingResult?.eyeMidpoint ? trackingResult : null);
      const earAnchors = this.anchors.computeEarAnchors(faceGeo, width, height, this.sizeMultiplier, timestamp);
      if (earAnchors && (earAnchors.left?.opacity > 0.05 || earAnchors.right?.opacity > 0.05)) {
        this.renderer.renderEar(ctx, earAnchors, activeDesign);
        hasValidRender = true;
      }
    } else if (this.placement === 'navel') {
      const poseGeo = trackingResult?.poseGeometry || (trackingResult?.shoulderMid ? trackingResult : null);
      const navelAnchor = this.anchors.computeNavelAnchor(poseGeo, width, height, this.sizeMultiplier, timestamp);
      if (navelAnchor && navelAnchor.opacity > 0.05) {
        this.renderer.renderNavel(ctx, navelAnchor, activeDesign);
        hasValidRender = true;
      }
    }

    // 2. User-friendly tracking hint pill only when subject is not tracked
    if (!hasValidRender) {
      const hint = this.placement === 'navel' ? 'Show your torso to preview' : 'Keep your face visible';
      this.renderHintPill(ctx, width, height, hint);
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
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.fillStyle = '#f472b6';
    ctx.fillText(text, width * 0.5, pillY + 5);
    ctx.restore();
  }
}
