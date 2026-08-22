import { ARFilter } from './ARFilter.js';

export class SparkleFaceFilter extends ARFilter {
  constructor() {
    super('sparkle_face', 'Sparkle Face', '✨', 'Beauty', 'Glittering sparkle particles responding to facial movements');
    this.particles = [];
    for (let i = 0; i < 28; i++) {
      this.particles.push({
        relX: (Math.random() - 0.5) * 1.8,
        relY: (Math.random() - 0.5) * 1.6,
        size: 3 + Math.random() * 5,
        speed: 0.002 + Math.random() * 0.004,
        phase: Math.random() * Math.PI * 2,
        color: ['#fde047', '#f472b6', '#38bdf8', '#ffffff'][Math.floor(Math.random() * 4)]
      });
    }
  }

  render(ctx, canvas, video, faceGeometry, timestamp = performance.now()) {
    const { width, height } = canvas;

    // 1. Draw base video with dreamy glow
    ctx.save();
    ctx.filter = 'brightness(108%) contrast(105%) saturate(120%)';
    ctx.drawImage(video, 0, 0, width, height);
    ctx.restore();

    if (!faceGeometry) return;

    const { eyeMidpoint, faceWidth, faceHeight, roll } = faceGeometry;
    const time = timestamp * 0.003;

    ctx.save();
    ctx.translate(eyeMidpoint.x, eyeMidpoint.y);
    ctx.rotate(roll);

    this.particles.forEach((p) => {
      const alpha = 0.5 + 0.5 * Math.sin(time * 3 + p.phase);
      const px = p.relX * (faceWidth * 0.6) + Math.cos(time + p.phase) * 8;
      const py = p.relY * (faceHeight * 0.5) + Math.sin(time + p.phase) * 8;
      const pSize = p.size * (0.8 + 0.4 * Math.sin(time * 2 + p.phase));

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 10;

      // Draw 4-point sparkle star
      ctx.beginPath();
      ctx.moveTo(px, py - pSize * 2);
      ctx.quadraticCurveTo(px, py, px + pSize * 2, py);
      ctx.quadraticCurveTo(px, py, px, py + pSize * 2);
      ctx.quadraticCurveTo(px, py, px - pSize * 2, py);
      ctx.quadraticCurveTo(px, py, px, py - pSize * 2);
      ctx.fill();

      // Center bright core
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(px, py, pSize * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    ctx.restore();
  }
}
