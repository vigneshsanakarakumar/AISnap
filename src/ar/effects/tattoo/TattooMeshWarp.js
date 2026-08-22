/**
 * TattooMeshWarp — Triangle-based UV Mesh Warping & Surface Deformation
 * 4x4 Vertices (3x3 Grid Cells = 18 Triangles) with Single-Pass Offscreen Buffer Compositing
 */

export class TattooMeshWarp {
  constructor(gridCols = 4, gridRows = 4) {
    this.cols = gridCols; // 4 vertices
    this.rows = gridRows; // 4 vertices
    this.triangles = this.buildTriangles(gridCols, gridRows);
    
    // Dedicated Offscreen Buffer to render all triangles cleanly before multiply compositing
    this.warpCanvas = document.createElement('canvas');
    this.warpCtx = this.warpCanvas.getContext('2d');
  }

  buildTriangles(cols, rows) {
    const tris = [];
    for (let r = 0; r < rows - 1; r++) {
      for (let c = 0; c < cols - 1; c++) {
        const u0 = c / (cols - 1);
        const u1 = (c + 1) / (cols - 1);
        const v0 = r / (rows - 1);
        const v1 = (r + 1) / (rows - 1);

        // Triangle 1 (Top-Left, Top-Right, Bottom-Left)
        tris.push([
          { u: u0, v: v0, c, r },
          { u: u1, v: v0, c: c + 1, r },
          { u: u0, v: v1, c, r: r + 1 }
        ]);

        // Triangle 2 (Top-Right, Bottom-Right, Bottom-Left)
        tris.push([
          { u: u1, v: v0, c: c + 1, r },
          { u: u1, v: v1, c: c + 1, r: r + 1 },
          { u: u0, v: v1, c, r: r + 1 }
        ]);
      }
    }
    return tris;
  }

  // Calculate deformed destination vertices on skin
  computeDeformedVertices(pose, baseWidth, baseHeight, originX, originY) {
    const { scale, rotation, yaw, pitch } = pose;
    const w = baseWidth * scale;
    const h = baseHeight * scale;

    const vertices = [];
    const cosR = Math.cos(rotation);
    const sinR = Math.sin(rotation);

    // Clamped surface foreshortening factor based on yaw and pitch
    const clampedYaw = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, yaw));
    const clampedPitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, pitch));

    const yawSquish = Math.max(0.4, Math.cos(clampedYaw));
    const pitchSquish = Math.max(0.4, Math.cos(clampedPitch));

    for (let r = 0; r < this.rows; r++) {
      vertices[r] = [];
      const v = r / (this.rows - 1);
      const ny = (v - 0.5) * h * pitchSquish;

      for (let c = 0; c < this.cols; c++) {
        const u = c / (this.cols - 1);
        const nx = (u - 0.5) * w * yawSquish;

        // Surface anatomical curvature displacement
        const curveOffset = Math.sin(u * Math.PI) * (w * 0.08) * Math.sin(clampedYaw);

        // Rotate and translate relative to local bounding box
        const rx = (nx + curveOffset) * cosR - ny * sinR;
        const ry = (nx + curveOffset) * sinR + ny * cosR;

        vertices[r][c] = {
          x: originX + rx,
          y: originY + ry
        };
      }
    }

    return vertices;
  }

  // Render warped tattoo mesh into single offscreen canvas layer (Prevents dark seam multiply artifacts)
  renderWarpedLayer(texture, pose, baseWidth = 180, baseHeight = 180) {
    if (!texture || pose.confidence <= 0.01) return null;

    const pad = 40;
    const layerW = Math.ceil(baseWidth * pose.scale + pad * 2);
    const layerH = Math.ceil(baseHeight * pose.scale + pad * 2);

    const t0 = performance.now();
    if (this.warpCanvas.width !== layerW || this.warpCanvas.height !== layerH) {
      this.warpCanvas.width = layerW;
      this.warpCanvas.height = layerH;
    } else {
      this.warpCtx.clearRect(0, 0, layerW, layerH);
    }

    const localCenterX = layerW * 0.5;
    const localCenterY = layerH * 0.5;

    const vertices = this.computeDeformedVertices(pose, baseWidth, baseHeight, localCenterX, localCenterY);
    const texW = texture.width;
    const texH = texture.height;

    // Draw all triangles in source-over mode into the single offscreen buffer
    this.warpCtx.globalCompositeOperation = 'source-over';

    for (let i = 0; i < this.triangles.length; i++) {
      const tri = this.triangles[i];

      const p0 = vertices[tri[0].r][tri[0].c];
      const p1 = vertices[tri[1].r][tri[1].c];
      const p2 = vertices[tri[2].r][tri[2].c];

      const u0 = tri[0].u * texW;
      const v0 = tri[0].v * texH;
      const u1 = tri[1].u * texW;
      const v1 = tri[1].v * texH;
      const u2 = tri[2].u * texW;
      const v2 = tri[2].v * texH;

      this.drawTriangleSlice(this.warpCtx, texture, p0, p1, p2, u0, v0, u1, v1, u2, v2);
    }

    this.warpTimeMs = performance.now() - t0;

    return {
      canvas: this.warpCanvas,
      x: pose.x - localCenterX,
      y: pose.y - localCenterY,
      w: layerW,
      h: layerH
    };
  }

  // Draw an individual affine-transformed triangle slice
  drawTriangleSlice(ctx, img, p0, p1, p2, u0, v0, u1, v1, u2, v2) {
    ctx.save();

    // 1. Clip to destination triangle
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.closePath();
    ctx.clip();

    // 2. Compute 2D Affine Transformation Matrix
    const denom = u0 * (v1 - v2) - u1 * v0 + u2 * v0 + u1 * v2 - u2 * v1;
    if (Math.abs(denom) < 0.0001) {
      ctx.restore();
      return;
    }

    const a = -(v0 * (p1.x - p2.x) - v1 * p0.x + v2 * p0.x + v1 * p2.x - v2 * p1.x) / denom;
    const b = (v0 * (p1.y - p2.y) - v1 * p0.y + v2 * p0.y + v1 * p2.y - v2 * p1.y) / denom;
    const c = (u0 * (p1.x - p2.x) - u1 * p0.x + u2 * p0.x + u1 * p2.x - u2 * p1.x) / denom;
    const d = -(u0 * (p1.y - p2.y) - u1 * p0.y + u2 * p0.y + u1 * p2.y - u2 * p1.y) / denom;
    const e = (u0 * (v2 * p1.x - v1 * p2.x) + v0 * (u1 * p2.x - u2 * p1.x) + (u2 * v1 - u1 * v2) * p0.x) / denom;
    const f = (u0 * (v2 * p1.y - v1 * p2.y) + v0 * (u1 * p2.y - u2 * p1.y) + (u2 * v1 - u1 * v2) * p0.y) / denom;

    ctx.transform(a, b, c, d, e, f);
    ctx.drawImage(img, 0, 0);

    ctx.restore();
  }
}
