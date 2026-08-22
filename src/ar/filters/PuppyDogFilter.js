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

    const { eyeMidpoint, faceWidth, faceHeight, roll, noseTip } = faceGeometry;
    const earSwing = Math.sin(time) * 0.06;

    ctx.save();

    // --- Left Puppy Ear ---
    ctx.save();
    ctx.translate(cx_relative(eyeMidpoint.x, -faceWidth * 0.45, roll), cy_relative(eyeMidpoint.y, -faceHeight * 0.6, roll));
    ctx.rotate(roll - 0.35 + earSwing);
    
    const leftEarGrad = ctx.createLinearGradient(-30, -70, 30, 70);
    leftEarGrad.addColorStop(0, '#92400e');
    leftEarGrad.addColorStop(0.5, '#b45309');
    leftEarGrad.addColorStop(1, '#78350f');
    ctx.fillStyle = leftEarGrad;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.ellipse(0, 0, faceWidth * 0.18, faceHeight * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    const leftPinkGrad = ctx.createLinearGradient(0, -40, 0, 40);
    leftPinkGrad.addColorStop(0, '#fbcfe8');
    leftPinkGrad.addColorStop(1, '#f472b6');
    ctx.fillStyle = leftPinkGrad;
    ctx.beginPath();
    ctx.ellipse(0, 8, faceWidth * 0.09, faceHeight * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // --- Right Puppy Ear ---
    ctx.save();
    ctx.translate(cx_relative(eyeMidpoint.x, faceWidth * 0.45, roll), cy_relative(eyeMidpoint.y, -faceHeight * 0.6, roll));
    ctx.rotate(roll + 0.35 - earSwing);

    const rightEarGrad = ctx.createLinearGradient(-30, -70, 30, 70);
    rightEarGrad.addColorStop(0, '#92400e');
    rightEarGrad.addColorStop(0.5, '#b45309');
    rightEarGrad.addColorStop(1, '#78350f');
    ctx.fillStyle = rightEarGrad;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.ellipse(0, 0, faceWidth * 0.18, faceHeight * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    const rightPinkGrad = ctx.createLinearGradient(0, -40, 0, 40);
    rightPinkGrad.addColorStop(0, '#fbcfe8');
    rightPinkGrad.addColorStop(1, '#f472b6');
    ctx.fillStyle = rightPinkGrad;
    ctx.beginPath();
    ctx.ellipse(0, 8, faceWidth * 0.09, faceHeight * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // --- Realistic Puppy Nose ---
    ctx.save();
    ctx.translate(noseTip.x, noseTip.y);
    ctx.rotate(roll);
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;
    const noseW = faceWidth * 0.26;
    const noseH = noseW * 0.68;

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
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.beginPath();
    ctx.ellipse(-noseW * 0.18, -noseH * 0.2, noseW * 0.14, noseH * 0.15, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // --- Puppy Tongue ---
    ctx.save();
    ctx.translate(noseTip.x, noseTip.y + faceHeight * 0.26);
    ctx.rotate(roll);
    const tongueBounce = Math.sin(time * 1.5) * 4;
    const tongueW = faceWidth * 0.18;
    const tongueH = faceHeight * 0.22 + tongueBounce;

    const tongueGrad = ctx.createLinearGradient(0, 0, 0, tongueH);
    tongueGrad.addColorStop(0, '#fb7185');
    tongueGrad.addColorStop(1, '#e11d48');
    ctx.fillStyle = tongueGrad;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
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

function cx_relative(ox, dx, angle) {
  return ox + dx * Math.cos(angle);
}
function cy_relative(oy, dy, angle) {
  return oy + dy * Math.sin(angle);
}
