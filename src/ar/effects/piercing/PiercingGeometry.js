/**
 * PiercingGeometry — High-Precision 3D Physical Metal & Gemstone Navel Jewelry
 */
import { METAL_PALETTES, GEM_PALETTES } from './PiercingConfig.js';

// ─── SHADOWS & LIGHTING ──────────────────────────────────────────────────────

function drawContactShadow(ctx, x, y, radius, opacity = 0.42) {
  ctx.save();
  const grad = ctx.createRadialGradient(x, y, radius * 0.08, x, y, radius * 2.1);
  grad.addColorStop(0, `rgba(0, 0, 0, ${opacity})`);
  grad.addColorStop(0.4, `rgba(0, 0, 0, ${opacity * 0.45})`);
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(x, y, radius * 1.7, radius * 0.85, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPolishedSphere(ctx, x, y, r, metalPalette, gemKey = null, time = 0) {
  drawContactShadow(ctx, x, y + r * 0.35, r, 0.42);

  // Outer dark metallic edge
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = metalPalette.edge;
  ctx.fill();

  if (gemKey && GEM_PALETTES[gemKey]) {
    const gp = GEM_PALETTES[gemKey];
    const gr = r * 0.84;

    // Gem faceted radial body
    const gemGrad = ctx.createRadialGradient(x - gr * 0.35, y - gr * 0.35, gr * 0.05, x, y, gr);
    gemGrad.addColorStop(0, gp.highlight);
    gemGrad.addColorStop(0.24, gp.base);
    gemGrad.addColorStop(0.68, gp.inner);
    gemGrad.addColorStop(1, gp.deep || gp.edge);

    ctx.beginPath();
    ctx.arc(x, y, gr, 0, Math.PI * 2);
    ctx.fillStyle = gemGrad;
    ctx.fill();

    // Internal facet prism refractions
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.32)';
    ctx.lineWidth = 0.75;
    ctx.beginPath();
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * gr * 0.88, y + Math.sin(a) * gr * 0.88);
    }
    ctx.stroke();
    ctx.restore();

    // Specular glint
    ctx.beginPath();
    ctx.arc(x - gr * 0.34, y - gr * 0.34, gr * 0.24, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.fill();

    // Animated sparkle glint
    const sparklePhase = (time * 3.2 + x) % (Math.PI * 2);
    const sparkleVal = Math.max(0, Math.sin(sparklePhase));
    if (sparkleVal > 0.5) {
      const arm = gr * 0.7 * sparkleVal;
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x - gr * 0.34 - arm, y - gr * 0.34);
      ctx.lineTo(x - gr * 0.34 + arm, y - gr * 0.34);
      ctx.moveTo(x - gr * 0.34, y - gr * 0.34 - arm);
      ctx.lineTo(x - gr * 0.34, y - gr * 0.34 + arm);
      ctx.stroke();
      ctx.restore();
    }
  } else {
    // 3D Polished metal sphere
    const metalGrad = ctx.createRadialGradient(x - r * 0.36, y - r * 0.36, r * 0.05, x, y, r);
    metalGrad.addColorStop(0, metalPalette.highlight);
    metalGrad.addColorStop(0.24, metalPalette.sheen);
    metalGrad.addColorStop(0.65, metalPalette.mid);
    metalGrad.addColorStop(0.88, metalPalette.darkMid);
    metalGrad.addColorStop(1, metalPalette.edge);

    ctx.beginPath();
    ctx.arc(x, y, r * 0.9, 0, Math.PI * 2);
    ctx.fillStyle = metalGrad;
    ctx.fill();

    // Specular point
    ctx.beginPath();
    ctx.arc(x - r * 0.32, y - r * 0.32, r * 0.22, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fill();
  }
}

// ─── CHARM RENDERERS ─────────────────────────────────────────────────────────

function drawHeartCharm(ctx, size, metalPalette, time) {
  drawContactShadow(ctx, 0, size * 0.4, size * 0.8, 0.45);

  const w = size;
  const h = size * 0.95;

  ctx.beginPath();
  ctx.moveTo(0, h * 0.35);
  ctx.bezierCurveTo(-w * 0.55, -h * 0.45, -w * 0.55, h * 0.35, 0, h * 0.55);
  ctx.bezierCurveTo(w * 0.55, h * 0.35, w * 0.55, -h * 0.45, 0, h * 0.35);
  ctx.closePath();

  ctx.fillStyle = metalPalette.edge;
  ctx.fill();
  ctx.strokeStyle = metalPalette.mid;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const gp = GEM_PALETTES.crystal;
  const hGrad = ctx.createLinearGradient(-w * 0.3, -h * 0.3, w * 0.3, h * 0.3);
  hGrad.addColorStop(0, gp.highlight);
  hGrad.addColorStop(0.3, gp.base);
  hGrad.addColorStop(0.7, gp.inner);
  hGrad.addColorStop(1, gp.deep);

  ctx.save();
  ctx.scale(0.84, 0.84);
  ctx.fillStyle = hGrad;
  ctx.fill();
  ctx.restore();

  ctx.beginPath();
  ctx.arc(-w * 0.18, -h * 0.05, w * 0.12, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
  ctx.fill();
}

function drawLotusCharm(ctx, size, metalPalette, time) {
  drawContactShadow(ctx, 0, size * 0.4, size * 0.85, 0.4);

  const petals = 5;
  for (let i = 0; i < petals; i++) {
    const angle = ((i - 2) * Math.PI) / 8;
    ctx.save();
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.ellipse(0, -size * 0.35, size * 0.14, size * 0.42, 0, 0, Math.PI * 2);
    ctx.fillStyle = i === 2 ? metalPalette.highlight : metalPalette.sheen;
    ctx.fill();
    ctx.strokeStyle = metalPalette.edge;
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.restore();
  }

  const gp = GEM_PALETTES.opal;
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.26, 0, Math.PI * 2);
  ctx.fillStyle = gp.deep;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.2, 0, Math.PI * 2);
  ctx.fillStyle = gp.base;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(-size * 0.06, -size * 0.06, size * 0.08, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
}

function drawStarCharm(ctx, size, metalPalette, time) {
  drawContactShadow(ctx, 0, size * 0.4, size * 0.8, 0.42);

  const spikes = 5;
  const outer = size * 0.6;
  const inner = outer * 0.42;

  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const angle = (i * Math.PI) / spikes - Math.PI / 2;
    const rad = i % 2 === 0 ? outer : inner;
    i === 0 ? ctx.moveTo(Math.cos(angle) * rad, Math.sin(angle) * rad)
            : ctx.lineTo(Math.cos(angle) * rad, Math.sin(angle) * rad);
  }
  ctx.closePath();
  ctx.fillStyle = metalPalette.edge;
  ctx.fill();

  ctx.save();
  ctx.scale(0.85, 0.85);
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const angle = (i * Math.PI) / spikes - Math.PI / 2;
    const rad = i % 2 === 0 ? outer : inner;
    i === 0 ? ctx.moveTo(Math.cos(angle) * rad, Math.sin(angle) * rad)
            : ctx.lineTo(Math.cos(angle) * rad, Math.sin(angle) * rad);
  }
  ctx.closePath();
  ctx.fillStyle = metalPalette.sheen;
  ctx.fill();
  ctx.restore();

  drawPolishedSphere(ctx, 0, 0, size * 0.22, metalPalette, 'diamond', time);
}

// ─── MASTER NAVEL JEWELRY RENDERER (WITH PENDULUM PHYSICS) ───────────────────

export function drawNavelJewelry(ctx, design, scale, yaw = 0, time = 0, dangleAngle = 0) {
  const metal = METAL_PALETTES[design.metal] || METAL_PALETTES.silver;

  const totalHeight = scale * 1.85;
  const topBallR = scale * 0.24;
  const bottomBallR = scale * 0.42;
  const shaftR = scale * 0.082;

  const topY = -totalHeight * 0.42;
  const bottomY = totalHeight * 0.35;
  const curveBowX = (scale * 0.38) + (yaw * scale * 0.42);

  // 1. Curved 3D Shaft (Bezier tube with 3D cylindrical lighting)
  ctx.save();

  // Dark edge rim
  ctx.beginPath();
  ctx.moveTo(0, topY);
  ctx.quadraticCurveTo(curveBowX, (topY + bottomY) * 0.48, 0, bottomY);
  ctx.strokeStyle = metal.edge;
  ctx.lineWidth = shaftR * 2 + 1.8;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Metallic midtone
  ctx.beginPath();
  ctx.moveTo(0, topY);
  ctx.quadraticCurveTo(curveBowX, (topY + bottomY) * 0.48, 0, bottomY);
  ctx.strokeStyle = metal.mid;
  ctx.lineWidth = shaftR * 2;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Highlight specular curve
  ctx.beginPath();
  ctx.moveTo(0, topY);
  ctx.quadraticCurveTo(curveBowX, (topY + bottomY) * 0.48, 0, bottomY);
  ctx.strokeStyle = metal.highlight;
  ctx.lineWidth = shaftR * 0.72;
  ctx.lineCap = 'round';
  ctx.stroke();

  ctx.restore();

  // 2. Upper Ball (Anchored to top rim of navel)
  drawPolishedSphere(ctx, 0, topY, topBallR, metal, design.topGem, time);

  // 3. Lower Feature / Dangle Charm with simulated Pendulum Physics
  ctx.save();
  ctx.translate(0, bottomY);
  ctx.rotate(dangleAngle); // Dynamic pendulum physics rotation!

  const charmType = design.charm;
  if (charmType === 'heart') {
    drawHeartCharm(ctx, bottomBallR * 1.7, metal, time);
  } else if (charmType === 'lotus') {
    drawLotusCharm(ctx, bottomBallR * 1.8, metal, time);
  } else if (charmType === 'star') {
    drawStarCharm(ctx, bottomBallR * 1.8, metal, time);
  } else if (charmType === 'diamond_drop' || charmType === 'emerald_drop' || charmType === 'obsidian_drop') {
    const gemType = charmType === 'emerald_drop' ? 'emerald' : charmType === 'obsidian_drop' ? null : 'diamond';
    drawPolishedSphere(ctx, 0, 0, bottomBallR * 1.35, metal, gemType, time);
  } else {
    // Solid 18K gold ball
    drawPolishedSphere(ctx, 0, 0, bottomBallR, metal, null, time);
  }

  ctx.restore();
}
