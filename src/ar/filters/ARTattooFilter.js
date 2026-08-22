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
      'Hyper-realistic embedded ink AR body tattoo with landmark anchoring, triangle mesh deformation, and skin-tone blending'
    );

    this.placement = 'cheek'; // 'cheek', 'hand', 'stomach', 'thigh'
    this.designIndex = 0;
    this.designs = TATTOO_DESIGNS;
    this.placements = PLACEMENTS;

    // Subsystems
    this.anchors = new TattooAnchors();
    this.material = new TattooMaterial();
    this.meshWarp = new TattooMeshWarp(3, 3); // 3x3 grid = 8 triangles

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

  render(ctx, canvas, video, faceGeometry, timestamp = performance.now()) {
    const { width, height } = canvas;

    // 1. Draw base video feed with subtle natural skin grading
    ctx.save();
    ctx.filter = 'contrast(104%) brightness(102%)';
    ctx.drawImage(video, 0, 0, width, height);
    ctx.restore();

    const design = this.designs[this.designIndex];
    if (!design) return;

    // 2. Calculate landmark-driven position, scale, rotation & surface tilt with adaptive smoothing
    const pose = this.anchors.computePose(
      this.placement,
      faceGeometry,
      width,
      height,
      {
        manualOffsetX: this.manualOffsetX,
        manualOffsetY: this.manualOffsetY,
        manualScale: this.manualScale,
        manualRotation: this.manualRotation
      }
    );

    if (!pose || pose.confidence <= 0.02) return;

    // 3. Sample local skin luminance in the tattoo area for realistic lighting interaction
    const baseSize = 180 * (design.defaultScale || 1.0);
    const bbox = {
      x: pose.x - (baseSize * pose.scale) / 2,
      y: pose.y - (baseSize * pose.scale) / 2,
      w: baseSize * pose.scale,
      h: baseSize * pose.scale
    };
    const skinLuminance = this.material.sampleSkinLuminance(video, bbox);

    // 4. Retrieve or generate cached high-res feathered tattoo texture
    const texture = this.material.getOrCreateTexture(design, 256);

    // 5. Render Tattoo with Surface Mesh Warping & Sub-Surface Ink Material Blending
    ctx.save();

    // Apply realistic multiply ink material
    this.material.applyInkMaterial(ctx, skinLuminance, this.inkIntensity);

    // Render warped triangles onto skin with anatomical foreshortening
    this.meshWarp.renderWarpedMesh(ctx, texture, pose, baseSize, baseSize);

    ctx.restore();

    // 6. Draw on-screen design & placement pill for clear user feedback
    ctx.save();
    ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';

    const pillY = height * 0.88;
    const currentPlacement = this.placements.find((p) => p.id === this.placement) || this.placements[0];

    ctx.fillStyle = 'rgba(15, 15, 22, 0.78)';
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
