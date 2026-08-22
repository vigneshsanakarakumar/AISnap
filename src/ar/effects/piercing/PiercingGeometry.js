/**
 * PiercingGeometry — Procedural Canvas2D shapes for all jewelry types.
 * All draw functions are pure: they translate/rotate their own context save/restore.
 * No allocations. No per-frame canvases. Caller provides ctx + pre-translated origin.
 */
import { METAL_PALETTES, GEM_PALETTES } from './PiercingConfig.js';

// ─── helpers ────────────────────────────────────────────────────────────────

function metalGrad(ctx, x, y, r, palette) {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.05, x, y, r);
  g.addColorStop(0,    palette.highlight);
  g.addColorStop(0.28, palette.sheen);
  g.addColorStop(0.65, palette.mid);
  g.addColorStop(1,    palette.edge);
  return g;
}

function gemGrad(ctx, x, y, r, palette) {
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.05, x, y, r);
  g.addColorStop(0,    palette.highlight);
  g.addColorStop(0.25, palette.base);
  g.addColorStop(0.75, palette.inner);
  g.addColorStop(1,    palette.edge);
  return g;
}

function contactShadow(ctx, x, y, r, strength = 0.45) {
  const g = ctx.createRadialGradient(x, y + r * 0.7, 0, x, y + r * 0.7, r * 1.4);
  g.addColorStop(0,   `rgba(0,0,0,${strength})`);
  g.addColorStop(0.5, `rgba(0,0,0,${strength * 0.4})`);
  g.addColorStop(1,   'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.8, r * 1.1, r * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
}

// ─── STUD ────────────────────────────────────────────────────────────────────

/**
 * Draw a circular ear stud at canvas origin (0,0) with given radius.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} r  radius in canvas px
 * @param {string} metalKey  'silver' | 'gold' | 'black'
 * @param {string|null} gemKey  null | 'diamond' | 'aqua' | etc.
 */
export function drawStud(ctx, r, metalKey, gemKey) {
  const m = METAL_PALETTES[metalKey] || METAL_PALETTES.silver;

  // Contact shadow
  contactShadow(ctx, 0, 0, r);

  // Backing disk (bezel)
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = m.edge;
  ctx.fill();

  // Metal face
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.88, 0, Math.PI * 2);
  ctx.fillStyle = metalGrad(ctx, 0, 0, r * 0.88, m);
  ctx.fill();

  if (gemKey && GEM_PALETTES[gemKey]) {
    // Gem occupies 55% of stud face
    const gr = r * 0.55;
    const gp = GEM_PALETTES[gemKey];
    // gem body
    ctx.beginPath();
    ctx.arc(0, 0, gr, 0, Math.PI * 2);
    ctx.fillStyle = gemGrad(ctx, 0, 0, gr, gp);
    ctx.fill();
    // gem edge ring
    ctx.strokeStyle = gp.edge;
    ctx.lineWidth = 0.8;
    ctx.stroke();
    // specular point
    ctx.beginPath();
    ctx.arc(-gr * 0.3, -gr * 0.3, gr * 0.18, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fill();
  } else {
    // Specular highlight for plain metal
    const hg = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 0, -r * 0.3, -r * 0.3, r * 0.55);
    hg.addColorStop(0, 'rgba(255,255,255,0.7)');
    hg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.88, 0, Math.PI * 2);
    ctx.fillStyle = hg;
    ctx.fill();
  }
}

// ─── STAR STUD ───────────────────────────────────────────────────────────────

export function drawStarStud(ctx, r, metalKey) {
  const m = METAL_PALETTES[metalKey] || METAL_PALETTES.gold;
  contactShadow(ctx, 0, 0, r);

  const spikes = 5;
  const outer = r;
  const inner = r * 0.45;

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

  // Inner fill
  const innerStar = outer * 0.85;
  const innerInner = inner * 0.85;
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const angle = (i * Math.PI) / spikes - Math.PI / 2;
    const rad = i % 2 === 0 ? innerStar : innerInner;
    i === 0 ? ctx.moveTo(Math.cos(angle) * rad, Math.sin(angle) * rad)
            : ctx.lineTo(Math.cos(angle) * rad, Math.sin(angle) * rad);
  }
  ctx.closePath();
  ctx.fillStyle = metalGrad(ctx, 0, 0, innerStar, m);
  ctx.fill();

  // Centre gem
  const gp = GEM_PALETTES.star;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.28, 0, Math.PI * 2);
  ctx.fillStyle = gemGrad(ctx, 0, 0, r * 0.28, gp);
  ctx.fill();
}

// ─── HOOP ────────────────────────────────────────────────────────────────────

/**
 * Draw a hoop (torus ring) at canvas origin, facing camera.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} R  outer ring radius
 * @param {number} tubeR  tube thickness (cross-section radius)
 * @param {string} metalKey
 * @param {number} yawForeshorten  0..1 — how much the hoop narrows due to head rotation
 */
export function drawHoop(ctx, R, tubeR, metalKey, yawForeshorten = 1.0) {
  const m = METAL_PALETTES[metalKey] || METAL_PALETTES.silver;
  const scaleX = Math.max(0.15, yawForeshorten);

  contactShadow(ctx, 0, 0, R * 0.5);

  // Outer arc path (ellipse for foreshortening)
  ctx.save();
  ctx.scale(scaleX, 1);

  // Outer ring (edge/shadow side)
  ctx.beginPath();
  ctx.arc(0, 0, R + tubeR, 0, Math.PI * 2);
  ctx.arc(0, 0, R - tubeR, 0, Math.PI * 2, true);
  ctx.fillStyle = m.edge;
  ctx.fill('evenodd');

  // Metal sheen ring
  const ringGrad = ctx.createLinearGradient(-R, 0, R, 0);
  ringGrad.addColorStop(0,    m.highlight);
  ringGrad.addColorStop(0.25, m.mid);
  ringGrad.addColorStop(0.5,  m.edge);
  ringGrad.addColorStop(0.75, m.mid);
  ringGrad.addColorStop(1,    m.highlight);

  ctx.beginPath();
  ctx.arc(0, 0, R + tubeR * 0.8, 0, Math.PI * 2);
  ctx.arc(0, 0, R - tubeR * 0.8, 0, Math.PI * 2, true);
  ctx.fillStyle = ringGrad;
  ctx.fill('evenodd');

  ctx.restore();
}

// ─── BARBELL ──────────────────────────────────────────────────────────────────

/**
 * Draw a tongue barbell: cylinder shaft + two sphere balls.
 * ctx should be already translated so the barbell is centred at origin.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} length  shaft length
 * @param {number} ballR   ball radius
 * @param {string} metalKey
 * @param {string|null} gemKey  applies to top ball only
 * @param {boolean} doubled  if true, both balls are gems
 */
export function drawBarbell(ctx, length, ballR, metalKey, gemKey, doubled = false) {
  const m = METAL_PALETTES[metalKey] || METAL_PALETTES.silver;
  const shaftR = ballR * 0.45;
  const halfL = length / 2;

  // Contact shadow at bottom ball
  contactShadow(ctx, 0, halfL, ballR, 0.3);

  // Shaft (cylinder tube rendered as rectangle with gradient)
  const shaftGrad = ctx.createLinearGradient(-shaftR, 0, shaftR, 0);
  shaftGrad.addColorStop(0,    m.edge);
  shaftGrad.addColorStop(0.35, m.mid);
  shaftGrad.addColorStop(0.55, m.highlight);
  shaftGrad.addColorStop(0.8,  m.mid);
  shaftGrad.addColorStop(1,    m.edge);

  ctx.fillStyle = shaftGrad;
  ctx.beginPath();
  ctx.rect(-shaftR, -halfL + ballR * 0.6, shaftR * 2, length - ballR * 1.2);
  ctx.fill();

  // Bottom ball
  ctx.save();
  ctx.translate(0, halfL);
  _drawBall(ctx, ballR, m, doubled ? gemKey : null);
  ctx.restore();

  // Top ball
  ctx.save();
  ctx.translate(0, -halfL);
  _drawBall(ctx, ballR, m, gemKey);
  ctx.restore();
}

function _drawBall(ctx, r, palette, gemKey) {
  // Metal ring edge
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = palette.edge;
  ctx.fill();

  if (gemKey && GEM_PALETTES[gemKey]) {
    const gp = GEM_PALETTES[gemKey];
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.9, 0, Math.PI * 2);
    ctx.fillStyle = gemGrad(ctx, 0, 0, r * 0.9, gp);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-r * 0.28, -r * 0.28, r * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.9, 0, Math.PI * 2);
    ctx.fillStyle = metalGrad(ctx, 0, 0, r * 0.9, palette);
    ctx.fill();
    // specular
    ctx.beginPath();
    ctx.arc(-r * 0.28, -r * 0.28, r * 0.22, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fill();
  }
}

// ─── CURVED BARBELL (Navel) ───────────────────────────────────────────────────

/**
 * Draw a navel curved barbell. Top ball at top, curve bends downward,
 * bottom charm or ball at bottom.
 * ctx translated so mid-point of curve is at origin.
 */
export function drawCurvedBarbell(ctx, length, ballR, metalKey, charmKey) {
  const m = METAL_PALETTES[metalKey] || METAL_PALETTES.silver;
  const shaftR = ballR * 0.42;
  const halfL = length / 2;
  const bendY = halfL * 0.5;  // how far the curve bows outward

  // Draw curved shaft as a bezier stroke
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, -halfL);
  ctx.quadraticCurveTo(ballR * 2.5, 0, 0, halfL);
  ctx.strokeStyle = m.mid;
  ctx.lineWidth = shaftR * 2;
  ctx.lineCap = 'butt';
  ctx.stroke();

  // Edge shadow re-draw thinner
  ctx.beginPath();
  ctx.moveTo(0, -halfL);
  ctx.quadraticCurveTo(ballR * 2.5, 0, 0, halfL);
  ctx.strokeStyle = m.edge;
  ctx.lineWidth = shaftR * 2 + 2;
  ctx.stroke();

  // Highlight over-draw
  ctx.beginPath();
  ctx.moveTo(0, -halfL);
  ctx.quadraticCurveTo(ballR * 2.5, 0, 0, halfL);
  ctx.strokeStyle = m.highlight;
  ctx.lineWidth = shaftR * 0.6;
  ctx.stroke();
  ctx.restore();

  // Top ball
  ctx.save();
  ctx.translate(0, -halfL);
  _drawBall(ctx, ballR, m, null);
  ctx.restore();

  // Bottom ball / charm
  ctx.save();
  ctx.translate(0, halfL);
  if (charmKey && GEM_PALETTES[charmKey]) {
    _drawBall(ctx, ballR * 1.25, m, charmKey);
  } else {
    _drawBall(ctx, ballR, m, null);
  }
  ctx.restore();
}
