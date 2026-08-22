import { ARFilter } from './ARFilter.js';

export class VirtualGlassesFilter extends ARFilter {
  constructor() {
    super('virtual_glasses', 'Virtual Glasses', '🕶️', 'AR Props', '3D perspective sunglasses anchored to face tilt and eye distance');
  }

  render(ctx, canvas, video, faceGeometry) {
    const { width, height } = canvas;

    // 1. Draw raw video
    ctx.drawImage(video, 0, 0, width, height);

    if (!faceGeometry) return;

    const { leftCenter, rightCenter, noseBridge, eyeDistance, roll, yaw } = faceGeometry;

    // Glasses dimensions calculated with precision from pupil landmarks
    const lensRadius = eyeDistance * 0.38;
    const lensWidth = eyeDistance * 0.82;
    const lensHeight = lensRadius * 1.55;

    ctx.save();
    // Anchor to exact noseBridge and rotate with roll
    ctx.translate(noseBridge.x, noseBridge.y);
    ctx.rotate(roll);

    // Drop shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 6;

    // Frame Outline (Sleek Aviator Dark Chrome)
    const leftOffsetX = -eyeDistance * 0.52;
    const rightOffsetX = eyeDistance * 0.52;

    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = Math.max(3, eyeDistance * 0.045);

    // Left Frame
    ctx.beginPath();
    ctx.roundRect(leftOffsetX - lensWidth / 2, -lensHeight * 0.45, lensWidth, lensHeight, [16, 16, 24, 24]);
    ctx.fill();
    ctx.stroke();

    // Right Frame
    ctx.beginPath();
    ctx.roundRect(rightOffsetX - lensWidth / 2, -lensHeight * 0.45, lensWidth, lensHeight, [16, 16, 24, 24]);
    ctx.fill();
    ctx.stroke();

    // Double Aviator Bridge
    ctx.beginPath();
    ctx.moveTo(leftOffsetX + lensWidth / 2, -lensHeight * 0.25);
    ctx.lineTo(rightOffsetX - lensWidth / 2, -lensHeight * 0.25);
    ctx.moveTo(leftOffsetX + lensWidth * 0.4, -lensHeight * 0.42);
    ctx.lineTo(rightOffsetX - lensWidth * 0.4, -lensHeight * 0.42);
    ctx.stroke();

    // Polarized Gradient Tint (Sunset Amber / Cyan polarized)
    ctx.shadowBlur = 0;
    const lensTint = ctx.createLinearGradient(0, -lensHeight / 2, 0, lensHeight / 2);
    lensTint.addColorStop(0, 'rgba(56, 189, 248, 0.6)');
    lensTint.addColorStop(0.5, 'rgba(168, 85, 247, 0.55)');
    lensTint.addColorStop(1, 'rgba(236, 72, 153, 0.5)');

    ctx.fillStyle = lensTint;
    ctx.beginPath();
    ctx.roundRect(leftOffsetX - lensWidth / 2 + 3, -lensHeight * 0.45 + 3, lensWidth - 6, lensHeight - 6, [14, 14, 22, 22]);
    ctx.roundRect(rightOffsetX - lensWidth / 2 + 3, -lensHeight * 0.45 + 3, lensWidth - 6, lensHeight - 6, [14, 14, 22, 22]);
    ctx.fill();

    // Specular Glare Reflection on Lenses
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(leftOffsetX - lensWidth * 0.3, -lensHeight * 0.3);
    ctx.lineTo(leftOffsetX + lensWidth * 0.1, lensHeight * 0.35);
    ctx.moveTo(rightOffsetX - lensWidth * 0.3, -lensHeight * 0.3);
    ctx.lineTo(rightOffsetX + lensWidth * 0.1, lensHeight * 0.35);
    ctx.stroke();

    ctx.restore();
  }
}
