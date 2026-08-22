import { ARFilter } from './ARFilter.js';

export class CuteKittyFilter extends ARFilter {
  constructor() {
    super('cute_kitty', 'Cute Kitty', '🐱', 'Cute AR', 'Pointed cat ears with dynamic ear twitching, glowing whiskers, and nose');
  }

  render(ctx, canvas, video, faceGeometry, timestamp = performance.now()) {
    const { width, height } = canvas;
    const time = timestamp / 350;

    // 1. Base video with pink pastel tone
    ctx.save();
    ctx.filter = 'contrast(108%) brightness(104%) saturate(125%)';
    ctx.drawImage(video, 0, 0, width, height);
    ctx.restore();

    if (!faceGeometry) return;

    const {
      leftForeheadTop,
      rightForeheadTop,
      noseTip,
      leftNostril,
      rightNostril,
      leftCheekCenter,
      rightCheekCenter,
      faceWidth,
      roll
    } = faceGeometry;

    const earTwitch = Math.sin(time * 2) > 0.85 ? Math.sin(time * 24) * 0.08 : 0;
    const earSize = faceWidth * 0.32;

    ctx.save();

    // --- Left Cat Ear (Anchored directly to left upper forehead) ---
    ctx.save();
    ctx.translate(leftForeheadTop.x, leftForeheadTop.y);
    ctx.rotate(roll - 0.2 + earTwitch);
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#f472b6';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-earSize * 0.45, earSize * 0.4);
    ctx.lineTo(0, -earSize * 0.85);
    ctx.lineTo(earSize * 0.45, earSize * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#f472b6';
    ctx.beginPath();
    ctx.moveTo(-earSize * 0.28, earSize * 0.35);
    ctx.lineTo(0, -earSize * 0.6);
    ctx.lineTo(earSize * 0.28, earSize * 0.25);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // --- Right Cat Ear (Anchored directly to right upper forehead) ---
    ctx.save();
    ctx.translate(rightForeheadTop.x, rightForeheadTop.y);
    ctx.rotate(roll + 0.2 - earTwitch);
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#f472b6';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(earSize * 0.45, earSize * 0.4);
    ctx.lineTo(0, -earSize * 0.85);
    ctx.lineTo(-earSize * 0.45, earSize * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#f472b6';
    ctx.beginPath();
    ctx.moveTo(earSize * 0.28, earSize * 0.35);
    ctx.lineTo(0, -earSize * 0.6);
    ctx.lineTo(-earSize * 0.28, earSize * 0.25);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // --- Cute Kitty Nose (Anchored directly at noseTip) ---
    ctx.save();
    ctx.translate(noseTip.x, noseTip.y);
    ctx.rotate(roll);
    ctx.fillStyle = '#fb7185';
    ctx.shadowColor = 'rgba(251, 113, 133, 0.6)';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(-14, -6);
    ctx.lineTo(14, -6);
    ctx.lineTo(0, 10);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // --- Soft Pink Blush on Cheeks ---
    ctx.save();
    ctx.fillStyle = 'rgba(251, 113, 133, 0.3)';
    ctx.beginPath();
    ctx.ellipse(leftCheekCenter.x, leftCheekCenter.y, faceWidth * 0.12, faceWidth * 0.08, roll, 0, Math.PI * 2);
    ctx.ellipse(rightCheekCenter.x, rightCheekCenter.y, faceWidth * 0.12, faceWidth * 0.08, roll, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // --- Whiskers radiating from nostrils ---
    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
    ctx.shadowBlur = 6;

    const span = faceWidth * 0.42;

    // Left Whiskers
    ctx.beginPath();
    ctx.moveTo(leftNostril.x - 6, leftNostril.y - 4);
    ctx.lineTo(leftNostril.x - span, leftNostril.y - 18);
    ctx.moveTo(leftNostril.x - 6, leftNostril.y + 4);
    ctx.lineTo(leftNostril.x - span - 4, leftNostril.y + 6);
    ctx.moveTo(leftNostril.x - 6, leftNostril.y + 12);
    ctx.lineTo(leftNostril.x - span + 6, leftNostril.y + 28);

    // Right Whiskers
    ctx.moveTo(rightNostril.x + 6, rightNostril.y - 4);
    ctx.lineTo(rightNostril.x + span, rightNostril.y - 18);
    ctx.moveTo(rightNostril.x + 6, rightNostril.y + 4);
    ctx.lineTo(rightNostril.x + span + 4, rightNostril.y + 6);
    ctx.moveTo(rightNostril.x + 6, rightNostril.y + 12);
    ctx.lineTo(rightNostril.x + span - 6, rightNostril.y + 28);
    ctx.stroke();

    ctx.restore();

    ctx.restore();
  }
}
