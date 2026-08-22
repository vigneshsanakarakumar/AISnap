import { ARFilter } from './ARFilter.js';
import { TATTOO_DESIGNS, PLACEMENTS } from '../effects/tattoo/TattooConfig.js';
import { TattooAnchors } from '../effects/tattoo/TattooAnchors.js';
import { TattooMaterial } from '../effects/tattoo/TattooMaterial.js';
import { TattooMeshWarp } from '../effects/tattoo/TattooMeshWarp.js';

export class ARTattooFilter extends ARFilter {
  constructor() {
    super(
      'ar_tattoo',
      'AR Tattoo Studio',
      '💉',
      'Artistic',
      'Hyper-realistic embedded ink AR body tattoo with multi-modal MediaPipe tracking, 4x4 triangle mesh deformation, and skin-tone blending'
    );

    this.placement = 'cheek'; // 'cheek', 'hand', 'stomach', 'thigh'
    this.designIndex = 0;
    this.designs = TATTOO_DESIGNS;
    this.placements = PLACEMENTS;

    // Active body tracking target for ARRenderer dispatch
    this.targetBodyPart = 'face';

    // Subsystems
    this.anchors = new TattooAnchors();
    this.material = new TattooMaterial();
    this.meshWarp = new TattooMeshWarp(4, 4); // 4x4 vertices = 3x3 cells = 18 triangles

    // User Interactive Offsets
    this.manualOffsetX = 0;
    this.manualOffsetY = 0;
    this.manualScale = 1.0;
    this.manualRotation = 0;
    this.inkIntensity = 1.0;
  }

  setPlacement(place) {
    if (this.placements.some((p) => p.id === place)) {
      this.placement = place;
      const meta = this.placements.find((p) => p.id === place);
      this.targetBodyPart = meta?.bodyPart || 'face';
    }
  }

  setDesign(index) {
    this.designIndex = index % this.designs.length;
  }

  setManualAdjustments({ offsetX, offsetY, scale, rotation, intensity }) {
    if (offsetX !== undefined) this.manualOffsetX = offsetX;
    if (offsetY !== undefined) this.manualOffsetY = offsetY;
    if (scale !== undefined) this.manualScale = scale;
    if (rotation !== undefined) this.manualRotation = rotation;
    if (intensity !== undefined) this.inkIntensity = intensity;
  }

  render(ctx, canvas, video, trackingResult, timestamp = performance.now()) {
    const { width, height } = canvas;

    // 1. Draw base video feed with natural grading
    ctx.save();
    ctx.filter = 'contrast(104%) brightness(102%)';
    ctx.drawImage(video, 0, 0, width, height);
    ctx.restore();

    const design = this.designs[this.designIndex];
    if (!design) return;

    // 2. Compute landmark-driven pose with real Face/Hand/Pose tracking
    const pose = this.anchors.computePose(
      this.placement,
      trackingResult,
      width,
      height,
      {
        manualOffsetX: this.manualOffsetX,
        manualOffsetY: this.manualOffsetY,
        manualScale: this.manualScale,
        manualRotation: this.manualRotation
      }
    );

    if (!pose || pose.confidence <= 0.02) {
      this.renderTrackingPrompt(ctx, width, height);
      return;
    }

    // 3. Render complete warped tattoo layer in offscreen buffer (Zero seam multiply bug)
    const baseSize = 175 * (design.defaultScale || 1.0);
    const texture = this.material.getOrCreateTexture(design, 256);
    const warpedLayer = this.meshWarp.renderWarpedLayer(texture, pose, baseSize, baseSize);

    if (!warpedLayer) return;

    // 4. Sample local 8x8 skin luminance in target bounding box
    const bbox = {
      x: warpedLayer.x,
      y: warpedLayer.y,
      w: warpedLayer.w,
      h: warpedLayer.h
    };
    const localSkinLum = this.material.sampleLocalSkinLuminance(video, bbox);

    // 5. Composite complete warped tattoo layer onto camera exactly ONCE using multiply
    ctx.save();
    this.material.applyInkMaterial(ctx, localSkinLum, this.inkIntensity * pose.confidence);
    ctx.drawImage(warpedLayer.canvas, warpedLayer.x, warpedLayer.y);
    ctx.restore();

    // 6. Draw on-screen status & placement pill
    this.renderActivePill(ctx, width, height, design);
  }

  renderTrackingPrompt(ctx, width, height) {
    ctx.save();
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    const pillY = height * 0.88;

    ctx.fillStyle = 'rgba(15, 15, 22, 0.75)';
    ctx.beginPath();
    ctx.roundRect(width * 0.5 - 130, pillY - 17, 260, 34, 17);
    ctx.fill();
    ctx.strokeStyle = 'rgba(236, 72, 153, 0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();

    const label = this.placement === 'hand' ? 'Show Hand to Track ✋' : this.placement === 'stomach' ? 'Show Torso to Track 🧍' : this.placement === 'thigh' ? 'Show Leg to Track 🦵' : 'Show Face to Track 😊';
    ctx.fillStyle = '#f472b6';
    ctx.fillText(`🔍 ${label}`, width * 0.5, pillY + 5);
    ctx.restore();
  }

  renderActivePill(ctx, width, height, design) {
    ctx.save();
    ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';

    const pillY = height * 0.88;
    const currentPlacement = this.placements.find((p) => p.id === this.placement) || this.placements[0];

    ctx.fillStyle = 'rgba(15, 15, 22, 0.82)';
    ctx.beginPath();
    ctx.roundRect(width * 0.5 - 135, pillY - 17, 270, 34, 17);
    ctx.fill();
    ctx.strokeStyle = '#ec4899';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.fillText(`💉 ${currentPlacement.label} • ${design.name}`, width * 0.5, pillY + 5);
    ctx.restore();
  }
}
