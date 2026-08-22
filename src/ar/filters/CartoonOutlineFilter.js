import { ARFilter } from './ARFilter.js';

export class CartoonOutlineFilter extends ARFilter {
  constructor() {
    super('cartoon_outline', 'Cartoon Outline', '💥', 'Artistic', 'Pop-art comic book cel-shading with stylized high-contrast ink outlines');
    this.offscreenCanvas = null;
  }

  render(ctx, canvas, video, faceGeometry) {
    const { width, height } = canvas;

    // 1. Draw saturated, contrasty comic color base
    ctx.save();
    ctx.filter = 'saturate(280%) contrast(155%) brightness(105%)';
    ctx.drawImage(video, 0, 0, width, height);
    ctx.restore();

    // 2. Comic Halftone Dots
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.07)';
    const dotSpacing = 16;
    for (let x = 0; x < width; x += dotSpacing) {
      for (let y = 0; y < height; y += dotSpacing) {
        ctx.beginPath();
        ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();

    // 3. Stylized Face Inking Outlines if face detected
    if (faceGeometry) {
      const { chin, forehead, leftCheek, rightCheek, leftEye, rightEye, noseTip, upperLip, lowerLip, mouthLeft, mouthRight } = faceGeometry;

      ctx.save();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Face Oval Outline
      ctx.beginPath();
      ctx.moveTo(forehead.x, forehead.y);
      ctx.bezierCurveTo(leftCheek.x - 15, forehead.y + 40, leftCheek.x - 15, chin.y - 40, chin.x, chin.y);
      ctx.bezierCurveTo(rightCheek.x + 15, chin.y - 40, rightCheek.x + 15, forehead.y + 40, forehead.x, forehead.y);
      ctx.stroke();

      // Comic Eyes Outline
      ctx.beginPath();
      ctx.arc(leftEye.x, leftEye.y, 14, 0, Math.PI * 2);
      ctx.arc(rightEye.x, rightEye.y, 14, 0, Math.PI * 2);
      ctx.stroke();

      // Comic Nose Contour
      ctx.beginPath();
      ctx.moveTo(noseTip.x - 8, noseTip.y + 4);
      ctx.lineTo(noseTip.x, noseTip.y + 8);
      ctx.lineTo(noseTip.x + 8, noseTip.y + 4);
      ctx.stroke();

      // Comic Lips Outline
      ctx.beginPath();
      ctx.moveTo(mouthLeft.x, mouthLeft.y);
      ctx.quadraticCurveTo((upperLip.x + lowerLip.x) / 2, upperLip.y, mouthRight.x, mouthRight.y);
      ctx.quadraticCurveTo((upperLip.x + lowerLip.x) / 2, lowerLip.y + 6, mouthLeft.x, mouthLeft.y);
      ctx.stroke();

      ctx.restore();
    }
  }
}
