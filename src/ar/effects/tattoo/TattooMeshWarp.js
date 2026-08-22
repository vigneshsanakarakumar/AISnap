/**
 * TattooMeshWarp — Triangle-based UV Mesh Warping & Surface Deformation
 */

export class TattooMeshWarp {
  constructor(gridCols = 3, gridRows = 3) {
    this.cols = gridCols;
    this.rows = gridRows;
    this.triangles = this.buildTriangles(gridCols, gridRows);
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
  computeDeformedVertices(pose, baseWidth, baseHeight) {
    const { x, y, scale, rotation, yaw, pitch } = pose;
    const w = baseWidth * scale;
    const h = baseHeight * scale;

    const vertices = [];
    const cosR = Math.cos(rotation);
    const sinR = Math.sin(rotation);

    // Surface foreshortening factor based on head/body yaw
    const yawSquish = Math.cos(Math.min(Math.PI / 2.2, Math.abs(yaw) * 1.35));
    const pitchSquish = Math.cos(Math.min(Math.PI / 2.2, Math.abs(pitch) * 1.35));

    for (let r = 0; r < this.rows; r++) {
      vertices[r] = [];
      const v = r / (this.rows - 1);
      const ny = (v - 0.5) * h * pitchSquish;

      for (let c = 0; c < this.cols; c++) {
        const u = c / (this.cols - 1);
        const nx = (u - 0.5) * w * yawSquish;

        // Surface curvature displacement (simulates cylindrical anatomical surface)
        const curveOffset = Math.sin(u * Math.PI) * (w * 0.08) * Math.sin(yaw);

        // Rotate and translate to target skin coordinate
        const rx = (nx + curveOffset) * cosR - ny * sinR;
        const ry = (nx + curveOffset) * sinR + ny * cosR;

        vertices[r][c] = {
          x: x + rx,
          y: y + ry
        };
      }
    }

    return vertices;
  }

  // Render warped tattoo mesh onto target 2D canvas context
  renderWarpedMesh(ctx, texture, pose, baseWidth = 180, baseHeight = 180) {
    if (!texture || pose.confidence <= 0.01) return;

    const vertices = this.computeDeformedVertices(pose, baseWidth, baseHeight);
    const texW = texture.width;
    const texH = texture.height;

    for (let i = 0; i < this.triangles.length; i++) {
      const tri = this.triangles[i];

      // Destination points
      const p0 = vertices[tri[0].r][tri[0].c];
      const p1 = vertices[tri[1].r][tri[1].c];
      const p2 = vertices[tri[2].r][tri[2].c];

      // Source texture coordinates
      const u0 = tri[0].u * texW;
      const v0 = tri[0].v * texH;
      const u1 = tri[1].u * texW;
      const v1 = tri[1].v * texH;
      const u2 = tri[2].u * texW;
      const v2 = tri[2].v * texH;

      this.drawTriangleSlice(ctx, texture, p0, p1, p2, u0, v0, u1, v1, u2, v2);
    }
  }

  // Draw an individual affine-transformed triangle slice
  drawTriangleSlice(ctx, img, p0, p1, p2, u0, v0, u1, v1, u2, v2) {
    ctx.save();

    // 1. Clip to destination triangle with subtle seam feathering
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.closePath();
    ctx.clip();

    // 2. Compute 2D Affine Transformation Matrix
    // Solve: [x, y] = [u, v, 1] * Matrix
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
