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

    const { forehead, faceWidth, roll } = faceGeometry;

    ctx.save();
    // Anchor crown directly onto forehead apex point
    ctx.translate(forehead.x, forehead.y - faceWidth * 0.12);
    ctx.rotate(roll);

    const crownY = Math.sin(time) * 4;

    // 7 Sakura Blossoms positioned across forehead arc
    for (let i = -3; i <= 3; i++) {
      const flowerX = i * (faceWidth * 0.15);
      const flowerY = crownY + Math.abs(i) * 7;

      ctx.save();
      ctx.translate(flowerX, flowerY);
      ctx.rotate(time * 0.4 + i * 0.6);

      ctx.fillStyle = i % 2 === 0 ? '#fbcfe8' : '#f472b6';
      ctx.shadowColor = 'rgba(244, 114, 182, 0.7)';
      ctx.shadowBlur = 10;
      for (let p = 0; p < 5; p++) {
        const angle = (p * Math.PI * 2) / 5;
        ctx.beginPath();
        ctx.arc(Math.cos(angle) * 13, Math.sin(angle) * 13, 9, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(0, 0, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Orbiting Golden Sparkle Petals
    for (let s = 0; s < 8; s++) {
      const sx = Math.cos(time * 0.8 + s * 0.9) * (faceWidth * 0.55);
      const sy = crownY + Math.sin(time * 1.2 + s) * 35;
      ctx.fillStyle = '#fde047';
      ctx.shadowColor = '#fde047';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(sx, sy, 3 + Math.sin(time * 2 + s) * 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}
