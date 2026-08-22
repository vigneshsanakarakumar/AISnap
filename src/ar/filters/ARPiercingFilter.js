import { ARFilter } from './ARFilter.js';
import { DEBUG, NAVEL_DESIGNS } from '../effects/piercing/PiercingConfig.js';
import { PiercingAnchors } from '../effects/piercing/PiercingAnchors.js';
import { PiercingRenderer } from '../effects/piercing/PiercingRenderer.js';

export class ARPiercingFilter extends ARFilter {
  constructor() {
    super(
      'ar_piercing',
      'Navel Piercing Studio',
      '💎',
      'Jewelry',
      'Ultra-realistic 3D Belly Button Piercing preview with pendulum dangle physics and precision torso tracking'
    );

    this.designs = NAVEL_DESIGNS;
    this.designIndex = 0;
    this.sizeMultiplier = 1.0; // 0.8 (small), 1.0 (med), 1.3 (large)
    this.targetBodyPart = 'torso'; // Strictly Pose tracking for torso/stomach

    this.anchors = new PiercingAnchors();
    this.renderer = new PiercingRenderer();
  }

  setDesign(index) {
    this.designIndex = Math.max(0, Math.min(index, this.designs.length - 1));
  }

  setSize(sizeStr) {
    if (sizeStr === 'small') this.sizeMultiplier = 0.8;
    else if (sizeStr === 'large') this.sizeMultiplier = 1.3;
    else this.sizeMultiplier = 1.0;
  }

  render(ctx, canvas, video, trackingResult, timestamp = performance.now()) {
    const { width, height } = canvas;

    // 1. Crystal-clear video stream pass-through with vivid studio color enhancement
    ctx.save();
    ctx.filter = 'contrast(105%) brightness(103%) saturate(108%)';
    ctx.drawImage(video, 0, 0, width, height);
    ctx.restore();

    const activeDesign = this.designs[this.designIndex] || this.designs[0];
    let hasValidRender = false;

    // 2. Extract pose geometry and compute navel anchor
    const poseGeo = trackingResult?.poseGeometry || (trackingResult?.shoulderMid ? trackingResult : null);
    const navelAnchor = this.anchors.computeNavelAnchor(poseGeo, width, height, this.sizeMultiplier, timestamp);

    if (navelAnchor && navelAnchor.opacity > 0.04) {
      this.renderer.renderNavel(ctx, navelAnchor, activeDesign, timestamp);
      hasValidRender = true;
    }

    // 3. User-friendly tracking hint pill only when torso is not in view
    if (!hasValidRender) {
      this.renderHintPill(ctx, width, height, '🧍 Show your torso / stomach to preview');
    }
  }

  renderHintPill(ctx, width, height, text) {
    ctx.save();
    ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    const pillY = height * 0.88;

    ctx.fillStyle = 'rgba(15, 15, 22, 0.8)';
    ctx.beginPath();
    ctx.roundRect(width * 0.5 - 135, pillY - 17, 270, 34, 17);
    ctx.fill();
    ctx.strokeStyle = 'rgba(236, 72, 153, 0.55)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.fillStyle = '#f472b6';
    ctx.fillText(text, width * 0.5, pillY + 5);
    ctx.restore();
  }
}
