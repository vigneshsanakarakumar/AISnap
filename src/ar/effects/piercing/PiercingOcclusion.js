/**
 * PiercingOcclusion — Perspective foreshortening & anatomical occlusion helpers
 */

export class PiercingOcclusion {
  /**
   * Calculate yaw foreshortening factor (0.15 to 1.0)
   */
  static getEarForeshortening(yaw, side = 'left') {
    // When turning right (yaw > 0), left ear is more visible (1.0), right ear is foreshortened (< 0.5)
    if (side === 'left') {
      return Math.max(0.2, Math.min(1.0, 0.85 + yaw * 0.7));
    } else {
      return Math.max(0.2, Math.min(1.0, 0.85 - yaw * 0.7));
    }
  }

  /**
   * Check if point is inside mouth opening polygon
   */
  static isInsideMouth(point, mouthPolygon) {
    if (!mouthPolygon || mouthPolygon.length < 3) return true;
    let inside = false;
    for (let i = 0, j = mouthPolygon.length - 1; i < mouthPolygon.length; j = i++) {
      const xi = mouthPolygon[i].x, yi = mouthPolygon[i].y;
      const xj = mouthPolygon[j].x, yj = mouthPolygon[j].y;
      const intersect = ((yi > point.y) !== (yj > point.y)) &&
        (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }
}
