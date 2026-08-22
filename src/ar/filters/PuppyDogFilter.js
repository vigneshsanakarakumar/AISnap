import { ARFilter } from './ARFilter.js';

export class PuppyDogFilter extends ARFilter {
  constructor() {
    super('puppy_dog', 'Puppy Dog', '🐶', 'Cute AR', 'Fluffy organic puppy ears with soft fur textures and floppy physics');
    
    // Physics secondary motion state
    this.leftAngle = 0;
    this.leftVelocity = 0;
    this.rightAngle = 0;
    this.rightVelocity = 0;
    this.lastRoll = 0;
    this.lastTimestamp = 0;

    // Cached offscreen canvas for high-performance fluffy ears
    this.cachedLeftEarCanvas = null;
    this.cachedRightEarCanvas = null;
    this.cachedEarSize = 0;
  }

  /**
   * Procedurally generate a fluffy, organic puppy ear with soft fur tufts onto an offscreen canvas
   */
  generateFluffyEarCanvas(isLeft = true, targetSize = 256) {
    const canvas = document.createElement('canvas');
    canvas.width = targetSize;
    canvas.height = Math.round(targetSize * 1.6);
    const ctx = canvas.getContext('2d');

    const w = targetSize;
    const h = canvas.height;
    const cx = w * 0.5;
    const topY = h * 0.12;

    ctx.save();

    // LAYER 1 & 2: Outer Organic Floppy Silhouette with Natural Fur Tufts
    ctx.beginPath();
    ctx.moveTo(cx, topY);

    // Outer edge with organic varied fur tufts
    const outerSign = isLeft ? -1 : 1;
    const controlX = cx + outerSign * w * 0.45;
    
    ctx.bezierCurveTo(
      controlX, topY + h * 0.15,
      cx + outerSign * w * 0.42, topY + h * 0.55,
      cx + outerSign * w * 0.2, topY + h * 0.78
    );

    // Rounded floppy bottom tip
    ctx.bezierCurveTo(
      cx, topY + h * 0.88,
      cx - outerSign * w * 0.1, topY + h * 0.82,
      cx - outerSign * w * 0.2, topY + h * 0.65
    );

    // Inner edge back to base
    ctx.bezierCurveTo(
      cx - outerSign * w * 0.25, topY + h * 0.4,
      cx - outerSign * w * 0.15, topY + h * 0.18,
      cx, topY
    );
    ctx.closePath();

    // Base Rich Fur Gradient (Golden Retriever / Spaniel warm chestnut tones)
    const baseGrad = ctx.createLinearGradient(cx, topY, cx, topY + h * 0.8);
    baseGrad.addColorStop(0, '#78350f');   // Rich dark amber
    baseGrad.addColorStop(0.3, '#b45309'); // Warm golden brown
    baseGrad.addColorStop(0.7, '#d97706'); // Fluffy honey amber
    baseGrad.addColorStop(1, '#92400e');   // Deep soft tip
    ctx.fillStyle = baseGrad;
    ctx.fill();

    // LAYER 2: Organic Irregular Fur Edge Tufts around silhouette
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';

    const tuftCount = 28;
    for (let i = 0; i < tuftCount; i++) {
      const t = i / tuftCount;
      const angle = (t * Math.PI * 1.8) - Math.PI * 0.9;
      const tuftRadiusX = (w * 0.36) + (Math.sin(i * 3.7) * 4);
      const tuftRadiusY = (h * 0.38) + (Math.cos(i * 2.3) * 6);

      const px = cx + Math.sin(angle) * tuftRadiusX * outerSign;
      const py = (topY + h * 0.45) + Math.cos(angle) * tuftRadiusY;

      const tuftLen = 4 + (Math.sin(i * 5.1) * 3);
      const tuftAngle = angle + (Math.sin(i * 2.8) * 0.35);

      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + Math.sin(tuftAngle) * tuftLen * outerSign, py + Math.cos(tuftAngle) * tuftLen);
      ctx.stroke();
    }

    // LAYER 3: Soft Pinkish Inner Ear Pocket
    ctx.save();
    ctx.beginPath();
    const inW = w * 0.22;
    const inH = h * 0.42;
    const inY = topY + h * 0.36;
    const inX = cx - outerSign * w * 0.05;

    ctx.ellipse(inX, inY, inW, inH, outerSign * 0.12, 0, Math.PI * 2);
    const innerGrad = ctx.createRadialGradient(inX, inY - inH * 0.2, inW * 0.1, inX, inY, inH * 0.9);
    innerGrad.addColorStop(0, '#fce7f3'); // Soft warm velvet pink
    innerGrad.addColorStop(0.5, '#f472b6');
    innerGrad.addColorStop(1, 'rgba(180, 83, 9, 0.4)');
    ctx.fillStyle = innerGrad;
    ctx.fill();
    ctx.restore();

    // LAYER 4: Soft Fur Highlight Strands
    ctx.save();
    ctx.strokeStyle = 'rgba(254, 243, 199, 0.45)';
    ctx.lineWidth = 1.2;
    for (let f = 0; f < 16; f++) {
      const fx = cx + (Math.sin(f * 2.1) * w * 0.25) * outerSign;
      const fy = topY + h * 0.18 + (f * 12);
      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.quadraticCurveTo(fx + outerSign * 6, fy + 10, fx + outerSign * 2, fy + 22);
      ctx.stroke();
    }
    ctx.restore();

    ctx.restore();
    return canvas;
  }

  getOrCreateEars(targetSize) {
    const size = Math.max(128, Math.min(512, Math.round(targetSize)));
    if (!this.cachedLeftEarCanvas || Math.abs(this.cachedEarSize - size) > 16) {
      this.cachedLeftEarCanvas = this.generateFluffyEarCanvas(true, size);
      this.cachedRightEarCanvas = this.generateFluffyEarCanvas(false, size);
      this.cachedEarSize = size;
    }
    return {
      left: this.cachedLeftEarCanvas,
      right: this.cachedRightEarCanvas
    };
  }

  render(ctx, canvas, video, faceGeometry, timestamp = performance.now()) {
    const { width, height } = canvas;

    // 1. Base video pass-through with warm beauty enhancement
    ctx.save();
    ctx.filter = 'contrast(106%) brightness(104%) saturate(112%)';
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

    // 2. Floppy Spring-Damped Secondary Motion Physics
    const dt = Math.min(0.05, Math.max(0.005, (timestamp - (this.lastTimestamp || timestamp)) / 1000));
    this.lastTimestamp = timestamp;

    const rollDelta = (roll || 0) - (this.lastRoll || 0);
    this.lastRoll = roll || 0;

    const stiffness = 22;
    const damping = 0.76;

    // Left ear physics
    const leftTarget = (roll || 0) - 0.25 - (rollDelta * 2.5);
    const leftForce = (leftTarget - this.leftAngle) * stiffness;
    this.leftVelocity = (this.leftVelocity + leftForce * dt) * damping;
    this.leftAngle += this.leftVelocity * dt;

    // Right ear physics
    const rightTarget = (roll || 0) + 0.25 - (rollDelta * 2.5);
    const rightForce = (rightTarget - this.rightAngle) * stiffness;
    this.rightVelocity = (this.rightVelocity + rightForce * dt) * damping;
    this.rightAngle += this.rightVelocity * dt;

    const earTargetWidth = faceWidth * 0.38;
    const ears = this.getOrCreateEars(earTargetWidth);
    const drawW = earTargetWidth;
    const drawH = drawW * 1.6;

    ctx.save();

    // 3. Left Puppy Ear
    ctx.save();
    ctx.translate(leftEarTop.x, leftEarTop.y);
    ctx.rotate(this.leftAngle);
    ctx.drawImage(ears.left, -drawW * 0.5, -drawH * 0.12, drawW, drawH);
    ctx.restore();

    // 4. Right Puppy Ear
    ctx.save();
    ctx.translate(rightEarTop.x, rightEarTop.y);
    ctx.rotate(this.rightAngle);
    ctx.drawImage(ears.right, -drawW * 0.5, -drawH * 0.12, drawW, drawH);
    ctx.restore();

    // 5. Glossy Puppy Nose Button
    ctx.save();
    ctx.translate(noseTip.x, noseTip.y);
    ctx.rotate(roll || 0);

    const noseW = faceWidth * 0.24;
    const noseH = noseW * 0.65;

    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3;

    const noseGrad = ctx.createRadialGradient(0, -noseH * 0.2, 2, 0, 0, noseW * 0.55);
    noseGrad.addColorStop(0, '#3f3f46');
    noseGrad.addColorStop(0.65, '#18181b');
    noseGrad.addColorStop(1, '#09090b');
    ctx.fillStyle = noseGrad;

    ctx.beginPath();
    ctx.roundRect(-noseW * 0.5, -noseH * 0.5, noseW, noseH, noseH * 0.48);
    ctx.fill();

    // Nose Highlight
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.beginPath();
    ctx.ellipse(-noseW * 0.16, -noseH * 0.2, noseW * 0.14, noseH * 0.16, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 6. Puppy Tongue (reactive when mouth opens)
    const mouthOpenRatio = (mouthOpen || 0) / (faceHeight || 1);
    if (mouthOpenRatio > 0.035) {
      ctx.save();
      ctx.translate(lowerLip.x, lowerLip.y + 2);
      ctx.rotate(roll || 0);

      const tongueBounce = Math.sin(timestamp / 120) * 3;
      const tongueW = faceWidth * 0.18;
      const tongueH = faceHeight * 0.22 + (mouthOpenRatio * 60) + tongueBounce;

      const tongueGrad = ctx.createLinearGradient(0, 0, 0, tongueH);
      tongueGrad.addColorStop(0, '#fb7185');
      tongueGrad.addColorStop(1, '#e11d48');
      ctx.fillStyle = tongueGrad;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = 8;

      ctx.beginPath();
      ctx.roundRect(-tongueW * 0.5, 0, tongueW, tongueH, tongueW * 0.48);
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#9f1239';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(0, 4);
      ctx.lineTo(0, tongueH * 0.68);
      ctx.stroke();

      ctx.restore();
    }

    ctx.restore();
  }
}
