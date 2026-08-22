/**
 * Tattoo Designs & Material Presets Configuration
 */

export const TATTOO_DESIGNS = [
  {
    id: 'dragon_koi',
    name: 'Dragon Koi',
    style: 'Neo-Traditional Blackwork',
    primaryColor: '#12161f',
    accentColor: '#1e293b',
    defaultScale: 1.0,
    aspectRatio: 1.0,
    renderVectors: (ctx, size) => {
      const s = size / 200;
      ctx.save();
      ctx.scale(s, s);
      ctx.translate(100, 100);

      // S-Curved Dragon Body
      ctx.beginPath();
      ctx.moveTo(0, -85);
      ctx.bezierCurveTo(55, -55, 65, 15, 0, 55);
      ctx.bezierCurveTo(-45, 85, -35, 115, 10, 135);
      ctx.lineWidth = 7;
      ctx.stroke();

      // Dragon Scales & Shading
      ctx.lineWidth = 2.2;
      for (let y = -65; y < 115; y += 16) {
        ctx.beginPath();
        const offset = Math.sin(y * 0.05) * 32;
        ctx.arc(offset, y, 14, 0, Math.PI);
        ctx.stroke();
      }

      // Dragon Head
      ctx.beginPath();
      ctx.moveTo(0, -85);
      ctx.lineTo(22, -105);
      ctx.lineTo(10, -125);
      ctx.lineTo(-10, -125);
      ctx.lineTo(-22, -105);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Whisker Lines
      ctx.beginPath();
      ctx.moveTo(14, -115);
      ctx.quadraticCurveTo(42, -130, 55, -100);
      ctx.moveTo(-14, -115);
      ctx.quadraticCurveTo(-42, -130, -55, -100);
      ctx.stroke();

      // Fine Claws & Crest
      [-1, 1].forEach((dir) => {
        ctx.beginPath();
        ctx.moveTo(dir * 25, -20);
        ctx.lineTo(dir * 45, -35);
        ctx.lineTo(dir * 55, -25);
        ctx.moveTo(dir * 20, 30);
        ctx.lineTo(dir * 42, 20);
        ctx.stroke();
      });

      ctx.restore();
    }
  },
  {
    id: 'lotus_mandala',
    name: 'Sacred Lotus',
    style: 'Geometric Fine-Line',
    primaryColor: '#0f172a',
    accentColor: '#334155',
    defaultScale: 1.05,
    aspectRatio: 1.0,
    renderVectors: (ctx, size) => {
      const s = size / 200;
      ctx.save();
      ctx.scale(s, s);
      ctx.translate(100, 100);

      // Sacred Rings
      [28, 52, 76].forEach((radius, r) => {
        ctx.beginPath();
        const pts = 8 * (r + 1);
        for (let i = 0; i <= pts; i++) {
          const angle = (i * 2 * Math.PI) / pts;
          const px = Math.cos(angle) * radius;
          const py = Math.sin(angle) * radius;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.lineWidth = 2.0;
        ctx.stroke();
      });

      // Lotus Petals
      for (let i = 0; i < 8; i++) {
        ctx.save();
        ctx.rotate((i * Math.PI) / 4);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(18, -32, 0, -58);
        ctx.quadraticCurveTo(-18, -32, 0, 0);
        ctx.lineWidth = 2.4;
        ctx.stroke();
        ctx.restore();
      }

      // Inner Seed Core
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    }
  },
  {
    id: 'cyber_phoenix',
    name: 'Cyber Phoenix',
    style: 'Futuristic Blackwork',
    primaryColor: '#0c0f17',
    accentColor: '#1e293b',
    defaultScale: 1.0,
    aspectRatio: 1.0,
    renderVectors: (ctx, size) => {
      const s = size / 200;
      ctx.save();
      ctx.scale(s, s);
      ctx.translate(100, 100);

      // Geometric Wings
      [-1, 1].forEach((side) => {
        ctx.save();
        ctx.scale(side, 1);
        ctx.beginPath();
        ctx.moveTo(0, -20);
        ctx.lineTo(28, -48);
        ctx.lineTo(82, -72);
        ctx.lineTo(58, -28);
        ctx.lineTo(95, -32);
        ctx.lineTo(52, 2);
        ctx.lineTo(76, 16);
        ctx.lineTo(32, 24);
        ctx.lineTo(0, 48);
        ctx.lineWidth = 3.0;
        ctx.stroke();
        ctx.restore();
      });

      // Spine & Crest
      ctx.beginPath();
      ctx.moveTo(0, -78);
      ctx.lineTo(0, 105);
      ctx.lineWidth = 4.2;
      ctx.stroke();

      // Tail Plumes
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(0, 55 + i * 18);
        ctx.quadraticCurveTo(22 + i * 8, 75 + i * 18, 14 + i * 12, 120 + i * 18);
        ctx.moveTo(0, 55 + i * 18);
        ctx.quadraticCurveTo(-(22 + i * 8), 75 + i * 18, -(14 + i * 12), 120 + i * 18);
        ctx.lineWidth = 2.2;
        ctx.stroke();
      }

      ctx.restore();
    }
  },
  {
    id: 'wild_rose',
    name: 'Wild Rose',
    style: 'Botanical Fine-Line',
    primaryColor: '#131822',
    accentColor: '#334155',
    defaultScale: 0.95,
    aspectRatio: 1.0,
    renderVectors: (ctx, size) => {
      const s = size / 200;
      ctx.save();
      ctx.scale(s, s);
      ctx.translate(100, 100);

      // Rose Vine Stem
      ctx.beginPath();
      ctx.moveTo(0, -85);
      ctx.bezierCurveTo(38, -38, -32, 28, 14, 95);
      ctx.lineWidth = 3.6;
      ctx.stroke();

      // Leaves
      [-1, 1].forEach((dir, i) => {
        ctx.beginPath();
        const y = -38 + i * 60;
        ctx.moveTo(dir * 8, y);
        ctx.quadraticCurveTo(dir * 36, y - 16, dir * 40, y);
        ctx.quadraticCurveTo(dir * 22, y + 14, dir * 8, y);
        ctx.fillStyle = '#131822';
        ctx.fill();
        ctx.lineWidth = 1.8;
        ctx.stroke();
      });

      // Center Rose Bloom
      ctx.save();
      ctx.translate(0, -18);
      for (let p = 0; p < 6; p++) {
        ctx.beginPath();
        ctx.arc(Math.cos(p) * 11, Math.sin(p) * 11, 16, 0, Math.PI * 2);
        ctx.lineWidth = 2.0;
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(0, 0, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.restore();
    }
  }
];

export const PLACEMENTS = [
  { id: 'cheek', label: '😊 Cheek / Face', bodyPart: 'face' },
  { id: 'hand', label: '✋ Hand / Arm', bodyPart: 'hand' },
  { id: 'stomach', label: '🌸 Stomach / Torso', bodyPart: 'torso' },
  { id: 'thigh', label: '🦵 Thigh / Leg', bodyPart: 'leg' }
];
