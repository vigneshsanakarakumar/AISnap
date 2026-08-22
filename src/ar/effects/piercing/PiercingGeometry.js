/**
 * PiercingGeometry — High-Fidelity 3D Vector Procedural Navel Piercing Jewelry
 * Features realistic metallic reflections, ambient occlusion drop shadow, faceted gemstones, and shimmer.
 */
import { METAL_PALETTES, GEM_PALETTES } from './PiercingConfig.js';

// ─── UTILITIES ──────────────────────────────────────────────────────────────

function contactShadow(ctx, x, y, radius, opacity = 0.5) {
  ctx.save();
  const grad = ctx.createRadialGradient(x, y, radius * 0.1, x, y, radius * 2.2);
  grad.addColorStop(0, `rgba(0, 0, 0, ${opacity})`);
  grad.addColorStop(0.4, `rgba(0, 0, 0, ${opacity * 0.45})`);
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(x, y, radius * 1.8, radius * 0.8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPolishedBall(ctx, x, y, r, metalPalette, gemKey = null, time = 0) {
  // Ambient drop shadow beneath the ball
  contactShadow(ctx, x, y + r * 0.35, r, 0.42);

  // Outer bezel / edge dark rim
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = metalPalette.edge;
  ctx.fill();

  if (gemKey && GEM_PALETTES[gemKey]) {
    const gp = GEM_PALETTES[gemKey];
    const gr = r * 0.82;

    // Gemstone body gradient
    const gemGrad = ctx.createRadialGradient(x - gr * 0.35, y - gr * 0.35, gr * 0.05, x, y, gr);
    gemGrad.addColorStop(0, gp.highlight);
    gemGrad.addColorStop(0.25, gp.base);
    gemGrad.addColorStop(0.7, gp.inner);
    gemGrad.addColorStop(1, gp.deep);

    ctx.beginPath();
    ctx.arc(x, y, gr, 0, Math.PI * 2);
    ctx.fillStyle = gemGrad;
    ctx.fill();

    // Gem facet internal prism lines
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * gr * 0.9, y + Math.sin(a) * gr * 0.9);
    }
    ctx.stroke();
    ctx.restore();

    // Primary bright specular glint
    ctx.beginPath();
    ctx.arc(x - gr * 0.35, y - gr * 0.35, gr * 0.25, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.fill();

    // Dynamic gemstone sparkle flare
    const sparklePhase = (time * 3.5 + x) % (Math.PI * 2);
    const sparkleIntensity = Math.max(0, Math.sin(sparklePhase));
    if (sparkleIntensity > 0.4) {
      const arm = gr * 0.7 * sparkleIntensity;
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x - gr * 0.35 - arm, y - gr * 0.35);
      ctx.lineTo(x - gr * 0.35 + arm, y - gr * 0.35);
      ctx.moveTo(x - gr * 0.35, y - gr * 0.35 - arm);
      ctx.lineTo(x - gr * 0.35, y - gr * 0.35 + arm);
      ctx.stroke();
      ctx.restore();
    }
  } else {
    // Solid Polished Metallic sphere
    const metalGrad = ctx.createRadialGradient(x - r * 0.38, y - r * 0.38, r * 0.05, x, y, r);
    metalGrad.addColorStop(0, metalPalette.highlight);
    metalGrad.addColorStop(0.22, metalPalette.sheen);
    metalGrad.addColorStop(0.65, metalPalette.mid);
    metalGrad.addColorStop(0.9, metalPalette.darkMid);
    metalGrad.addColorStop(1, metalPalette.edge);

    ctx.beginPath();
    ctx.arc(x, y, r * 0.92, 0, Math.PI * 2);
    ctx.fillStyle = metalGrad;
    ctx.fill();

    // Specular highlight spot
    ctx.beginPath();
    ctx.arc(x - r * 0.32, y - r * 0.32, r * 0.22, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
    ctx.fill();
  }
}

// ─── CHARM DRAWERS ──────────────────────────────────────────────────────────

function drawHeartCharm(ctx, x, y, size, metalPalette, gemKey, time) {
  contactShadow(ctx, x, y + size * 0.4, size * 0.8, 0.45);

  ctx.save();
  ctx.translate(x, y);

  // Heart path
  const w = size;
  const h = size * 0.95;

  ctx.beginPath();
  ctx.moveTo(0, h * 0.35);
  ctx.bezierCurveTo(-w * 0.55, -h * 0.45, -w * 0.55, h * 0.35, 0, h * 0.55);
  ctx.bezierCurveTo(w * 0.55, h * 0.35, w * 0.55, -h * 0.45, 0, h * 0.35);
  ctx.closePath();

  // Edge bezel
  ctx.fillStyle = metalPalette.edge;
  ctx.fill();
  ctx.strokeStyle = metalPalette.mid;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Heart jewel fill
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

  // Heart Glint
  ctx.beginPath();
  ctx.arc(-w * 0.18, -h * 0.05, w * 0.12, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.fill();

  ctx.restore();
}

function drawLotusCharm(ctx, x, y, size, metalPalette, time) {
  contactShadow(ctx, x, y + size * 0.4, size * 0.8, 0.4);

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

  // Central opal gem
  const gp = GEM_PALETTES.opal;
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.28, 0, Math.PI * 2);
  ctx.fillStyle = gp.deep;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.22, 0, Math.PI * 2);
  ctx.fillStyle = gp.base;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(-size * 0.06, -size * 0.06, size * 0.08, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  ctx.restore();
}

function drawStarCharm(ctx, x, y, size, metalPalette, time) {
  contactShadow(ctx, x, y + size * 0.4, size * 0.8, 0.45);

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

  // Central sparkling diamond
  drawPolishedBall(ctx, 0, 0, size * 0.22, metalPalette, 'diamond', time);

  ctx.restore();
}

// ─── MASTER CURVED NAVEL JEWELRY RENDERER ───────────────────────────────────

/**
 * Draw complete realistic Navel Barbell with perspective 3D curvature and lighting
 */
export function drawNavelJewelry(ctx, design, scale, yaw = 0, time = 0) {
  const metal = METAL_PALETTES[design.metal] || METAL_PALETTES.silver;

  const totalHeight = scale * 1.8;
  const topBallR = scale * 0.24;
  const bottomBallR = scale * 0.42;
  const shaftR = scale * 0.08;

  const topY = -totalHeight * 0.42;
  const bottomY = totalHeight * 0.35;

  // Perspective curve bowing with torso twist/yaw
  const curveBowX = (scale * 0.38) + (yaw * scale * 0.4);

  // 1. Curved 3D Shaft (rendered as seamless bezier tube with specular sheen)
  ctx.save();
  
  // Dark edge tube pass
  ctx.beginPath();
  ctx.moveTo(0, topY);
  ctx.quadraticCurveTo(curveBowX, (topY + bottomY) * 0.48, 0, bottomY);
  ctx.strokeStyle = metal.edge;
  ctx.lineWidth = shaftR * 2 + 1.6;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Metallic midtone tube pass
  ctx.beginPath();
  ctx.moveTo(0, topY);
  ctx.quadraticCurveTo(curveBowX, (topY + bottomY) * 0.48, 0, bottomY);
  ctx.strokeStyle = metal.mid;
  ctx.lineWidth = shaftR * 2;
  ctx.lineCap = 'round';
  ctx.stroke();

  // High-reflection specular tube pass
  ctx.beginPath();
  ctx.moveTo(0, topY);
  ctx.quadraticCurveTo(curveBowX, (topY + bottomY) * 0.48, 0, bottomY);
  ctx.strokeStyle = metal.highlight;
  ctx.lineWidth = shaftR * 0.7;
  ctx.lineCap = 'round';
  ctx.stroke();

  ctx.restore();

  // 2. Top Ball (upper rim of navel piercing)
  drawPolishedBall(ctx, 0, topY, topBallR, metal, design.topGem, time);

  // 3. Bottom Main Feature / Charm / Jewel (sitting inside belly button depression)
  const charmType = design.charm;

  if (charmType === 'heart') {
    drawHeartCharm(ctx, 0, bottomY + scale * 0.05, bottomBallR * 1.7, metal, 'crystal', time);
  } else if (charmType === 'lotus') {
    drawLotusCharm(ctx, 0, bottomY + scale * 0.05, bottomBallR * 1.8, metal, time);
  } else if (charmType === 'star') {
    drawStarCharm(ctx, 0, bottomY + scale * 0.05, bottomBallR * 1.8, metal, time);
  } else if (charmType === 'diamond_drop' || charmType === 'emerald_drop' || charmType === 'obsidian_drop') {
    const gemType = charmType === 'emerald_drop' ? 'emerald' : charmType === 'obsidian_drop' ? null : 'diamond';
    drawPolishedBall(ctx, 0, bottomY, bottomBallR * 1.35, metal, gemType, time);
  } else {
    // Classic large polished bottom ball / gem
    drawPolishedBall(ctx, 0, bottomY, bottomBallR, metal, null, time);
  }
}
