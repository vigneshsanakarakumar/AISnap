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
      'Ultra-realistic 3D Belly Button & Navel Piercing AR preview with precision torso tracking and physical metal shading'
    );

    this.designs = NAVEL_DESIGNS;
    this.designIndex = 0;
    this.sizeMultiplier = 1.0; // 0.8 (small), 1.0 (med), 1.3 (large)

    // Strictly PoseLandmarker tracking for torso/stomach
    this.targetBodyPart = 'torso';

    // Subsystems
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

    // 1. Crystal-clear camera feed pass-through with vivid studio color enhancement
    ctx.save();
    ctx.filter = 'contrast(105%) brightness(103%) saturate(108%)';
    ctx.drawImage(video, 0, 0, width, height);
    ctx.restore();

    const activeDesign = this.designs[this.designIndex] || this.designs[0];
    let hasValidAnchor = false;

    // 2. Extract pose geometry
    const poseGeo = trackingResult?.poseGeometry || (trackingResult?.shoulderMid ? trackingResult : null);
    if (poseGeo) {
      const navelAnchor = this.anchors.computeNavelAnchor(poseGeo, width, height, this.sizeMultiplier);
      if (navelAnchor && navelAnchor.confidence > 0.08) {
        this.renderer.renderNavel(ctx, navelAnchor, activeDesign, timestamp);
        hasValidAnchor = true;
      }
    }

    // 3. Helpful tracking guidance if torso is not detected
    if (!hasValidAnchor) {
      this.renderHintPill(ctx, width, height, '🧍 Point camera at stomach to preview');
    }

    // 4. Debug overlay if enabled
    if (DEBUG) {
      this.renderDebugOverlay(ctx, width, height, activeDesign, hasValidAnchor, trackingResult);
    }
  }

  renderHintPill(ctx, width, height, text) {
    ctx.save();
    ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    const pillY = height * 0.88;

    ctx.fillStyle = 'rgba(15, 15, 22, 0.78)';
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

  renderDebugOverlay(ctx, width, height, design, hasValidAnchor, trackingResult) {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(10, height - 150, 220, 120);
    ctx.fillStyle = '#10b981';
    ctx.font = '11px monospace';
    ctx.textAlign = 'left';

    ctx.fillText(`Jewelry: ${design?.name || 'none'}`, 18, height - 125);
    ctx.fillText(`Tracker: Pose / Torso`, 18, height - 110);
    ctx.fillText(`Status: ${hasValidAnchor ? 'LOCKED' : 'SEARCHING'}`, 18, height - 95);
    ctx.fillText(`Active: ${trackingResult ? 'YES' : 'NO'}`, 18, height - 80);
    ctx.restore();
  }
}
