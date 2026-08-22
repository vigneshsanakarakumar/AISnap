import { ARFilter } from './ARFilter.js';

export class GoldenHourFilter extends ARFilter {
  constructor() {
    super('golden_hour', 'Golden Hour', '🌅', 'Cinematic', 'Warm sunset tones, golden skin warmth, and anamorphic lens flare');
  }

  render(ctx, canvas, video, faceGeometry, timestamp = performance.now()) {
    const { width, height } = canvas;
    const time = timestamp * 0.001;

    // 1. Warm sunset color grading
    ctx.save();
    ctx.filter = 'sepia(35%) saturate(145%) contrast(110%) brightness(105%)';
    ctx.drawImage(video, 0, 0, width, height);
    ctx.restore();

    // 2. Golden ambient lighting gradient
    ctx.save();
    ctx.globalCompositeOperation = 'soft-light';
    const sunsetGrad = ctx.createLinearGradient(0, 0, width, height);
    sunsetGrad.addColorStop(0, 'rgba(251, 146, 60, 0.45)');  // Warm amber
    sunsetGrad.addColorStop(0.5, 'rgba(234, 179, 8, 0.35)');  // Golden
    sunsetGrad.addColorStop(1, 'rgba(236, 72, 153, 0.25)');  // Pink dusk
    ctx.fillStyle = sunsetGrad;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    // 3. Dynamic Sun Flare
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const flareX = width * 0.15 + Math.sin(time * 0.5) * 20;
    const flareY = height * 0.15 + Math.cos(time * 0.5) * 15;
    
    // Main Sun Glow
    const sunGrad = ctx.createRadialGradient(flareX, flareY, 10, flareX, flareY, width * 0.6);
    sunGrad.addColorStop(0, 'rgba(254, 240, 138, 0.8)');
    sunGrad.addColorStop(0.2, 'rgba(251, 191, 36, 0.4)');
    sunGrad.addColorStop(0.5, 'rgba(249, 115, 22, 0.15)');
    sunGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = sunGrad;
    ctx.fillRect(0, 0, width, height);

    // Anamorphic horizontal light streak
    ctx.fillStyle = 'rgba(254, 240, 138, 0.25)';
    ctx.beginPath();
    ctx.ellipse(flareX, flareY, width * 0.7, 12, 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 4. Highlight face if present
    if (faceGeometry) {
      const { forehead, faceWidth } = faceGeometry;
      ctx.save();
      ctx.globalCompositeOperation = 'overlay';
      const faceSun = ctx.createRadialGradient(forehead.x, forehead.y, 10, forehead.x, forehead.y, faceWidth * 0.8);
      faceSun.addColorStop(0, 'rgba(254, 215, 170, 0.3)');
      faceSun.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = faceSun;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }
  }
}
