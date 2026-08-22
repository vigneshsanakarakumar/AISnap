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

    const { eyeMidpoint, faceWidth, faceHeight, roll, noseTip } = faceGeometry;
    const earWiggle = Math.sin(time * 1.8) * 0.04;

    ctx.save();
    ctx.translate(eyeMidpoint.x, eyeMidpoint.y);
    ctx.rotate(roll);

    const earSpan = faceWidth * 0.32;
    const earY = -faceHeight * 0.72;
    const earW = faceWidth * 0.16;
    const earH = faceHeight * 0.52;

    // Left Bunny Ear
    ctx.save();
    ctx.translate(-earSpan, earY);
    ctx.rotate(-0.12 + earWiggle);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#f472b6';
    ctx.lineWidth = 3.5;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.ellipse(0, 0, earW / 2, earH / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fbcfe8';
    ctx.beginPath();
    ctx.ellipse(0, 6, earW * 0.32, earH * 0.36, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Right Bunny Ear
    ctx.save();
    ctx.translate(earSpan, earY);
    ctx.rotate(0.12 - earWiggle);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#f472b6';
    ctx.lineWidth = 3.5;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.ellipse(0, 0, earW / 2, earH / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fbcfe8';
    ctx.beginPath();
    ctx.ellipse(0, 6, earW * 0.32, earH * 0.36, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Bunny Twitchy Nose
    const relNoseY = noseTip.y - eyeMidpoint.y;
    ctx.fillStyle = '#fb7185';
    ctx.beginPath();
    ctx.ellipse(0, relNoseY + 4, 15, 11, 0, 0, Math.PI * 2);
    ctx.fill();

    // Rosy Cheeks
    ctx.fillStyle = 'rgba(251, 113, 133, 0.35)';
    ctx.beginPath();
    ctx.ellipse(-faceWidth * 0.34, relNoseY + 12, 28, 16, 0, 0, Math.PI * 2);
    ctx.ellipse(faceWidth * 0.34, relNoseY + 12, 28, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
