import { ARFilter } from './ARFilter.js';

export class BunnyRabbitFilter extends ARFilter {
  constructor() {
    super('bunny_rabbit', 'Bunny Rabbit', '🐰', 'Cute AR', 'Tall fluffy rabbit ears with wiggling animation, twitchy nose, and cheek blush');
  }

  render(ctx, canvas, video, faceGeometry, timestamp = performance.now()) {
    const { width, height } = canvas;
    const time = timestamp / 350;

    // 1. Soft bright beauty grade
    ctx.save();
    ctx.filter = 'contrast(106%) brightness(108%) saturate(120%)';
    ctx.drawImage(video, 0, 0, width, height);
    ctx.restore();

    if (!faceGeometry) return;

    const {
      leftForeheadTop,
      rightForeheadTop,
      noseTip,
      leftCheekCenter,
      rightCheekCenter,
      faceWidth,
      faceHeight,
      roll
    } = faceGeometry;

    const earWiggle = Math.sin(time * 1.8) * 0.04;
    const earW = faceWidth * 0.18;
    const earH = faceHeight * 0.55;

    ctx.save();

    // --- Left Bunny Ear (Anchored to leftForeheadTop) ---
    ctx.save();
    ctx.translate(leftForeheadTop.x, leftForeheadTop.y);
    ctx.rotate(roll - 0.12 + earWiggle);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#f472b6';
    ctx.lineWidth = 3.5;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.ellipse(0, -earH * 0.45, earW / 2, earH / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fbcfe8';
    ctx.beginPath();
    ctx.ellipse(0, -earH * 0.42, earW * 0.3, earH * 0.36, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // --- Right Bunny Ear (Anchored to rightForeheadTop) ---
    ctx.save();
    ctx.translate(rightForeheadTop.x, rightForeheadTop.y);
    ctx.rotate(roll + 0.12 - earWiggle);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#f472b6';
    ctx.lineWidth = 3.5;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.ellipse(0, -earH * 0.45, earW / 2, earH / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fbcfe8';
    ctx.beginPath();
    ctx.ellipse(0, -earH * 0.42, earW * 0.3, earH * 0.36, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // --- Bunny Nose (Anchored directly at noseTip) ---
    ctx.save();
    ctx.translate(noseTip.x, noseTip.y);
    ctx.rotate(roll);
    ctx.fillStyle = '#fb7185';
    ctx.beginPath();
    ctx.ellipse(0, 0, 14, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // --- Rosy Cheeks Blush ---
    ctx.save();
    ctx.fillStyle = 'rgba(251, 113, 133, 0.35)';
    ctx.beginPath();
    ctx.ellipse(leftCheekCenter.x, leftCheekCenter.y, faceWidth * 0.12, faceWidth * 0.08, roll, 0, Math.PI * 2);
    ctx.ellipse(rightCheekCenter.x, rightCheekCenter.y, faceWidth * 0.12, faceWidth * 0.08, roll, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.restore();
  }
}
