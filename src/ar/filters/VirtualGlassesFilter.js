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

    const { eyeMidpoint, eyeDistance, roll } = faceGeometry;

    // Glasses dimensions calculated from eye distance
    const glassesWidth = eyeDistance * 2.3;
    const glassesHeight = glassesWidth * 0.42;
    const lensWidth = glassesWidth * 0.42;
    const lensHeight = glassesHeight * 0.85;
    const bridgeWidth = glassesWidth * 0.16;

    ctx.save();
    // Anchor to eye midpoint & rotate with head roll
    ctx.translate(eyeMidpoint.x, eyeMidpoint.y);
    ctx.rotate(roll);

    // Drop shadow behind glasses
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 6;

    // Frame Outline (Glossy Dark Chrome)
    const frameGrad = ctx.createLinearGradient(-glassesWidth / 2, -glassesHeight / 2, glassesWidth / 2, glassesHeight / 2);
    frameGrad.addColorStop(0, '#18181b');
    frameGrad.addColorStop(0.5, '#3f3f46');
    frameGrad.addColorStop(1, '#09090b');

    // Left Lens & Frame
    const leftX = -(bridgeWidth / 2 + lensWidth);
    const leftY = -lensHeight / 2;

    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = Math.max(2.5, glassesWidth * 0.025);

    // Left Frame
    ctx.beginPath();
    ctx.roundRect(leftX, leftY, lensWidth, lensHeight, [18, 18, 24, 24]);
    ctx.fill();
    ctx.stroke();

    // Right Frame
    const rightX = bridgeWidth / 2;
    const rightY = -lensHeight / 2;

    ctx.beginPath();
    ctx.roundRect(rightX, rightY, lensWidth, lensHeight, [18, 18, 24, 24]);
    ctx.fill();
    ctx.stroke();

    // Bridge
    ctx.beginPath();
    ctx.moveTo(-bridgeWidth / 2, -lensHeight * 0.2);
    ctx.quadraticCurveTo(0, -lensHeight * 0.45, bridgeWidth / 2, -lensHeight * 0.2);
    ctx.stroke();

    // Side temples (arms)
    ctx.beginPath();
    ctx.moveTo(leftX, leftY + lensHeight * 0.2);
    ctx.lineTo(leftX - glassesWidth * 0.15, leftY + lensHeight * 0.1);
    ctx.moveTo(rightX + lensWidth, rightY + lensHeight * 0.2);
    ctx.lineTo(rightX + lensWidth + glassesWidth * 0.15, rightY + lensHeight * 0.1);
    ctx.stroke();

    // Lens Gradient Tint (Sunset Amber / Cyan polarized)
    ctx.shadowBlur = 0;
    const lensTint = ctx.createLinearGradient(0, -lensHeight / 2, 0, lensHeight / 2);
    lensTint.addColorStop(0, 'rgba(56, 189, 248, 0.45)');
    lensTint.addColorStop(0.5, 'rgba(168, 85, 247, 0.4)');
    lensTint.addColorStop(1, 'rgba(236, 72, 153, 0.35)');

    ctx.fillStyle = lensTint;
    ctx.beginPath();
    ctx.roundRect(leftX + 2, leftY + 2, lensWidth - 4, lensHeight - 4, [16, 16, 22, 22]);
    ctx.roundRect(rightX + 2, rightY + 2, lensWidth - 4, lensHeight - 4, [16, 16, 22, 22]);
    ctx.fill();

    // Specular Glare Reflection on Lenses
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(leftX + 12, leftY + 10);
    ctx.lineTo(leftX + lensWidth * 0.45, leftY + lensHeight - 12);
    ctx.moveTo(rightX + 12, rightY + 10);
    ctx.lineTo(rightX + lensWidth * 0.45, rightY + lensHeight - 12);
    ctx.stroke();

    ctx.restore();
  }
}
