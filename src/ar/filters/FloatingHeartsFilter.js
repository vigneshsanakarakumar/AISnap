import { ARFilter } from './ARFilter.js';

export class FloatingHeartsFilter extends ARFilter {
  constructor() {
    super('floating_hearts', 'Floating Hearts', '💖', 'Fun', 'Floating romantic heart particles responding to face movements');
    this.hearts = [];
    for (let i = 0; i < 22; i++) {
      this.hearts.push({
        relX: (Math.random() - 0.5) * 1.8,
        relY: Math.random() * 1.5,
        speedY: 0.8 + Math.random() * 1.2,
        size: 14 + Math.random() * 16,
        color: ['#f43f5e', '#ec4899', '#f472b6', '#fda4af'][Math.floor(Math.random() * 4)],
        wobbleSpeed: 0.003 + Math.random() * 0.004,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  render(ctx, canvas, video, faceGeometry, timestamp = performance.now()) {
    const { width, height } = canvas;

    // 1. Draw base video with sweet pastel warmth
    ctx.save();
    ctx.filter = 'saturate(130%) brightness(106%) contrast(104%)';
    ctx.drawImage(video, 0, 0, width, height);
    ctx.restore();

    if (!faceGeometry) return;

    const { eyeMidpoint, faceWidth, roll } = faceGeometry;

    ctx.save();
    ctx.translate(eyeMidpoint.x, eyeMidpoint.y);
    ctx.rotate(roll);

    const drawHeart = (x, y, size, color) => {
      ctx.save();
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.bezierCurveTo(x - size / 2, y - size / 2, x - size, y + size / 3, x, y + size);
      ctx.bezierCurveTo(x + size, y + size / 3, x + size / 2, y - size / 2, x, y);
      ctx.fill();
      ctx.restore();
    };

    this.hearts.forEach((h) => {
      // Floating upward cycle
      const currentY = ((-h.relY * faceWidth) - (timestamp * h.speedY * 0.05)) % (faceWidth * 1.8);
      const wobbleX = h.relX * faceWidth + Math.sin(timestamp * h.wobbleSpeed + h.phase) * 20;

      drawHeart(wobbleX, currentY, h.size, h.color);
    });

    ctx.restore();
  }
}
