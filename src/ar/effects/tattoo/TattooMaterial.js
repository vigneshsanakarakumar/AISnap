/**
 * TattooMaterial — Realistic Sub-surface Skin Blending & Ink Diffusion
 */

export class TattooMaterial {
  constructor() {
    this.textureCache = new Map();
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCtx = this.offscreenCanvas.getContext('2d');
    this.sampleCanvas = document.createElement('canvas');
    this.sampleCtx = this.sampleCanvas.getContext('2d', { willReadFrequently: true });
    
    this.params = {
      inkOpacity: 0.76,
      inkDensity: 0.85,
      edgeFeather: 2.5,
      skinInfluence: 0.22,
      grainAmount: 0.04
    };
  }

  getOrCreateTexture(design, size = 256) {
    const key = `${design.id}_${size}`;
    if (this.textureCache.has(key)) {
      return this.textureCache.get(key);
    }

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Render clean vector artwork with charcoal ink tone
    ctx.strokeStyle = design.primaryColor || '#111827';
    ctx.fillStyle = design.primaryColor || '#111827';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(15, 23, 42, 0.4)';
    ctx.shadowBlur = 2.0;

    design.renderVectors(ctx, size);

    // Apply micro-feathering on edges
    const featheredCanvas = document.createElement('canvas');
    featheredCanvas.width = size;
    featheredCanvas.height = size;
    const fCtx = featheredCanvas.getContext('2d');
    fCtx.filter = 'blur(0.5px)';
    fCtx.drawImage(canvas, 0, 0);

    this.textureCache.set(key, featheredCanvas);
    return featheredCanvas;
  }

  // Sample local skin luminance from the video feed in the target bounding box
  sampleSkinLuminance(video, bbox) {
    if (!video || video.readyState < 2 || bbox.w <= 0 || bbox.h <= 0) {
      return 0.5;
    }

    try {
      const sw = 16;
      const sh = 16;
      this.sampleCanvas.width = sw;
      this.sampleCanvas.height = sh;

      this.sampleCtx.drawImage(
        video,
        Math.max(0, bbox.x),
        Math.max(0, bbox.y),
        Math.min(video.videoWidth || 640, bbox.w),
        Math.min(video.videoHeight || 480, bbox.h),
        0,
        0,
        sw,
        sh
      );

      const imgData = this.sampleCtx.getImageData(0, 0, sw, sh).data;
      let totalLum = 0;
      let count = 0;

      for (let i = 0; i < imgData.length; i += 4) {
        const r = imgData[i];
        const g = imgData[i + 1];
        const b = imgData[i + 2];
        const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        totalLum += lum;
        count++;
      }

      return count > 0 ? totalLum / count : 0.5;
    } catch (e) {
      return 0.5;
    }
  }

  // Apply composite ink material to destination context
  applyInkMaterial(ctx, skinLuminance = 0.5, userOpacity = 1.0) {
    // Luminance modulation: Under bright light, ink reflects slight undertone; in shadows, ink deepens
    const lumFactor = 0.85 + skinLuminance * 0.3;
    const finalAlpha = Math.min(1.0, this.params.inkOpacity * userOpacity * lumFactor);

    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = finalAlpha;
    ctx.filter = 'none';
  }
}
