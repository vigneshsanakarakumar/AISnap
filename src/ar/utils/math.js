/**
 * AR Math Utilities, Anatomical Extractors & Temporal Smoothing
 */

// Exponential Moving Average filter with adaptive acceleration
export class LandmarkSmoother {
  constructor(smoothingFactor = 0.5) {
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

      // Ultra-responsive high precision smoothing for real-time 60-120 FPS
      const dx = cur.x - prev.x;
      const dy = cur.y - prev.y;
      const dist = Math.hypot(dx, dy);
      const adaptiveFactor = dist > 0.02 ? 0.04 : dist > 0.005 ? 0.18 : 0.42;

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
 * Extract 468/478-point MediaPipe Face Landmark Geometry
 */
export function extractFaceGeometry(landmarks, width, height) {
  if (!landmarks || landmarks.length < 468) {
    return null;
  }

  const pt = (index) => {
    const lm = landmarks[index] || { x: 0.5, y: 0.5, z: 0 };
    return {
      x: lm.x * width,
      y: lm.y * height,
      z: (lm.z || 0) * width
    };
  };

  const leftEye = pt(33);
  const leftInner = pt(133);
  const leftCenter = pt(468) || pt(159);

  const rightEye = pt(263);
  const rightInner = pt(362);
  const rightCenter = pt(473) || pt(386);

  const noseBridge = pt(168);
  const noseTip = pt(1);
  const noseBottom = pt(2);
  const leftNostril = pt(98);
  const rightNostril = pt(327);

  const chin = pt(152);
  const forehead = pt(10);
  const leftForeheadTop = pt(103);
  const rightForeheadTop = pt(332);
  const leftEarTop = pt(127);
  const rightEarTop = pt(356);

  const leftCheek = pt(234);
  const rightCheek = pt(454);
  const leftCheekCenter = pt(117);
  const rightCheekCenter = pt(346);

  const upperLip = pt(13);
  const lowerLip = pt(14);
  const upperLipTop = pt(0);
  const lowerLipBottom = pt(17);
  const mouthLeft = pt(61);
  const mouthRight = pt(291);

  const eyeMidpoint = {
    x: (leftCenter.x + rightCenter.x) / 2,
    y: (leftCenter.y + rightCenter.y) / 2,
    z: (leftCenter.z + rightCenter.z) / 2
  };

  const eyeDistance = Math.hypot(rightCenter.x - leftCenter.x, rightCenter.y - leftCenter.y);
  const faceWidth = Math.hypot(rightCheek.x - leftCheek.x, rightCheek.y - leftCheek.y);
  const faceHeight = Math.hypot(chin.x - forehead.x, chin.y - forehead.y);
  const mouthOpen = Math.hypot(lowerLip.x - upperLip.x, lowerLip.y - upperLip.y);

  // 2D In-plane Roll
  const roll = Math.atan2(rightCenter.y - leftCenter.y, rightCenter.x - leftCenter.x);

  // Robust Scale-Invariant 3D Yaw (Head turning Left / Right)
  const dzCheek = (landmarks[454]?.z || 0) - (landmarks[234]?.z || 0);
  const dxCheek = (landmarks[454]?.x || 0.5) - (landmarks[234]?.x || 0.5);
  const zYaw = Math.atan2(dzCheek, Math.max(0.001, Math.abs(dxCheek)));
  const distLeftNose = Math.hypot(noseTip.x - leftEye.x, noseTip.y - leftEye.y);
  const distRightNose = Math.hypot(noseTip.x - rightEye.x, noseTip.y - rightEye.y);
  const geomYaw = Math.asin(Math.max(-0.95, Math.min(0.95, (distRightNose - distLeftNose) / (eyeDistance || 1))));
  const yaw = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, zYaw * 0.55 + geomYaw * 0.45));

  // Robust Scale-Invariant 3D Pitch (Head tilting Up / Down)
  const dzNoseForehead = (landmarks[152]?.z || 0) - (landmarks[10]?.z || 0);
  const dyNoseForehead = (landmarks[152]?.y || 0.5) - (landmarks[10]?.y || 0.5);
  const zPitch = Math.atan2(dzNoseForehead, Math.max(0.001, Math.abs(dyNoseForehead)));
  const geomPitch = ((noseTip.y - eyeMidpoint.y) / (faceHeight || 1) - 0.35) * 1.6;
  const pitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, zPitch * 0.55 + geomPitch * 0.45));

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
    leftNostril,
    rightNostril,
    chin,
    forehead,
    leftForeheadTop,
    rightForeheadTop,
    leftEarTop,
    rightEarTop,
    leftCheek,
    rightCheek,
    leftCheekCenter,
    rightCheekCenter,
    upperLip,
    lowerLip,
    upperLipTop,
    lowerLipBottom,
    mouthLeft,
    mouthRight,
    eyeDistance,
    faceWidth,
    faceHeight,
    mouthOpen,
    roll,
    yaw,
    pitch,
    rawLandmarks: landmarks,
    pt
  };
}

/**
 * Extract 21-point MediaPipe Hand Landmark Geometry
 */
export function extractHandGeometry(landmarks, width, height) {
  if (!landmarks || landmarks.length < 21) {
    return null;
  }

  const pt = (index) => {
    const lm = landmarks[index] || { x: 0.5, y: 0.5, z: 0 };
    return {
      x: lm.x * width,
      y: lm.y * height,
      z: (lm.z || 0) * width
    };
  };

  const wrist = pt(0);
  const thumbCmc = pt(1);
  const thumbMcp = pt(2);
  const thumbTip = pt(4);

  const indexMcp = pt(5);
  const indexTip = pt(8);

  const middleMcp = pt(9);
  const middleTip = pt(12);

  const ringMcp = pt(13);
  const pinkyMcp = pt(17);
  const pinkyTip = pt(20);

  // Palm Center & Forearm direction
  const palmCenter = {
    x: (wrist.x + middleMcp.x) * 0.5,
    y: (wrist.y + middleMcp.y) * 0.5,
    z: (wrist.z + middleMcp.z) * 0.5
  };

  const handSpan = Math.hypot(pinkyMcp.x - indexMcp.x, pinkyMcp.y - indexMcp.y);
  const handLength = Math.hypot(middleMcp.x - wrist.x, middleMcp.y - wrist.y);

  // Hand tilt angle (wrist to middle MCP vector)
  const angle = Math.atan2(middleMcp.y - wrist.y, middleMcp.x - wrist.x) - Math.PI / 2;

  // Hand yaw / pitch from 3D coords
  const dz = (middleMcp.z - wrist.z) / (handLength || 1);
  const pitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, Math.asin(Math.max(-1, Math.min(1, dz)))));

  return {
    wrist,
    thumbTip,
    indexMcp,
    indexTip,
    middleMcp,
    middleTip,
    ringMcp,
    pinkyMcp,
    pinkyTip,
    palmCenter,
    handSpan,
    handLength,
    angle,
    pitch,
    rawLandmarks: landmarks,
    pt
  };
}

/**
 * Extract 33-point MediaPipe Pose Landmark Geometry (Torso / Hips / Thighs)
 */
export function extractPoseGeometry(landmarks, width, height) {
  if (!landmarks || landmarks.length < 33) {
    return null;
  }

  const pt = (index) => {
    const lm = landmarks[index] || { x: 0.5, y: 0.5, z: 0, visibility: 0 };
    return {
      x: lm.x * width,
      y: lm.y * height,
      z: (lm.z || 0) * width,
      visibility: lm.visibility !== undefined ? lm.visibility : 1
    };
  };

  const leftShoulder = pt(11);
  const rightShoulder = pt(12);
  const leftElbow = pt(13);
  const rightElbow = pt(14);
  const leftWrist = pt(15);
  const rightWrist = pt(16);

  const leftHip = pt(23);
  const rightHip = pt(24);
  const leftKnee = pt(25);
  const rightKnee = pt(26);
  const leftAnkle = pt(27);
  const rightAnkle = pt(28);

  // Torso & Stomach Anchors
  const shoulderMid = {
    x: (leftShoulder.x + rightShoulder.x) * 0.5,
    y: (leftShoulder.y + rightShoulder.y) * 0.5
  };
  const hipMid = {
    x: (leftHip.x + rightHip.x) * 0.5,
    y: (leftHip.y + rightHip.y) * 0.5
  };

  // Stomach / Navel center (60% down from shoulders to hips)
  const stomachCenter = {
    x: shoulderMid.x * 0.4 + hipMid.x * 0.6,
    y: shoulderMid.y * 0.4 + hipMid.y * 0.6
  };

  const shoulderWidth = Math.hypot(rightShoulder.x - leftShoulder.x, rightShoulder.y - leftShoulder.y);
  const torsoHeight = Math.hypot(hipMid.x - shoulderMid.x, hipMid.y - shoulderMid.y);

  // Right & Left Thigh vectors (Hip to Knee)
  const rightThigh = {
    center: { x: (rightHip.x + rightKnee.x) * 0.5, y: (rightHip.y + rightKnee.y) * 0.5 },
    length: Math.hypot(rightKnee.x - rightHip.x, rightKnee.y - rightHip.y),
    angle: Math.atan2(rightKnee.y - rightHip.y, rightKnee.x - rightHip.x) - Math.PI / 2
  };

  const leftThigh = {
    center: { x: (leftHip.x + leftKnee.x) * 0.5, y: (leftHip.y + leftKnee.y) * 0.5 },
    length: Math.hypot(leftKnee.x - leftHip.x, leftKnee.y - leftHip.y),
    angle: Math.atan2(leftKnee.y - leftHip.y, leftKnee.x - leftHip.x) - Math.PI / 2
  };

  const torsoRoll = Math.atan2(rightShoulder.y - leftShoulder.y, rightShoulder.x - leftShoulder.x);

  return {
    leftShoulder,
    rightShoulder,
    shoulderMid,
    leftHip,
    rightHip,
    hipMid,
    stomachCenter,
    shoulderWidth,
    torsoHeight,
    torsoRoll,
    rightThigh,
    leftThigh,
    leftKnee,
    rightKnee,
    rawLandmarks: landmarks,
    pt
  };
}
