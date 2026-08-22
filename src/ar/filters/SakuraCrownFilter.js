import { ARFilter } from './ARFilter.js';

export class SakuraCrownFilter extends ARFilter {
  constructor() {
    super('sakura_crown', 'Sakura Crown', '🌸', 'Cute AR', 'Floating blooming sakura floral crown with orbiting sparkling petals');
  }

  render(ctx, canvas, video, faceGeometry, timestamp = performance.now()) {
    const { width, height } = canvas;
    const time = timestamp / 350;

    // 1. Soft glowing pastel base
    ctx.save();
    ctx.filter = 'contrast(106%) brightness(108%) saturate(135%)';
    ctx.drawImage(video, 0, 0, width, height);
    ctx.restore();

    if (!faceGeometry) return;

    const { eyeMidpoint, faceWidth, faceHeight, roll } = faceGeometry;

    ctx.save();
    ctx.translate(eyeMidpoint.x, eyeMidpoint.y);
    ctx.rotate(roll);

    const crownY = -faceHeight * 0.6 + Math.sin(time) * 6;

    // 7 Sakura Blossoms arc
    for (let i = -3; i <= 3; i++) {
      const flowerX = i * (faceWidth * 0.16);
      const flowerY = crownY + Math.abs(i) * 8;

      ctx.save();
      ctx.translate(flowerX, flowerY);
      ctx.rotate(time * 0.4 + i * 0.6);

      ctx.fillStyle = i % 2 === 0 ? '#fbcfe8' : '#f472b6';
      ctx.shadowColor = 'rgba(244, 114, 182, 0.6)';
      ctx.shadowBlur = 8;
      for (let p = 0; p < 5; p++) {
        const angle = (p * Math.PI * 2) / 5;
        ctx.beginPath();
        ctx.arc(Math.cos(angle) * 14, Math.sin(angle) * 14, 10, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Orbiting Golden Sparkle Petals
    for (let s = 0; s < 8; s++) {
      const sx = Math.cos(time * 0.8 + s * 0.9) * (faceWidth * 0.65);
      const sy = crownY + Math.sin(time * 1.2 + s) * 45;
      ctx.fillStyle = '#fde047';
      ctx.shadowColor = '#fde047';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(sx, sy, 3.5 + Math.sin(time * 2 + s) * 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}
