import { ARFilter } from './ARFilter.js';

export class ARTattooFilter extends ARFilter {
  constructor() {
    super(
      'ar_tattoo',
      'AR Tattoo Studio',
      '💉',
      'Artistic',
      'Realistic AR body tattoos with instant placement on Stomach, Hand, or Thigh'
    );
    this.placement = 'hand'; // 'stomach', 'hand', 'thigh'
    this.designIndex = 0;
    this.designs = [
      { name: 'Dragon Koi', style: 'Neo-Traditional Blackwork', color: '#111827' },
      { name: 'Sacred Lotus Mandala', style: 'Geometric Fine-Line', color: '#0f172a' },
      { name: 'Cyber Phoenix', style: 'Futuristic Cyberpunk', color: '#09090b' },
      { name: 'Wild Rose Vine', style: 'Botanical Shading', color: '#18181b' }
    ];
  }

  setPlacement(place) {
    if (['stomach', 'hand', 'thigh'].includes(place)) {
      this.placement = place;
    }
  }

  setDesign(index) {
    this.designIndex = index % this.designs.length;
  }

  render(ctx, canvas, video, faceGeometry, timestamp = performance.now()) {
    const { width, height } = canvas;
    const time = timestamp / 1000;

    // 1. Draw crisp camera background
    ctx.save();
    ctx.filter = 'contrast(105%) brightness(102%)';
    ctx.drawImage(video, 0, 0, width, height);
    ctx.restore();

    ctx.save();

    // 2. Determine Placement Coordinates based on selection
    let tx = width * 0.5;
    let ty = height * 0.54;
    let scale = 1.0;
    let title = 'Hand / Wrist Tattoo';

    if (this.placement === 'stomach') {
      tx = width * 0.5;
      ty = height * 0.58;
      scale = 1.35;
      title = 'Stomach / Waistline Tattoo';
    } else if (this.placement === 'thigh') {
      tx = width * 0.5;
      ty = height * 0.55;
      scale = 1.4;
      title = 'Thigh / Leg Tattoo';
    } else {
      // Hand
      tx = width * 0.5;
      ty = height * 0.52;
      scale = 1.05;
      title = 'Hand / Forearm Tattoo';
    }

    const design = this.designs[this.designIndex];

    ctx.save();
    ctx.translate(tx, ty);
    ctx.scale(scale, scale);

    // 3. Realistic Skin Ink Shading with Multiply Blend & Natural Skin Sub-surface Lighting
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.88;

    // Outer subtle skin redness/depth shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 4;
    ctx.strokeStyle = design.color;
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Draw Detailed Tattoo Geometry depending on design index
    if (this.designIndex === 0) {
      // Dragon Koi
      this.drawDragonKoi(ctx, time);
    } else if (this.designIndex === 1) {
      // Sacred Lotus Mandala
      this.drawLotusMandala(ctx, time);
    } else if (this.designIndex === 2) {
      // Cyber Phoenix
      this.drawCyberPhoenix(ctx, time);
    } else {
      // Wild Rose Vine
      this.drawRoseVine(ctx, time);
    }

    ctx.restore();

    // 4. On-Screen Placement Tag & Indicator
    ctx.save();
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center';

    const pillY = height * 0.88;
    ctx.fillStyle = 'rgba(15, 15, 20, 0.8)';
    ctx.beginPath();
    ctx.roundRect(width * 0.5 - 130, pillY - 18, 260, 36, 18);
    ctx.fill();
    ctx.strokeStyle = '#ec4899';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.fillText(`💉 ${title} • ${design.name}`, width * 0.5, pillY + 5);
    ctx.restore();

    ctx.restore();
  }

  // --- Tattoo Drawing Vectors ---

  drawLotusMandala(ctx, time) {
    // Intricate Mandala Rings & Petals
    const numPetals = 8;
    for (let r = 0; r < 3; r++) {
      const radius = 30 + r * 24;
      ctx.beginPath();
      for (let i = 0; i < numPetals * (r + 1); i++) {
        const angle = (i * 2 * Math.PI) / (numPetals * (r + 1));
        const px = Math.cos(angle) * radius;
        const py = Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    }

    // Sacred Center Flower
    for (let i = 0; i < 8; i++) {
      ctx.save();
      ctx.rotate((i * Math.PI) / 4);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(20, -35, 0, -60);
      ctx.quadraticCurveTo(-20, -35, 0, 0);
      ctx.stroke();
      ctx.restore();
    }

    // Center jewel dot
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#111827';
    ctx.fill();
    ctx.stroke();
  }

  drawDragonKoi(ctx, time) {
    // S-Curved Dragon Body
    ctx.beginPath();
    ctx.moveTo(0, -90);
    ctx.bezierCurveTo(60, -60, 70, 20, 0, 60);
    ctx.bezierCurveTo(-50, 90, -40, 120, 10, 140);
    ctx.lineWidth = 8;
    ctx.stroke();

    // Dragon Scales & Ribs
    ctx.lineWidth = 2.5;
    for (let y = -70; y < 120; y += 18) {
      ctx.beginPath();
      const offset = Math.sin(y * 0.05) * 35;
      ctx.arc(offset, y, 16, 0, Math.PI);
      ctx.stroke();
    }

    // Fierce Dragon Head & Whiskers
    ctx.beginPath();
    ctx.moveTo(0, -90);
    ctx.lineTo(24, -110);
    ctx.lineTo(10, -130);
    ctx.lineTo(-10, -130);
    ctx.lineTo(-24, -110);
    ctx.closePath();
    ctx.fillStyle = '#111827';
    ctx.fill();
    ctx.stroke();

    // Whiskers
    ctx.beginPath();
    ctx.moveTo(15, -120);
    ctx.quadraticCurveTo(45, -135, 60, -105);
    ctx.moveTo(-15, -120);
    ctx.quadraticCurveTo(-45, -135, -60, -105);
    ctx.stroke();
  }

  drawCyberPhoenix(ctx, time) {
    // Geometric Wings
    [-1, 1].forEach((side) => {
      ctx.save();
      ctx.scale(side, 1);
      ctx.beginPath();
      ctx.moveTo(0, -20);
      ctx.lineTo(30, -50);
      ctx.lineTo(85, -75);
      ctx.lineTo(60, -30);
      ctx.lineTo(100, -35);
      ctx.lineTo(55, 0);
      ctx.lineTo(80, 15);
      ctx.lineTo(35, 25);
      ctx.lineTo(0, 50);
      ctx.stroke();
      ctx.restore();
    });

    // Cyber Spine Line
    ctx.beginPath();
    ctx.moveTo(0, -80);
    ctx.lineTo(0, 110);
    ctx.lineWidth = 4;
    ctx.stroke();

    // Feathered Tail Plumes
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(0, 60 + i * 20);
      ctx.quadraticCurveTo(25 + i * 10, 80 + i * 20, 15 + i * 15, 130 + i * 20);
      ctx.moveTo(0, 60 + i * 20);
      ctx.quadraticCurveTo(-(25 + i * 10), 80 + i * 20, -(15 + i * 15), 130 + i * 20);
      ctx.stroke();
    }
  }

  drawRoseVine(ctx, time) {
    // Curving Floral Vine
    ctx.beginPath();
    ctx.moveTo(0, -90);
    ctx.bezierCurveTo(40, -40, -35, 30, 15, 100);
    ctx.lineWidth = 4;
    ctx.stroke();

    // Leaves
    [-1, 1].forEach((dir, i) => {
      ctx.beginPath();
      const y = -40 + i * 65;
      ctx.moveTo(dir * 10, y);
      ctx.quadraticCurveTo(dir * 38, y - 18, dir * 42, y);
      ctx.quadraticCurveTo(dir * 25, y + 15, dir * 10, y);
      ctx.fillStyle = '#18181b';
      ctx.fill();
      ctx.stroke();
    });

    // Blooming Shaded Rose at Center
    ctx.save();
    ctx.translate(0, -20);
    for (let p = 0; p < 6; p++) {
      ctx.beginPath();
      ctx.arc(Math.cos(p) * 12, Math.sin(p) * 12, 18, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fillStyle = '#18181b';
    ctx.fill();
    ctx.restore();
  }
}
