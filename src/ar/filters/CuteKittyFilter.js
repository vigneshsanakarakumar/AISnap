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

    const { eyeMidpoint, faceWidth, faceHeight, roll, noseTip } = faceGeometry;
    const earTwitch = Math.sin(time * 2) > 0.85 ? Math.sin(time * 24) * 0.08 : 0;

    ctx.save();
    ctx.translate(eyeMidpoint.x, eyeMidpoint.y);
    ctx.rotate(roll);

    const earSpan = faceWidth * 0.42;
    const earY = -faceHeight * 0.6;
    const earSize = faceWidth * 0.28;

    // Left Ear
    ctx.save();
    ctx.translate(-earSpan, earY);
    ctx.rotate(-0.15 + earTwitch);
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#f472b6';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-earSize * 0.5, earSize * 0.6);
    ctx.lineTo(0, -earSize * 0.8);
    ctx.lineTo(earSize * 0.5, earSize * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#f472b6';
    ctx.beginPath();
    ctx.moveTo(-earSize * 0.3, earSize * 0.5);
    ctx.lineTo(0, -earSize * 0.55);
    ctx.lineTo(earSize * 0.3, earSize * 0.45);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Right Ear
    ctx.save();
    ctx.translate(earSpan, earY);
    ctx.rotate(0.15 - earTwitch);
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#f472b6';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(earSize * 0.5, earSize * 0.6);
    ctx.lineTo(0, -earSize * 0.8);
    ctx.lineTo(-earSize * 0.5, earSize * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#f472b6';
    ctx.beginPath();
    ctx.moveTo(earSize * 0.3, earSize * 0.5);
    ctx.lineTo(0, -earSize * 0.55);
    ctx.lineTo(-earSize * 0.3, earSize * 0.45);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Cute Kitty Nose
    const relNoseY = noseTip.y - eyeMidpoint.y;
    ctx.fillStyle = '#fb7185';
    ctx.shadowColor = 'rgba(251, 113, 133, 0.6)';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(-16, relNoseY - 8);
    ctx.lineTo(16, relNoseY - 8);
    ctx.lineTo(0, relNoseY + 12);
    ctx.closePath();
    ctx.fill();

    // Whiskers
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
    ctx.shadowBlur = 6;

    const whiskerSpan = faceWidth * 0.45;
    ctx.beginPath();
    ctx.moveTo(-25, relNoseY);
    ctx.lineTo(-whiskerSpan, relNoseY - 14);
    ctx.moveTo(-25, relNoseY + 8);
    ctx.lineTo(-whiskerSpan - 6, relNoseY + 10);
    ctx.moveTo(-25, relNoseY + 16);
    ctx.lineTo(-whiskerSpan + 4, relNoseY + 34);

    ctx.moveTo(25, relNoseY);
    ctx.lineTo(whiskerSpan, relNoseY - 14);
    ctx.moveTo(25, relNoseY + 8);
    ctx.lineTo(whiskerSpan + 6, relNoseY + 10);
    ctx.moveTo(25, relNoseY + 16);
    ctx.lineTo(whiskerSpan - 4, relNoseY + 34);
    ctx.stroke();

    ctx.restore();
  }
}
