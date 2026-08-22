import { ARFilter } from './ARFilter.js';

export class FaceMaskFilter extends ARFilter {
  constructor() {
    super('face_mask', 'Venetian Mask', '🎭', 'AR Props', 'Intricate golden masquerade mask contour fitted to facial landmarks');
  }

  render(ctx, canvas, video, faceGeometry) {
    const { width, height } = canvas;

    // 1. Draw base video with moody cinematic contrast
    ctx.save();
    ctx.filter = 'contrast(115%) brightness(102%) saturate(110%)';
    ctx.drawImage(video, 0, 0, width, height);
    ctx.restore();

    if (!faceGeometry) return;

    const { eyeMidpoint, eyeDistance, faceWidth, roll, noseBridge, leftCenter, rightCenter } = faceGeometry;

    ctx.save();
    ctx.translate(eyeMidpoint.x, eyeMidpoint.y);
    ctx.rotate(roll);

    const maskW = faceWidth * 1.05;
    const maskH = eyeDistance * 1.5;
    const halfW = maskW / 2;

    // Drop shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 6;

    // Golden Masquerade Mask Base
    const goldGrad = ctx.createLinearGradient(-halfW, -maskH / 2, halfW, maskH / 2);
    goldGrad.addColorStop(0, '#fef08a');
    goldGrad.addColorStop(0.3, '#ca8a04');
    goldGrad.addColorStop(0.7, '#eab308');
    goldGrad.addColorStop(1, '#713f12');

    ctx.fillStyle = goldGrad;
    ctx.strokeStyle = '#fef9c3';
    ctx.lineWidth = 3;

    // Mask Contour
    ctx.beginPath();
    // Top center dip
    ctx.moveTo(0, -maskH * 0.2);
    // Top right wing
    ctx.bezierCurveTo(halfW * 0.4, -maskH * 0.7, halfW * 0.8, -maskH * 0.85, halfW, -maskH * 0.35);
    // Right bottom cheek
    ctx.bezierCurveTo(halfW * 0.85, maskH * 0.4, halfW * 0.4, maskH * 0.75, 0, maskH * 0.45);
    // Left bottom cheek
    ctx.bezierCurveTo(-halfW * 0.4, maskH * 0.75, -halfW * 0.85, maskH * 0.4, -halfW, -maskH * 0.35);
    // Top left wing
    ctx.bezierCurveTo(-halfW * 0.8, -maskH * 0.85, -halfW * 0.4, -maskH * 0.7, 0, -maskH * 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Eye cutouts
    ctx.shadowBlur = 0;
    ctx.globalCompositeOperation = 'destination-out';
    const eyeCutoutW = eyeDistance * 0.55;
    const eyeCutoutH = eyeDistance * 0.38;

    // Left Eye cutout
    ctx.beginPath();
    ctx.ellipse(-eyeDistance * 0.52, 0, eyeCutoutW / 2, eyeCutoutH / 2, -0.1, 0, Math.PI * 2);
    ctx.fill();

    // Right Eye cutout
    ctx.beginPath();
    ctx.ellipse(eyeDistance * 0.52, 0, eyeCutoutW / 2, eyeCutoutH / 2, 0.1, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalCompositeOperation = 'source-over';

    // Intricate Filigree Details
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 2;

    // Left eye ring
    ctx.beginPath();
    ctx.ellipse(-eyeDistance * 0.52, 0, eyeCutoutW * 0.58, eyeCutoutH * 0.58, -0.1, 0, Math.PI * 2);
    ctx.stroke();

    // Right eye ring
    ctx.beginPath();
    ctx.ellipse(eyeDistance * 0.52, 0, eyeCutoutW * 0.58, eyeCutoutH * 0.58, 0.1, 0, Math.PI * 2);
    ctx.stroke();

    // Crown jewel in center
    ctx.fillStyle = '#ec4899';
    ctx.shadowColor = '#ec4899';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(0, -maskH * 0.15, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
