import { ARFilter } from './ARFilter.js';

export class MirrorKaleidoscopeFilter extends ARFilter {
  constructor() {
    super('mirror_kaleidoscope', 'Kaleidoscope', '🔮', 'Artistic', 'Faceted geometric kaleidoscope radial mirror transformation');
  }

  render(ctx, canvas, video, faceGeometry, timestamp = performance.now()) {
    const { width, height } = canvas;
    const cx = width / 2;
    const cy = height / 2;
    const time = timestamp * 0.0008;

    const segments = 8;
    const angleStep = (Math.PI * 2) / segments;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(time);

    // Save clip path for 1 triangular wedge segment
    const radius = Math.hypot(width, height) / 2;

    for (let i = 0; i < segments; i++) {
      ctx.save();
      ctx.rotate(i * angleStep);

      if (i % 2 === 1) {
        ctx.scale(1, -1);
      }

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(radius * Math.cos(-angleStep / 2), radius * Math.sin(-angleStep / 2));
      ctx.lineTo(radius * Math.cos(angleStep / 2), radius * Math.sin(angleStep / 2));
      ctx.closePath();
      ctx.clip();

      ctx.filter = 'saturate(130%) contrast(115%)';
      ctx.drawImage(video, -cx, -cy, width, height);

      ctx.restore();
    }

    ctx.restore();

    // Subtle vignette & crystal ring overlay
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, Math.min(width, height) * 0.45, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}
