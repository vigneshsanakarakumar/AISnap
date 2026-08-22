/**
 * PiercingMaterial — Realistic physical metal lighting & shading utilities
 */
import { METAL_PALETTES, GEM_PALETTES } from './PiercingConfig.js';

export class PiercingMaterial {
  constructor() {
    this.ambientIntensity = 1.0;
  }

  getMetalPalette(metalKey = 'silver') {
    return METAL_PALETTES[metalKey] || METAL_PALETTES.silver;
  }

  getGemPalette(gemKey = 'diamond') {
    return GEM_PALETTES[gemKey] || GEM_PALETTES.diamond;
  }

  /**
   * Apply subtle depth lighting modulation
   */
  applyLighting(ctx, anchorConfidence = 1.0) {
    ctx.globalAlpha = Math.max(0, Math.min(1.0, anchorConfidence));
  }
}
