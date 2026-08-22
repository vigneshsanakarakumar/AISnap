import { ARFilter } from './ARFilter.js';

export class SoftGlowFilter extends ARFilter {
  constructor() {
    super('soft_glow', 'Soft Glow', '✨', 'Beauty', 'Cinematic soft lighting, bloom, and subtle skin glow');
  }

  render(ctx, canvas, video, faceGeometry) {
    const { width, height } = canvas;

    // 1. Draw base video with enhanced color grade
    ctx.save();
    ctx.filter = 'brightness(106%) contrast(104%) saturate(115%)';
    ctx.drawImage(video, 0, 0, width, height);
    ctx.restore();

    // 2. Soft Bloom overlay pass
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.filter = 'blur(16px) brightness(110%)';
    ctx.globalAlpha = 0.22;
    ctx.drawImage(video, 0, 0, width, height);
    ctx.restore();

    // 3. Subtle face highlight aura if face is detected
    if (faceGeometry) {
      const { eyeMidpoint, faceWidth } = faceGeometry;
      ctx.save();
      ctx.globalCompositeOperation = 'overlay';
      const aura = ctx.createRadialGradient(
        eyeMidpoint.x,
        eyeMidpoint.y,
        faceWidth * 0.2,
        eyeMidpoint.x,
        eyeMidpoint.y,
        faceWidth * 0.9
      );
      aura.addColorStop(0, 'rgba(255, 240, 220, 0.25)');
      aura.addColorStop(0.6, 'rgba(255, 200, 180, 0.1)');
      aura.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = aura;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    // 4. Subtle cinematic vignette
    ctx.save();
    const vignette = ctx.createRadialGradient(
      width / 2,
      height / 2,
      Math.min(width, height) * 0.45,
      width / 2,
      height / 2,
      Math.max(width, height) * 0.75
    );
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(10, 5, 20, 0.35)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }
}
