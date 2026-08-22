import { ARFilter } from './ARFilter.js';

export class PuppyDogFilter extends ARFilter {
  constructor() {
    super('puppy_dog', 'Puppy Dog', '🐶', 'Cute AR', 'Fluffy puppy ears with swaying physics, button nose, and animated tongue');
  }

  render(ctx, canvas, video, faceGeometry, timestamp = performance.now()) {
    const { width, height } = canvas;
    const time = timestamp / 350;

    // 1. Draw warm base video
    ctx.save();
    ctx.filter = 'contrast(106%) brightness(104%) saturate(115%)';
    ctx.drawImage(video, 0, 0, width, height);
    ctx.restore();

    if (!faceGeometry) return;

    const {
      leftEarTop,
      rightEarTop,
      noseTip,
      lowerLip,
      mouthOpen,
      faceWidth,
      faceHeight,
      roll
    } = faceGeometry;

    const earSwing = Math.sin(time) * 0.05;
    const earW = faceWidth * 0.22;
    const earH = faceHeight * 0.38;

    ctx.save();

    // --- Left Puppy Ear (Anchored directly to left upper temple/forehead) ---
    ctx.save();
    ctx.translate(leftEarTop.x, leftEarTop.y);
    ctx.rotate(roll - 0.28 + earSwing);

    const leftEarGrad = ctx.createLinearGradient(-earW / 2, -earH / 2, earW / 2, earH / 2);
    leftEarGrad.addColorStop(0, '#92400e');
    leftEarGrad.addColorStop(0.5, '#b45309');
    leftEarGrad.addColorStop(1, '#78350f');
    ctx.fillStyle = leftEarGrad;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.ellipse(0, 0, earW / 2, earH / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    const leftPinkGrad = ctx.createLinearGradient(0, -earH * 0.3, 0, earH * 0.3);
    leftPinkGrad.addColorStop(0, '#fbcfe8');
    leftPinkGrad.addColorStop(1, '#f472b6');
    ctx.fillStyle = leftPinkGrad;
    ctx.beginPath();
    ctx.ellipse(0, earH * 0.08, earW * 0.28, earH * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // --- Right Puppy Ear (Anchored directly to right upper temple/forehead) ---
    ctx.save();
    ctx.translate(rightEarTop.x, rightEarTop.y);
    ctx.rotate(roll + 0.28 - earSwing);

    const rightEarGrad = ctx.createLinearGradient(-earW / 2, -earH / 2, earW / 2, earH / 2);
    rightEarGrad.addColorStop(0, '#92400e');
    rightEarGrad.addColorStop(0.5, '#b45309');
    rightEarGrad.addColorStop(1, '#78350f');
    ctx.fillStyle = rightEarGrad;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.ellipse(0, 0, earW / 2, earH / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    const rightPinkGrad = ctx.createLinearGradient(0, -earH * 0.3, 0, earH * 0.3);
    rightPinkGrad.addColorStop(0, '#fbcfe8');
    rightPinkGrad.addColorStop(1, '#f472b6');
    ctx.fillStyle = rightPinkGrad;
    ctx.beginPath();
    ctx.ellipse(0, earH * 0.08, earW * 0.28, earH * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // --- Puppy Nose (Anchored directly on noseTip apex) ---
    ctx.save();
    ctx.translate(noseTip.x, noseTip.y);
    ctx.rotate(roll);
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 3;

    const noseW = faceWidth * 0.25;
    const noseH = noseW * 0.65;

    const noseGrad = ctx.createRadialGradient(0, -4, 4, 0, -4, noseW * 0.6);
    noseGrad.addColorStop(0, '#3f3f46');
    noseGrad.addColorStop(0.7, '#18181b');
    noseGrad.addColorStop(1, '#09090b');
    ctx.fillStyle = noseGrad;
    ctx.beginPath();
    ctx.roundRect(-noseW / 2, -noseH / 2, noseW, noseH, noseH * 0.45);
    ctx.fill();

    // Nose Highlight
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.beginPath();
    ctx.ellipse(-noseW * 0.18, -noseH * 0.2, noseW * 0.14, noseH * 0.15, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // --- Puppy Tongue (Anchored to lowerLip) ---
    ctx.save();
    ctx.translate(lowerLip.x, lowerLip.y + 4);
    ctx.rotate(roll);

    const tongueBounce = Math.sin(time * 1.5) * 4;
    const tongueW = faceWidth * 0.18;
    const tongueH = faceHeight * 0.2 + (mouthOpen * 0.5) + tongueBounce;

    const tongueGrad = ctx.createLinearGradient(0, 0, 0, tongueH);
    tongueGrad.addColorStop(0, '#fb7185');
    tongueGrad.addColorStop(1, '#e11d48');
    ctx.fillStyle = tongueGrad;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.roundRect(-tongueW / 2, 0, tongueW, tongueH, tongueW * 0.45);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#9f1239';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, 4);
    ctx.lineTo(0, tongueH * 0.7);
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  }
}
