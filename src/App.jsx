import React, { useState, useEffect, useRef, Component } from 'react';

// Error Boundary
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '32px', backgroundColor: '#09090c', color: '#f87171', minHeight: '100vh', fontFamily: 'monospace' }}>
          <h2>⚠️ Interface Runtime Error</h2>
          <pre style={{ marginTop: '12px', background: '#000', padding: '16px', borderRadius: '8px', color: '#fca5a5' }}>
            {this.state.error?.toString()}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: '20px', padding: '10px 20px', background: '#fff', color: '#000', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Reload App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const CUTE_LENSES = [
  { id: 'dog_lens', name: 'Puppy', icon: '🐶', theme: '#f59e0b', css: 'contrast(105%) brightness(105%)', overlay: 'dog' },
  { id: 'cat_lens', name: 'Kitty', icon: '🐱', theme: '#ec4899', css: 'contrast(110%) saturate(125%)', overlay: 'cat' },
  { id: 'bunny_lens', name: 'Bunny', icon: '🐰', theme: '#f472b6', css: 'brightness(110%) contrast(105%)', overlay: 'bunny' },
  { id: 'sakura_crown', name: 'Sakura', icon: '🌸', theme: '#fb7185', css: 'saturate(130%) brightness(105%)', overlay: 'sakura' },
  { id: 'star_crown', name: 'Tiara', icon: '👑', theme: '#eab308', css: 'brightness(110%) contrast(110%)', overlay: 'crown' },
  { id: 'cyber_visor', name: 'Visor', icon: '🕶️', theme: '#38bdf8', css: 'contrast(120%)', overlay: 'visor' },
  { id: 'pop_comic', name: 'Comic', icon: '💥', theme: '#a855f7', css: 'saturate(250%) contrast(140%) brightness(105%)', overlay: 'dots' },
  { id: 'silver_ai', name: 'Chrome', icon: '🤖', theme: '#94a3b8', css: 'grayscale(100%) contrast(160%) brightness(110%)', overlay: 'neural' },
  { id: 'raw', name: 'Original', icon: '📷', theme: '#64748b', css: 'none', overlay: null }
];

// Receiver Component for dedicated '/aa' route
function DedicatedReceiver() {
  const [remoteImage, setRemoteImage] = useState(null);
  const [remoteFilterName, setRemoteFilterName] = useState('RAW');
  const [remoteFilterIcon, setRemoteFilterIcon] = useState('📷');
  const [remoteTimestamp, setRemoteTimestamp] = useState(null);
  const [receiverStatus, setReceiverStatus] = useState('Awaiting Live Broadcast...');
  const [receiverFps, setReceiverFps] = useState(0);

  const receiverFrameCountRef = useRef(0);
  const receiverLastFpsUpdateRef = useRef(Date.now());

  useEffect(() => {
    let channel = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        channel = new BroadcastChannel('snap_filter_broadcast_stream');

        channel.onmessage = (event) => {
          try {
            const { type, data, filterName, filterIcon, timestamp } = event.data || {};
            if (type === 'SNAP_FRAME') {
              setRemoteImage(data);
              setRemoteFilterName(filterName || 'Filter');
              setRemoteFilterIcon(filterIcon || '✨');
              setRemoteTimestamp(timestamp || new Date().toLocaleTimeString());
              setReceiverStatus('CONNECTED');

              receiverFrameCountRef.current += 1;
              const now = Date.now();
              if (now - receiverLastFpsUpdateRef.current >= 1000) {
                setReceiverFps(receiverFrameCountRef.current);
                receiverFrameCountRef.current = 0;
                receiverLastFpsUpdateRef.current = now;
              }
            } else if (type === 'SNAP_STREAM_CLOSED') {
              setRemoteImage(null);
              setReceiverStatus('BROADCAST ENDED');
              setReceiverFps(0);
            }
          } catch (e) {
            console.error('Channel error:', e);
          }
        };
      }
    } catch (err) {
      console.warn('BroadcastChannel error:', err);
    }

    return () => {
      if (channel) {
        try {
          channel.close();
        } catch (e) {}
      }
    };
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#060609',
      color: '#f8fafc'
    }}>
      {/* Sleek Top Header */}
      <header style={{
        padding: '16px 20px',
        backgroundColor: 'rgba(15, 15, 20, 0.85)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '15px'
          }}>
            📡
          </div>
          <div>
            <h1 style={{ fontSize: '15px', fontWeight: '800', letterSpacing: '-0.01em', color: '#ffffff' }}>
              Live Receiver Portal
            </h1>
            <p style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>
              PORTAL // /aa
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <span style={{
            padding: '4px 10px',
            borderRadius: '999px',
            fontSize: '11px',
            fontWeight: '700',
            backgroundColor: remoteImage ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255, 255, 255, 0.06)',
            color: remoteImage ? '#4ade80' : '#94a3b8',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            {remoteImage ? `LIVE ${receiverFps} FPS` : 'STANDBY'}
          </span>
          {remoteImage && (
            <span style={{
              padding: '4px 10px',
              borderRadius: '999px',
              fontSize: '11px',
              fontWeight: '700',
              backgroundColor: 'rgba(236, 72, 153, 0.15)',
              border: '1px solid rgba(236, 72, 153, 0.3)',
              color: '#f472b6'
            }}>
              {remoteFilterIcon} {remoteFilterName}
            </span>
          )}
        </div>
      </header>

      {/* Main Receiver Content */}
      <main style={{ flex: 1, padding: '16px', maxWidth: '720px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{
          backgroundColor: '#0f0f14',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '20px',
          overflow: 'hidden',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7)'
        }}>
          <div style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '3/4',
            maxHeight: '70vh',
            backgroundColor: '#000000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {remoteImage ? (
              <img
                src={remoteImage}
                alt="Live Broadcast"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.1), rgba(139, 92, 246, 0.1))',
                  border: '1px dashed rgba(255, 255, 255, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px auto',
                  fontSize: '28px'
                }}>
                  ✨
                </div>
                <div style={{ fontSize: '16px', fontWeight: '800', color: '#ffffff' }}>
                  {receiverStatus}
                </div>
                <p style={{ fontSize: '12px', color: '#64748b', marginTop: '6px', maxWidth: '280px', margin: '6px auto 0 auto' }}>
                  Waiting for host to start camera & broadcast in the main studio
                </p>
              </div>
            )}
          </div>

          {remoteTimestamp && (
            <div style={{ padding: '12px 18px', fontSize: '11px', color: '#64748b', textAlign: 'right', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
              SYNCED AT: <span style={{ color: '#cbd5e1' }}>{remoteTimestamp}</span>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// Main Cute SnapAI Studio
function SnapStudio() {
  const [stream, setStream] = useState(null);
  const [activeFilter, setActiveFilter] = useState(CUTE_LENSES[0]);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [fps, setFps] = useState(0);
  const [errorMsg, setErrorMsg] = useState(null);
  const [facingMode, setFacingMode] = useState('user'); // 'user' (front) | 'environment' (back)
  const [snapshotEffect, setSnapshotEffect] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const broadcastChannelRef = useRef(null);
  const animationFrameRef = useRef(null);
  const lastFrameTimeRef = useRef(Date.now());
  const frameCountRef = useRef(0);
  const lastFpsUpdateRef = useRef(Date.now());

  useEffect(() => {
    let channel = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        channel = new BroadcastChannel('snap_filter_broadcast_stream');
        broadcastChannelRef.current = channel;
      }
    } catch (err) {
      console.warn('BroadcastChannel init error:', err);
    }

    return () => {
      if (channel) {
        try {
          channel.close();
        } catch (e) {}
        broadcastChannelRef.current = null;
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Request user camera
  const startCamera = async (facing = facingMode) => {
    setErrorMsg(null);
    try {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 720 },
          height: { ideal: 960 }
        },
        audio: false
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch((e) => console.warn('Play error:', e));
      }

      startRenderLoop();
    } catch (err) {
      setErrorMsg(err.name + ': ' + err.message);
    }
  };

  const flipCamera = () => {
    const newFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacing);
    if (stream) {
      startCamera(newFacing);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {}
      });
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    if (broadcastChannelRef.current) {
      try {
        broadcastChannelRef.current.postMessage({ type: 'SNAP_STREAM_CLOSED' });
      } catch (e) {}
    }

    setStream(null);
    setIsBroadcasting(false);
    setFps(0);
  };

  // Capture snapshot image
  const capturePhoto = () => {
    if (canvasRef.current && stream) {
      setSnapshotEffect(true);
      setTimeout(() => setSnapshotEffect(false), 200);

      try {
        const imageURL = canvasRef.current.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `SnapAI_${activeFilter.name}_${Date.now()}.png`;
        link.href = imageURL;
        link.click();
      } catch (e) {
        console.error('Snapshot error:', e);
      }
    }
  };

  const startRenderLoop = () => {
    const render = () => {
      if (videoRef.current && canvasRef.current && videoRef.current.readyState >= 2) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;

        ctx.save();
        if (activeFilter.css && activeFilter.css !== 'none') {
          ctx.filter = activeFilter.css;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        ctx.restore();

        // Draw Beautiful AR Lens Overlays
        drawCuteLensOverlay(ctx, canvas.width, canvas.height, activeFilter.overlay);

        frameCountRef.current += 1;
        const now = Date.now();
        if (now - lastFpsUpdateRef.current >= 1000) {
          setFps(frameCountRef.current);
          frameCountRef.current = 0;
          lastFpsUpdateRef.current = now;
        }

        if (isBroadcasting && broadcastChannelRef.current) {
          if (now - lastFrameTimeRef.current > 45) {
            try {
              const frameData = canvas.toDataURL('image/jpeg', 0.6);
              broadcastChannelRef.current.postMessage({
                type: 'SNAP_FRAME',
                data: frameData,
                filterName: activeFilter.name,
                filterIcon: activeFilter.icon,
                timestamp: new Date().toLocaleTimeString()
              });
              lastFrameTimeRef.current = now;
            } catch (e) {
              console.warn('Broadcast frame error:', e);
            }
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();
  };

  const drawRoundRect = (ctx, x, y, w, h, r) => {
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(x, y, w, h, r);
    } else {
      ctx.rect(x, y, w, h);
    }
  };

  // Draw Cute & Beautiful AR Lenses
  const drawCuteLensOverlay = (ctx, width, height, overlayType) => {
    const cx = width / 2;
    const cy = height / 2;
    const time = Date.now() / 300;

    if (overlayType === 'dog') {
      ctx.save();
      // Fluffy Dog Ears
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.ellipse(cx - (width * 0.22), cy - (height * 0.28), width * 0.07, height * 0.16, -0.38, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fbcfe8';
      ctx.beginPath();
      ctx.ellipse(cx - (width * 0.22), cy - (height * 0.27), width * 0.04, height * 0.11, -0.38, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.ellipse(cx + (width * 0.22), cy - (height * 0.28), width * 0.07, height * 0.16, 0.38, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fbcfe8';
      ctx.beginPath();
      ctx.ellipse(cx + (width * 0.22), cy - (height * 0.27), width * 0.04, height * 0.11, 0.38, 0, Math.PI * 2);
      ctx.fill();

      // Dog Button Nose
      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      drawRoundRect(ctx, cx - 28, cy - 12, 56, 38, 16);
      ctx.fill();

      // Nose highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.beginPath();
      ctx.arc(cx - 10, cy - 2, 6, 0, Math.PI * 2);
      ctx.fill();

      // Cute Tongue
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      drawRoundRect(ctx, cx - 18, cy + 30, 36, 46, 18);
      ctx.fill();
      ctx.strokeStyle = '#be123c';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy + 34);
      ctx.lineTo(cx, cy + 62);
      ctx.stroke();

      ctx.restore();
    } else if (overlayType === 'cat') {
      ctx.save();
      // Kitty Pointy Ears
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#f472b6';
      ctx.lineWidth = 3.5;

      // Left Ear
      ctx.beginPath();
      ctx.moveTo(cx - (width * 0.22), cy - (height * 0.16));
      ctx.lineTo(cx - (width * 0.16), cy - (height * 0.36));
      ctx.lineTo(cx - (width * 0.07), cy - (height * 0.18));
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#f472b6';
      ctx.beginPath();
      ctx.moveTo(cx - (width * 0.2), cy - (height * 0.17));
      ctx.lineTo(cx - (width * 0.16), cy - (height * 0.31));
      ctx.lineTo(cx - (width * 0.09), cy - (height * 0.18));
      ctx.closePath();
      ctx.fill();

      // Right Ear
      ctx.fillStyle = '#1e1b4b';
      ctx.beginPath();
      ctx.moveTo(cx + (width * 0.22), cy - (height * 0.16));
      ctx.lineTo(cx + (width * 0.16), cy - (height * 0.36));
      ctx.lineTo(cx + (width * 0.07), cy - (height * 0.18));
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#f472b6';
      ctx.beginPath();
      ctx.moveTo(cx + (width * 0.2), cy - (height * 0.17));
      ctx.lineTo(cx + (width * 0.16), cy - (height * 0.31));
      ctx.lineTo(cx + (width * 0.09), cy - (height * 0.18));
      ctx.closePath();
      ctx.fill();

      // Pink Nose
      ctx.fillStyle = '#f472b6';
      ctx.beginPath();
      ctx.moveTo(cx - 16, cy - 10);
      ctx.lineTo(cx + 16, cy - 10);
      ctx.lineTo(cx, cy + 12);
      ctx.closePath();
      ctx.fill();

      // Whiskers
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx - 35, cy - 2);
      ctx.lineTo(cx - 120, cy - 15);
      ctx.moveTo(cx - 35, cy + 6);
      ctx.lineTo(cx - 125, cy + 10);
      ctx.moveTo(cx - 35, cy + 14);
      ctx.lineTo(cx - 115, cy + 30);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx + 35, cy - 2);
      ctx.lineTo(cx + 120, cy - 15);
      ctx.moveTo(cx + 35, cy + 6);
      ctx.lineTo(cx + 125, cy + 10);
      ctx.moveTo(cx + 35, cy + 14);
      ctx.lineTo(cx + 115, cy + 30);
      ctx.stroke();

      ctx.restore();
    } else if (overlayType === 'bunny') {
      ctx.save();
      // Tall Bunny Ears
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#f472b6';
      ctx.lineWidth = 3;

      // Left Bunny Ear
      ctx.beginPath();
      ctx.ellipse(cx - (width * 0.14), cy - (height * 0.34), width * 0.06, height * 0.2, -0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fbcfe8';
      ctx.beginPath();
      ctx.ellipse(cx - (width * 0.14), cy - (height * 0.33), width * 0.035, height * 0.14, -0.15, 0, Math.PI * 2);
      ctx.fill();

      // Right Bunny Ear
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(cx + (width * 0.14), cy - (height * 0.34), width * 0.06, height * 0.2, 0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fbcfe8';
      ctx.beginPath();
      ctx.ellipse(cx + (width * 0.14), cy - (height * 0.33), width * 0.035, height * 0.14, 0.15, 0, Math.PI * 2);
      ctx.fill();

      // Cute Twitchy Pink Nose
      ctx.fillStyle = '#fb7185';
      ctx.beginPath();
      ctx.ellipse(cx, cy + 4, 14, 10, 0, 0, Math.PI * 2);
      ctx.fill();

      // Bunny Cheek Blush
      ctx.fillStyle = 'rgba(251, 113, 133, 0.35)';
      ctx.beginPath();
      ctx.ellipse(cx - 75, cy + 20, 24, 14, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + 75, cy + 20, 24, 14, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    } else if (overlayType === 'sakura') {
      ctx.save();
      // Floating Sakura Blossom Crown
      const crownY = cy - (height * 0.3) + Math.sin(time) * 6;

      for (let i = -3; i <= 3; i++) {
        const flowerX = cx + (i * (width * 0.08));
        const flowerY = crownY + Math.abs(i) * 8;
        
        // Draw 5 Sakura Petals
        ctx.fillStyle = i % 2 === 0 ? '#fbcfe8' : '#f472b6';
        for (let p = 0; p < 5; p++) {
          const angle = (p * Math.PI * 2) / 5 + (time * 0.5);
          const px = flowerX + Math.cos(angle) * 14;
          const py = flowerY + Math.sin(angle) * 14;
          ctx.beginPath();
          ctx.arc(px, py, 9, 0, Math.PI * 2);
          ctx.fill();
        }
        // Flower Center
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(flowerX, flowerY, 6, 0, Math.PI * 2);
        ctx.fill();
      }

      // Orbiting Sparkle Petals
      for (let s = 0; s < 6; s++) {
        const sx = cx + Math.cos(time + s * 1.1) * (width * 0.3);
        const sy = crownY + Math.sin(time * 1.5 + s) * 35;
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.arc(sx, sy, 3 + Math.sin(time * 2 + s) * 2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    } else if (overlayType === 'crown') {
      ctx.save();
      const floatY = cy - (height * 0.3) + Math.sin(time) * 6;

      ctx.fillStyle = 'rgba(234, 179, 8, 0.92)';
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 3;

      ctx.beginPath();
      ctx.moveTo(cx - 90, floatY);
      ctx.lineTo(cx - 80, floatY - 50);
      ctx.lineTo(cx - 40, floatY - 20);
      ctx.lineTo(cx, floatY - 75);
      ctx.lineTo(cx + 40, floatY - 20);
      ctx.lineTo(cx + 80, floatY - 50);
      ctx.lineTo(cx + 90, floatY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ec4899';
      ctx.beginPath();
      ctx.arc(cx, floatY - 60, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(cx - 70, floatY - 40, 6, 0, Math.PI * 2);
      ctx.arc(cx + 70, floatY - 40, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    } else if (overlayType === 'visor') {
      ctx.save();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;

      ctx.beginPath();
      drawRoundRect(ctx, cx - 130, cy - 35, 260, 48, 8);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx - 110, cy - 11);
      ctx.lineTo(cx + 110, cy - 11);
      ctx.stroke();

      ctx.restore();
    } else if (overlayType === 'neural') {
      ctx.save();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 6]);
      ctx.strokeRect(cx - 100, cy - 110, 200, 230);

      ctx.setLineDash([]);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 2;
      const scanY = (cy - 110) + ((Date.now() / 8) % 230);
      ctx.beginPath();
      ctx.moveTo(cx - 100, scanY);
      ctx.lineTo(cx + 100, scanY);
      ctx.stroke();

      ctx.restore();
    } else if (overlayType === 'dots') {
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
      for (let x = 0; x < width; x += 16) {
        for (let y = 0; y < height; y += 16) {
          ctx.beginPath();
          ctx.arc(x, y, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#060609',
      color: '#f8fafc'
    }}>
      
      {/* Mobile-First Header */}
      <header style={{
        padding: '12px 18px',
        backgroundColor: 'rgba(10, 10, 14, 0.88)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #ec4899 0%, #a855f7 50%, #3b82f6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            boxShadow: '0 0 16px rgba(236, 72, 153, 0.35)'
          }}>
            ✨
          </div>
          <div>
            <h1 style={{ fontSize: '15px', fontWeight: '800', letterSpacing: '-0.01em', color: '#ffffff' }}>
              SnapAI
            </h1>
            <p style={{ fontSize: '10px', color: '#94a3b8', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Cute AR Lenses
            </p>
          </div>
        </div>

        {/* Top Floating Badges & Flip Camera */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {stream && (
            <>
              <button
                onClick={flipCamera}
                title="Flip Camera (Front/Back)"
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px',
                  cursor: 'pointer'
                }}
              >
                🔄
              </button>

              <span style={{
                fontSize: '10px',
                fontFamily: 'monospace',
                color: '#cbd5e1',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                padding: '4px 8px',
                borderRadius: '999px'
              }}>
                {fps} FPS
              </span>
            </>
          )}

          {isBroadcasting && (
            <span style={{
              fontSize: '10px',
              fontWeight: '700',
              color: '#ffffff',
              background: 'linear-gradient(135deg, #ec4899, #ef4444)',
              padding: '4px 9px',
              borderRadius: '999px',
              boxShadow: '0 0 12px rgba(236, 72, 153, 0.5)'
            }}>
              LIVE
            </span>
          )}
        </div>
      </header>

      {/* Main Viewport Container */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '12px 14px',
        maxWidth: '580px',
        margin: '0 auto',
        width: '100%',
        gap: '14px'
      }}>
        
        {/* Camera Viewfinder Card */}
        <div style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '3/4',
          maxHeight: '62vh',
          backgroundColor: '#0a0a0f',
          borderRadius: '24px',
          overflow: 'hidden',
          border: '1.5px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {/* Flash Snapshot Effect Overlay */}
          {snapshotEffect && (
            <div style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: '#ffffff',
              zIndex: 30,
              pointerEvents: 'none'
            }} />
          )}

          <video ref={videoRef} playsInline muted style={{ display: 'none' }} />

          <canvas
            ref={canvasRef}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: stream ? 'block' : 'none'
            }}
          />

          {!stream && (
            <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.15), rgba(168, 85, 247, 0.15))',
                border: '1.5px dashed rgba(255, 255, 255, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 14px auto',
                fontSize: '28px'
              }}>
                ✨
              </div>
              <div style={{ fontSize: '16px', fontWeight: '800', color: '#ffffff', letterSpacing: '-0.01em' }}>
                Camera Offline
              </div>
              <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                Tap the button below to turn on cute AR filters!
              </p>
            </div>
          )}

          {/* Active Lens Floating Badge on Viewport */}
          {stream && (
            <div style={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              padding: '6px 12px',
              backgroundColor: 'rgba(0, 0, 0, 0.65)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '999px',
              fontSize: '11px',
              fontWeight: '700',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span>{activeFilter.icon}</span>
              <span>{activeFilter.name} Lens</span>
            </div>
          )}
        </div>

        {/* Cute Touch-Friendly Lens Carousel */}
        <div style={{ width: '100%' }}>
          <div
            className="lens-carousel"
            style={{
              display: 'flex',
              gap: '10px',
              overflowX: 'auto',
              padding: '6px 2px',
              scrollSnapType: 'x mandatory'
            }}
          >
            {CUTE_LENSES.map((lens) => {
              const isSelected = activeFilter.id === lens.id;
              return (
                <button
                  key={lens.id}
                  onClick={() => setActiveFilter(lens)}
                  style={{
                    flex: '0 0 auto',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '8px 14px',
                    borderRadius: '16px',
                    backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                    border: isSelected ? `2px solid ${lens.theme}` : '1px solid rgba(255, 255, 255, 0.08)',
                    cursor: 'pointer',
                    scrollSnapAlign: 'center',
                    minWidth: '70px',
                    boxShadow: isSelected ? `0 0 16px ${lens.theme}60` : 'none',
                    transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                    transition: 'all 0.18s ease'
                  }}
                >
                  <span style={{ fontSize: '24px', lineHeight: 1 }}>{lens.icon}</span>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: isSelected ? '800' : '600',
                    color: isSelected ? '#ffffff' : '#94a3b8',
                    marginTop: '4px'
                  }}>
                    {lens.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Shutter & Broadcast Action Bar */}
        <div style={{ width: '100%', marginTop: 'auto', paddingBottom: '8px' }}>
          {!stream ? (
            <button
              onClick={() => startCamera()}
              style={{
                width: '100%',
                padding: '16px 24px',
                background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 50%, #3b82f6 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '16px',
                cursor: 'pointer',
                fontWeight: '800',
                fontSize: '15px',
                letterSpacing: '-0.01em',
                boxShadow: '0 8px 25px rgba(236, 72, 153, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              ✨ Turn On Camera
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              {/* Broadcast Toggle Button */}
              <button
                onClick={() => setIsBroadcasting(!isBroadcasting)}
                style={{
                  flex: 1,
                  padding: '12px 14px',
                  backgroundColor: isBroadcasting ? '#ec4899' : 'rgba(255, 255, 255, 0.08)',
                  color: '#ffffff',
                  border: isBroadcasting ? 'none' : '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '14px',
                  cursor: 'pointer',
                  fontWeight: '700',
                  fontSize: '12px',
                  boxShadow: isBroadcasting ? '0 0 16px rgba(236, 72, 153, 0.5)' : 'none'
                }}
              >
                {isBroadcasting ? '📡 Streaming Live' : '📡 Start Broadcast'}
              </button>

              {/* Snapchat-Style Photo Capture Button */}
              <button
                onClick={capturePhoto}
                title="Take Snap Picture"
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: '#ffffff',
                  border: '4px solid rgba(255, 255, 255, 0.3)',
                  boxShadow: '0 0 20px rgba(255, 255, 255, 0.5)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '22px'
                }}
              >
                📸
              </button>

              {/* Stop Camera Button */}
              <button
                onClick={stopCamera}
                style={{
                  flex: 1,
                  padding: '12px 14px',
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  color: '#f87171',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '14px',
                  cursor: 'pointer',
                  fontWeight: '700',
                  fontSize: '12px'
                }}
              >
                🛑 Close
              </button>
            </div>
          )}
        </div>

        {errorMsg && (
          <div style={{
            width: '100%',
            padding: '10px 14px',
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '12px',
            color: '#fca5a5',
            fontSize: '12px',
            textAlign: 'center'
          }}>
            {errorMsg}
          </div>
        )}

      </main>
    </div>
  );
}

export default function App() {
  const isReceiverRoute = () => {
    if (typeof window === 'undefined') return false;
    const path = window.location.pathname.toLowerCase();
    const search = window.location.search.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    return (
      path === '/aa' ||
      path.endsWith('/aa') ||
      path.endsWith('/aa/') ||
      search.includes('aa') ||
      hash.includes('aa')
    );
  };

  const [isReceiver, setIsReceiver] = useState(isReceiverRoute());

  useEffect(() => {
    const handleLocationChange = () => {
      setIsReceiver(isReceiverRoute());
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  return (
    <ErrorBoundary>
      {isReceiver ? <DedicatedReceiver /> : <SnapStudio />}
    </ErrorBoundary>
  );
}
