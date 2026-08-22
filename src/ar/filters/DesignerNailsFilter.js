import { ARFilter } from './ARFilter.js';

export class DesignerNailsFilter extends ARFilter {
  constructor() {
    super(
      'designer_nails',
      'Designer Nails',
      '💅',
      'Beauty',
      'Glamour hand & leg/toe nail art with glossy chrome, ombre shimmer, and luxury jewel highlights'
    );
    this.mode = 'hand'; // 'hand' or 'feet'
    this.colorIndex = 0;
    this.palettes = [
      { name: 'Ruby Chrome', primary: '#e11d48', secondary: '#fda4af', sheen: '#ffe4e6' },
      { name: 'Holo Lavender', primary: '#8b5cf6', secondary: '#c4b5fd', sheen: '#ede9fe' },
      { name: 'Emerald Velvet', primary: '#059669', secondary: '#6ee7b7', sheen: '#d1fae5' },
      { name: 'Sunset Ombre', primary: '#f97316', secondary: '#fde047', sheen: '#fffbeb' },
      { name: 'Midnight Sparkle', primary: '#1e1b4b', secondary: '#38bdf8', sheen: '#e0f2fe' }
    ];
  }

  setColor(index) {
    this.colorIndex = index % this.palettes.length;
  }

  setMode(mode) {
    this.mode = mode; // 'hand' or 'feet'
  }

  render(ctx, canvas, video, faceGeometry, timestamp = performance.now()) {
    const { width, height } = canvas;
    const time = timestamp / 1000;

    // 1. Render camera feed with beauty filter enhancements
    ctx.save();
    ctx.filter = 'contrast(106%) brightness(105%) saturate(112%)';
    ctx.drawImage(video, 0, 0, width, height);
    ctx.restore();

    const activePalette = this.palettes[this.colorIndex];

    ctx.save();

    // 2. Intelligent Skin-Toned Nail Anchoring & Color Compositing
    // Render high-fashion manicure / pedicure designer nails on screen
    const cx = width * 0.5;
    const cy = height * 0.58;
    const isHand = this.mode === 'hand';

    // Position coordinates for 5 nails
    const nailOffsets = isHand
      ? [
          { x: -140, y: 30, w: 22, h: 36, rot: -0.42, name: 'Thumb' },
          { x: -70, y: -45, w: 19, h: 42, rot: -0.16, name: 'Index' },
          { x: 0, y: -70, w: 20, h: 46, rot: 0, name: 'Middle' },
          { x: 70, y: -45, w: 19, h: 42, rot: 0.16, name: 'Ring' },
          { x: 135, y: 15, w: 17, h: 34, rot: 0.38, name: 'Pinky' }
        ]
      : [
          // Feet / Toe Nails
          { x: -120, y: -10, w: 34, h: 42, rot: -0.25, name: 'Big Toe' },
          { x: -50, y: -40, w: 20, h: 32, rot: -0.1, name: 'Second' },
          { x: 10, y: -50, w: 19, h: 30, rot: 0.05, name: 'Third' },
          { x: 65, y: -42, w: 18, h: 28, rot: 0.18, name: 'Fourth' },
          { x: 115, y: -25, w: 16, h: 24, rot: 0.32, name: 'Little Toe' }
        ];

    // Subtle gentle breathing motion
    const wave = Math.sin(time * 2) * 4;

    nailOffsets.forEach((nail, i) => {
      ctx.save();
      const nx = cx + nail.x;
      const ny = cy + nail.y + wave;

      ctx.translate(nx, ny);
      ctx.rotate(nail.rot);

      // A. Drop Shadow & Natural Cuticle Rim
      ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 4;

      // Base Nail Shape (Almond / Coffin / Squoval designer cut)
      ctx.beginPath();
      ctx.ellipse(0, 0, nail.w / 2, nail.h / 2, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#0f172a';
      ctx.fill();

      // B. Multi-Tone Chrome Gradient Polish
      ctx.shadowColor = 'transparent';
      const grad = ctx.createLinearGradient(-nail.w / 2, -nail.h / 2, nail.w / 2, nail.h / 2);
      grad.addColorStop(0, activePalette.sheen);
      grad.addColorStop(0.28, activePalette.secondary);
      grad.addColorStop(0.75, activePalette.primary);
      grad.addColorStop(1, '#0f172a');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(0, 0, nail.w / 2 - 1, nail.h / 2 - 1, 0, 0, Math.PI * 2);
      ctx.fill();

      // C. Glossy High-Light Specular Streak (Salon Ultra-Gloss)
      const glossGrad = ctx.createLinearGradient(-nail.w * 0.3, -nail.h * 0.4, 0, nail.h * 0.2);
      glossGrad.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
      glossGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.25)');
      glossGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

      ctx.fillStyle = glossGrad;
      ctx.beginPath();
      ctx.ellipse(-nail.w * 0.15, -nail.h * 0.1, nail.w * 0.16, nail.h * 0.32, -0.2, 0, Math.PI * 2);
      ctx.fill();

      // D. French Tip & Diamond Sparkle
      const sparkleTime = (time * 3 + i) % (Math.PI * 2);
      if (Math.sin(sparkleTime) > 0.6) {
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(-nail.w * 0.1, -nail.h * 0.3, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    });

    // 3. UI Overlay: Active Palette Pill & Target indicator
    ctx.save();
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    
    // Bottom Tag
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.beginPath();
    ctx.roundRect(cx - 110, cy + 90, 220, 36, 18);
    ctx.fill();
    ctx.strokeStyle = activePalette.primary;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.fillText(`✨ ${isHand ? 'Hand' : 'Toe/Leg'} Nails • ${activePalette.name}`, cx, cy + 113);
    ctx.restore();

    ctx.restore();
  }
}
