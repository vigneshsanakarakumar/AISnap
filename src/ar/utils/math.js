/**
 * AR Math Utilities & Temporal Smoothing
 */

// Exponential Moving Average filter for smooth tracking without jitter
export class LandmarkSmoother {
  constructor(smoothingFactor = 0.65) {
    this.factor = smoothingFactor;
    this.previous = null;
  }

  smooth(currentLandmarks) {
    if (!currentLandmarks || currentLandmarks.length === 0) {
      this.previous = null;
      return null;
    }

    if (!this.previous || this.previous.length !== currentLandmarks.length) {
      this.previous = currentLandmarks.map((lm) => ({ ...lm }));
      return this.previous;
    }

    const smoothed = [];
    for (let i = 0; i < currentLandmarks.length; i++) {
      const cur = currentLandmarks[i];
      const prev = this.previous[i];

      // Dynamic smoothing: adapt alpha based on velocity to reduce lag on fast motion
      const dx = cur.x - prev.x;
      const dy = cur.y - prev.y;
      const dist = Math.hypot(dx, dy);
      const adaptiveFactor = dist > 0.05 ? 0.3 : dist > 0.01 ? 0.5 : this.factor;

      const sx = prev.x * adaptiveFactor + cur.x * (1 - adaptiveFactor);
      const sy = prev.y * adaptiveFactor + cur.y * (1 - adaptiveFactor);
      const sz = (prev.z || 0) * adaptiveFactor + (cur.z || 0) * (1 - adaptiveFactor);

      smoothed.push({ x: sx, y: sy, z: sz });
    }

    this.previous = smoothed;
    return smoothed;
  }

  reset() {
    this.previous = null;
  }
}

/**
 * Calculate geometric metrics from face landmarks
 */
export function extractFaceGeometry(landmarks, width, height) {
  if (!landmarks || landmarks.length < 468) {
    return null;
  }

  // Helper to convert normalized coordinate to canvas pixels
  const pt = (index) => {
    const lm = landmarks[index] || { x: 0.5, y: 0.5, z: 0 };
    return {
      x: lm.x * width,
      y: lm.y * height,
      z: (lm.z || 0) * width
    };
  };

  // Key landmark indices (MediaPipe 468/478 face mesh standard)
  const leftEye = pt(33);      // Left outer corner
  const leftInner = pt(133);   // Left inner corner
  const leftCenter = pt(468) || pt(159); // Left pupil/center

  const rightEye = pt(263);    // Right outer corner
  const rightInner = pt(362);  // Right inner corner
  const rightCenter = pt(473) || pt(386); // Right pupil/center

  const noseBridge = pt(168);  // Glabella / Mid eyes
  const noseTip = pt(1);       // Nose apex
  const noseBottom = pt(2);    // Subnasale
  const chin = pt(152);        // Menton / Chin bottom
  const forehead = pt(10);     // Forehead apex
  const leftCheek = pt(234);   // Left zygomatic arch
  const rightCheek = pt(454);  // Right zygomatic arch
  const upperLip = pt(13);
  const lowerLip = pt(14);
  const mouthLeft = pt(61);
  const mouthRight = pt(291);

  // Eye midpoint
  const eyeMidpoint = {
    x: (leftCenter.x + rightCenter.x) / 2,
    y: (leftCenter.y + rightCenter.y) / 2,
    z: (leftCenter.z + rightCenter.z) / 2
  };

  // Inter-pupillary distance & Face width
  const eyeDistance = Math.hypot(rightCenter.x - leftCenter.x, rightCenter.y - leftCenter.y);
  const faceWidth = Math.hypot(rightCheek.x - leftCheek.x, rightCheek.y - leftCheek.y);
  const faceHeight = Math.hypot(chin.x - forehead.x, chin.y - forehead.y);

  // Roll (tilt angle in radians)
  const roll = Math.atan2(rightCenter.y - leftCenter.y, rightCenter.x - leftCenter.x);

  // Yaw & Pitch approximations
  const yaw = (noseTip.x - eyeMidpoint.x) / (faceWidth * 0.5 || 1);
  const pitch = (noseTip.y - eyeMidpoint.y) / (faceHeight * 0.5 || 1);

  return {
    leftCenter,
    rightCenter,
    leftEye,
    rightEye,
    leftInner,
    rightInner,
    eyeMidpoint,
    noseBridge,
    noseTip,
    noseBottom,
    chin,
    forehead,
    leftCheek,
    rightCheek,
    upperLip,
    lowerLip,
    mouthLeft,
    mouthRight,
    eyeDistance,
    faceWidth,
    faceHeight,
    roll,
    yaw,
    pitch,
    rawLandmarks: landmarks
  };
}
