import { ARFilter } from './ARFilter.js';

export class NeonEyesFilter extends ARFilter {
  constructor() {
    super('neon_eyes', 'Neon Eyes', '👁️', 'Cyber', 'Electric cybernetic glowing eyes tracking irises in real time');
  }

  render(ctx, canvas, video, faceGeometry, timestamp = performance.now()) {
    const { width, height } = canvas;

    // 1. Draw base video with moody cool tone
    ctx.save();
    ctx.filter = 'contrast(120%) brightness(95%) hue-rotate(190deg) saturate(140%)';
    ctx.drawImage(video, 0, 0, width, height);
    ctx.restore();

    if (!faceGeometry) return;

    const { leftCenter, rightCenter, leftEye, rightEye, eyeDistance } = faceGeometry;
    const time = timestamp / 200;
    const pulse = 1 + Math.sin(time) * 0.15;
    const eyeRadius = (eyeDistance * 0.12) * pulse;

    const drawGlowingEye = (center) => {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';

      // Outer neon aura
      const glowGrad = ctx.createRadialGradient(center.x, center.y, eyeRadius * 0.2, center.x, center.y, eyeRadius * 2.5);
      glowGrad.addColorStop(0, 'rgba(0, 240, 255, 0.9)');
      glowGrad.addColorStop(0.4, 'rgba(6, 182, 212, 0.5)');
      glowGrad.addColorStop(0.8, 'rgba(168, 85, 247, 0.2)');
      glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(center.x, center.y, eyeRadius * 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Sharp glowing iris ring
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(center.x, center.y, eyeRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Inner electric pupil
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(center.x, center.y, eyeRadius * 0.35, 0, Math.PI * 2);
      ctx.fill();

      // Rotating cyber targeting reticle around eye
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.75)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(center.x, center.y, eyeRadius * 1.5, time * 0.5, time * 0.5 + Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    };

    drawGlowingEye(leftCenter);
    drawGlowingEye(rightCenter);
  }
}
