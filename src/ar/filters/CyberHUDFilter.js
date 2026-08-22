import { ARFilter } from './ARFilter.js';

export class CyberHUDFilter extends ARFilter {
  constructor() {
    super('cyber_hud', 'Cyber HUD', '🤖', 'Sci-Fi', 'Futuristic holographic biometric tracking reticle and HUD telemetry');
  }

  render(ctx, canvas, video, faceGeometry, timestamp = performance.now()) {
    const { width, height } = canvas;
    const time = timestamp * 0.002;

    // 1. High contrast sci-fi grade
    ctx.save();
    ctx.filter = 'contrast(125%) brightness(95%) saturate(120%)';
    ctx.drawImage(video, 0, 0, width, height);
    ctx.restore();

    // 2. Fullscreen digital scanlines
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
    for (let y = 0; y < height; y += 4) {
      ctx.fillRect(0, y, width, 1.5);
    }
    ctx.restore();

    if (!faceGeometry) {
      // Searching state HUD
      ctx.save();
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([8, 8]);
      ctx.strokeRect(width * 0.2, height * 0.2, width * 0.6, height * 0.6);
      ctx.fillStyle = '#22d3ee';
      ctx.font = '12px "JetBrains Mono", monospace';
      ctx.fillText('TARGET_SCANNING // ACQUIRING SUBJECT...', width * 0.22, height * 0.24);
      ctx.restore();
      return;
    }

    const { eyeMidpoint, faceWidth, faceHeight, roll, leftCenter, rightCenter, chin, forehead, yaw, pitch } = faceGeometry;

    ctx.save();
    ctx.translate(eyeMidpoint.x, eyeMidpoint.y);
    ctx.rotate(roll);

    const boxW = faceWidth * 1.35;
    const boxH = faceHeight * 1.25;

    // A. Holographic Bounding Box with Corner Accents
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 10;

    const cornerLen = 22;
    const halfW = boxW / 2;
    const halfH = boxH / 2;

    // Top-Left
    ctx.beginPath();
    ctx.moveTo(-halfW, -halfH + cornerLen);
    ctx.lineTo(-halfW, -halfH);
    ctx.lineTo(-halfW + cornerLen, -halfH);
    ctx.stroke();

    // Top-Right
    ctx.beginPath();
    ctx.moveTo(halfW - cornerLen, -halfH);
    ctx.lineTo(halfW, -halfH);
    ctx.lineTo(halfW, -halfH + cornerLen);
    ctx.stroke();

    // Bottom-Left
    ctx.beginPath();
    ctx.moveTo(-halfW, halfH - cornerLen);
    ctx.lineTo(-halfW, halfH);
    ctx.lineTo(-halfW + cornerLen, halfH);
    ctx.stroke();

    // Bottom-Right
    ctx.beginPath();
    ctx.moveTo(halfW - cornerLen, halfH);
    ctx.lineTo(halfW, halfH);
    ctx.lineTo(halfW, halfH - cornerLen);
    ctx.stroke();

    // B. Sweeping Vertical Laser Scanner
    const scanY = -halfH + ((timestamp * 0.2) % boxH);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-halfW, scanY);
    ctx.lineTo(halfW, scanY);
    ctx.stroke();

    // C. Rotating Target Rings on Forehead & Cheeks
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.arc(0, 0, boxW * 0.45, time, time + Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // D. Biometric Telemetry Display
    ctx.fillStyle = '#f8fafc';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillText(`TARGET_LOCK: 99.8% // VERIFIED`, -halfW + 6, -halfH - 10);
    ctx.fillText(`YAW: ${(yaw * 50).toFixed(1)}° | PITCH: ${(pitch * 50).toFixed(1)}°`, -halfW + 6, halfH + 16);
    ctx.fillText(`NEURAL_MESH_v4 // TRACKING`, halfW - 160, halfH + 16);

    ctx.restore();
  }
}
