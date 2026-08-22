import { ARFilter } from './ARFilter.js';

export class BackgroundBlurFilter extends ARFilter {
  constructor() {
    super('background_blur', 'Portrait Blur', '🔍', 'Optics', 'DSLR-style shallow depth-of-field portrait background blur centered on subject');
  }

  render(ctx, canvas, video, faceGeometry) {
    const { width, height } = canvas;

    // 1. Draw blurred background pass
    ctx.save();
    ctx.filter = 'blur(16px) brightness(96%)';
    ctx.drawImage(video, 0, 0, width, height);
    ctx.restore();

    // 2. Composite sharp focused foreground where the face/subject is
    if (faceGeometry) {
      const { eyeMidpoint, faceWidth, faceHeight } = faceGeometry;

      ctx.save();
      // Create radial focus mask around the face and shoulders
      const focusRadiusX = faceWidth * 1.1;
      const focusRadiusY = faceHeight * 1.3;
      const centerY = eyeMidpoint.y + faceHeight * 0.2;

      ctx.beginPath();
      ctx.ellipse(eyeMidpoint.x, centerY, focusRadiusX, focusRadiusY, 0, 0, Math.PI * 2);
      ctx.clip();

      // Draw sharp video inside the focus region
      ctx.filter = 'brightness(104%) contrast(104%)';
      ctx.drawImage(video, 0, 0, width, height);
      ctx.restore();

      // Soft feathered transition ring
      ctx.save();
      const featherGrad = ctx.createRadialGradient(
        eyeMidpoint.x,
        centerY,
        focusRadiusX * 0.6,
        eyeMidpoint.x,
        centerY,
        focusRadiusX * 1.3
      );
      featherGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      featherGrad.addColorStop(1, 'rgba(0, 0, 0, 0.25)');
      ctx.fillStyle = featherGrad;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    } else {
      // Fallback center focus if face not yet acquired
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(width / 2, height / 2, width * 0.35, height * 0.45, 0, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(video, 0, 0, width, height);
      ctx.restore();
    }
  }
}
