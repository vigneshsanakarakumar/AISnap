/**
 * PiercingGeometry — Ultra-Realistic Procedural Canvas 2D Jewelry Rendering
 * Simulates physical metallic base, specular point reflections, dark edges, and soft contact shadows.
 */
import { METAL_PALETTES, GEM_PALETTES } from './PiercingConfig.js';

// ─── SHADOWS & LIGHTING ──────────────────────────────────────────────────────

function drawContactShadow(ctx, x, y, radius, opacity = 0.38) {
  ctx.save();
  const grad = ctx.createRadialGradient(x, y, radius * 0.1, x, y, radius * 2.0);
  grad.addColorStop(0, `rgba(0, 0, 0, ${opacity})`);
  grad.addColorStop(0.45, `rgba(0, 0, 0, ${opacity * 0.4})`);
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(x, y, radius * 1.6, radius * 0.8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ─── EAR JEWELRY ─────────────────────────────────────────────────────────────

/**
 * Realistic Circular Ear Stud with Multi-tone Radial Shading & Specular Point
 */
export function drawStud(ctx, r, metalKey = 'silver', gemKey = null) {
  const m = METAL_PALETTES[metalKey] || METAL_PALETTES.silver;

  // 1. Soft contact shadow on skin
  drawContactShadow(ctx, 0, r * 0.3, r, 0.35);

  // 2. Bezel / Dark outer metallic edge
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = m.edge;
  ctx.fill();

  if (gemKey && GEM_PALETTES[gemKey]) {
    const gp = GEM_PALETTES[gemKey];
    const gr = r * 0.82;

    // Gem faceted radial body
    const gemGrad = ctx.createRadialGradient(-gr * 0.3, -gr * 0.3, gr * 0.05, 0, 0, gr);
    gemGrad.addColorStop(0, gp.highlight);
    gemGrad.addColorStop(0.3, gp.base);
    gemGrad.addColorStop(0.75, gp.inner);
    gemGrad.addColorStop(1, gp.deep || gp.edge);

    ctx.beginPath();
    ctx.arc(0, 0, gr, 0, Math.PI * 2);
    ctx.fillStyle = gemGrad;
    ctx.fill();

    // Specular highlight glint
    ctx.beginPath();
    ctx.arc(-gr * 0.32, -gr * 0.32, gr * 0.22, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fill();
  } else {
    // Polished spherical metal face
    const metalGrad = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.05, 0, 0, r);
    metalGrad.addColorStop(0, m.highlight);
    metalGrad.addColorStop(0.22, m.sheen);
    metalGrad.addColorStop(0.68, m.mid);
    metalGrad.addColorStop(0.9, m.darkMid);
    metalGrad.addColorStop(1, m.edge);

    ctx.beginPath();
    ctx.arc(0, 0, r * 0.88, 0, Math.PI * 2);
    ctx.fillStyle = metalGrad;
    ctx.fill();

    // Specular highlight
    ctx.beginPath();
    ctx.arc(-r * 0.3, -r * 0.3, r * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fill();
  }
}

/**
 * Star Stud Earring
 */
export function drawStarStud(ctx, r, metalKey = 'gold') {
  const m = METAL_PALETTES[metalKey] || METAL_PALETTES.gold;
  drawContactShadow(ctx, 0, r * 0.3, r, 0.35);

  const spikes = 5;
  const outer = r;
  const inner = r * 0.44;

  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const angle = (i * Math.PI) / spikes - Math.PI / 2;
    const rad = i % 2 === 0 ? outer : inner;
    i === 0 ? ctx.moveTo(Math.cos(angle) * rad, Math.sin(angle) * rad)
            : ctx.lineTo(Math.cos(angle) * rad, Math.sin(angle) * rad);
  }
  ctx.closePath();
  ctx.fillStyle = m.edge;
  ctx.fill();

  // Inner sheen
  const innerStar = outer * 0.86;
  const innerInner = inner * 0.86;
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const angle = (i * Math.PI) / spikes - Math.PI / 2;
    const rad = i % 2 === 0 ? innerStar : innerInner;
    i === 0 ? ctx.moveTo(Math.cos(angle) * rad, Math.sin(angle) * rad)
            : ctx.lineTo(Math.cos(angle) * rad, Math.sin(angle) * rad);
  }
  ctx.closePath();

  const starGrad = ctx.createRadialGradient(-innerStar * 0.3, -innerStar * 0.3, 2, 0, 0, innerStar);
  starGrad.addColorStop(0, m.highlight);
  starGrad.addColorStop(0.3, m.sheen);
  starGrad.addColorStop(0.7, m.mid);
  starGrad.addColorStop(1, m.darkMid);

  ctx.fillStyle = starGrad;
  ctx.fill();

  // Center sparkling glint
  ctx.beginPath();
  ctx.arc(-r * 0.08, -r * 0.08, r * 0.14, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.fill();
}

/**
 * Perspective Compressed Hoop Earring
 */
export function drawHoop(ctx, R, tubeR, metalKey = 'silver', foreshortenX = 1.0) {
  const m = METAL_PALETTES[metalKey] || METAL_PALETTES.silver;
  const scaleX = Math.max(0.18, Math.min(1.0, foreshortenX));

  drawContactShadow(ctx, 0, R * 0.4, R * 0.6, 0.3);

  ctx.save();
  ctx.scale(scaleX, 1.0);

  // Outer dark rim
  ctx.beginPath();
  ctx.arc(0, 0, R + tubeR, 0, Math.PI * 2);
  ctx.arc(0, 0, R - tubeR, 0, Math.PI * 2, true);
  ctx.fillStyle = m.edge;
  ctx.fill('evenodd');

  // Multi-tone metallic sheen
  const ringGrad = ctx.createLinearGradient(-R, -R, R, R);
  ringGrad.addColorStop(0, m.highlight);
  ringGrad.addColorStop(0.25, m.mid);
  ringGrad.addColorStop(0.5, m.darkMid);
  ringGrad.addColorStop(0.75, m.mid);
  ringGrad.addColorStop(1, m.highlight);

  ctx.beginPath();
  ctx.arc(0, 0, R + tubeR * 0.75, 0, Math.PI * 2);
  ctx.arc(0, 0, R - tubeR * 0.75, 0, Math.PI * 2, true);
  ctx.fillStyle = ringGrad;
  ctx.fill('evenodd');

  ctx.restore();
}

// ─── NAVEL JEWELRY ───────────────────────────────────────────────────────────

function drawPolishedSphere(ctx, x, y, r, metalPalette, gemKey = null) {
  drawContactShadow(ctx, x, y + r * 0.35, r, 0.4);

  // Outer edge
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = metalPalette.edge;
  ctx.fill();

  if (gemKey && GEM_PALETTES[gemKey]) {
    const gp = GEM_PALETTES[gemKey];
    const gr = r * 0.84;

    const gemGrad = ctx.createRadialGradient(x - gr * 0.35, y - gr * 0.35, gr * 0.05, x, y, gr);
    gemGrad.addColorStop(0, gp.highlight);
    gemGrad.addColorStop(0.25, gp.base);
    gemGrad.addColorStop(0.7, gp.inner);
    gemGrad.addColorStop(1, gp.deep || gp.edge);

    ctx.beginPath();
    ctx.arc(x, y, gr, 0, Math.PI * 2);
    ctx.fillStyle = gemGrad;
    ctx.fill();

    // Specular glint
    ctx.beginPath();
    ctx.arc(x - gr * 0.35, y - gr * 0.35, gr * 0.24, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.fill();
  } else {
    const metalGrad = ctx.createRadialGradient(x - r * 0.38, y - r * 0.38, r * 0.05, x, y, r);
    metalGrad.addColorStop(0, metalPalette.highlight);
    metalGrad.addColorStop(0.24, metalPalette.sheen);
    metalGrad.addColorStop(0.65, metalPalette.mid);
    metalGrad.addColorStop(0.88, metalPalette.darkMid);
    metalGrad.addColorStop(1, metalPalette.edge);

    ctx.beginPath();
    ctx.arc(x, y, r * 0.9, 0, Math.PI * 2);
    ctx.fillStyle = metalGrad;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x - r * 0.32, y - r * 0.32, r * 0.22, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
    ctx.fill();
  }
}

function drawHeartCharm(ctx, x, y, size, metalPalette) {
  drawContactShadow(ctx, x, y + size * 0.4, size * 0.8, 0.4);

  ctx.save();
  ctx.translate(x, y);

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
  ctx.scale(0.85, 0.85);
  ctx.fillStyle = hGrad;
  ctx.fill();
  ctx.restore();

  ctx.beginPath();
  ctx.arc(-w * 0.18, -h * 0.05, w * 0.12, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.fill();

  ctx.restore();
}

function drawLotusCharm(ctx, x, y, size, metalPalette) {
  drawContactShadow(ctx, x, y + size * 0.4, size * 0.8, 0.38);

  ctx.save();
  ctx.translate(x, y);

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

  ctx.restore();
}

function drawStarCharm(ctx, x, y, size, metalPalette) {
  drawContactShadow(ctx, x, y + size * 0.4, size * 0.8, 0.4);

  ctx.save();
  ctx.translate(x, y);

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

  drawPolishedSphere(ctx, 0, 0, size * 0.22, metalPalette, 'diamond');
  ctx.restore();
}

export function drawNavelJewelry(ctx, design, scale, yaw = 0) {
  const metal = METAL_PALETTES[design.metal] || METAL_PALETTES.silver;

  const totalHeight = scale * 1.8;
  const topBallR = scale * 0.24;
  const bottomBallR = scale * 0.42;
  const shaftR = scale * 0.08;

  const topY = -totalHeight * 0.42;
  const bottomY = totalHeight * 0.35;
  const curveBowX = (scale * 0.38) + (yaw * scale * 0.4);

  // 1. Curved 3D Shaft (Bezier tube with dark edges and bright highlight)
  ctx.save();
  
  ctx.beginPath();
  ctx.moveTo(0, topY);
  ctx.quadraticCurveTo(curveBowX, (topY + bottomY) * 0.48, 0, bottomY);
  ctx.strokeStyle = metal.edge;
  ctx.lineWidth = shaftR * 2 + 1.6;
  ctx.lineCap = 'round';
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, topY);
  ctx.quadraticCurveTo(curveBowX, (topY + bottomY) * 0.48, 0, bottomY);
  ctx.strokeStyle = metal.mid;
  ctx.lineWidth = shaftR * 2;
  ctx.lineCap = 'round';
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, topY);
  ctx.quadraticCurveTo(curveBowX, (topY + bottomY) * 0.48, 0, bottomY);
  ctx.strokeStyle = metal.highlight;
  ctx.lineWidth = shaftR * 0.7;
  ctx.lineCap = 'round';
  ctx.stroke();

  ctx.restore();

  // 2. Top Ball
  drawPolishedSphere(ctx, 0, topY, topBallR, metal, design.topGem);

  // 3. Bottom Charm
  const charmType = design.charm;
  if (charmType === 'heart') {
    drawHeartCharm(ctx, 0, bottomY + scale * 0.05, bottomBallR * 1.7, metal);
  } else if (charmType === 'lotus') {
    drawLotusCharm(ctx, 0, bottomY + scale * 0.05, bottomBallR * 1.8, metal);
  } else if (charmType === 'star') {
    drawStarCharm(ctx, 0, bottomY + scale * 0.05, bottomBallR * 1.8, metal);
  } else if (charmType === 'diamond_drop' || charmType === 'emerald_drop' || charmType === 'obsidian_drop') {
    const gemType = charmType === 'emerald_drop' ? 'emerald' : charmType === 'obsidian_drop' ? null : 'diamond';
    drawPolishedSphere(ctx, 0, bottomY, bottomBallR * 1.35, metal, gemType);
  } else {
    drawPolishedSphere(ctx, 0, bottomY, bottomBallR, metal, null);
  }
}
