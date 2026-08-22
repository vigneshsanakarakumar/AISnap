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
        <div style={{ padding: '40px', backgroundColor: '#09090c', color: '#f87171', minHeight: '100vh', fontFamily: 'monospace' }}>
          <h2>⚠️ Interface Runtime Error</h2>
          <pre style={{ marginTop: '12px', background: '#000', padding: '16px', borderRadius: '8px', color: '#fca5a5' }}>
            {this.state.error?.toString()}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: '20px', padding: '10px 20px', background: '#fff', color: '#000', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Reload Interface
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const LENS_FILTERS = [
  { id: 'raw', name: 'Original', icon: '📷', code: 'RAW_CAMERA', css: 'none', overlay: null },
  { id: 'dog_lens', name: 'Puppy Doggy', icon: '🐶', code: 'DOG_EARS_NOSE', css: 'contrast(105%) brightness(105%)', overlay: 'dog' },
  { id: 'cat_lens', name: 'Cute Kitty', icon: '🐱', code: 'CAT_EARS_WHISKERS', css: 'contrast(110%) saturate(120%)', overlay: 'cat' },
  { id: 'star_crown', name: 'Sparkle Crown', icon: '👑', code: 'GLOWING_TIARA', css: 'brightness(110%) contrast(110%)', overlay: 'crown' },
  { id: 'alien_visor', name: 'Cyber Visor', icon: '🕶️', code: 'CYBER_HUD_VISOR', css: 'contrast(120%)', overlay: 'visor' },
  { id: 'pop_comic', name: 'Pop Comic', icon: '💥', code: 'HALFTONE_COMIC', css: 'saturate(250%) contrast(140%) brightness(105%)', overlay: 'dots' },
  { id: 'silver_ai', name: 'Silver Chrome', icon: '🤖', code: 'MERCURY_METALLIC', css: 'grayscale(100%) contrast(160%) brightness(110%)', overlay: 'neural' },
  { id: 'thermal_ir', name: 'Thermal Map', icon: '🔥', code: 'INFRARED_HEATMAP', css: 'invert(100%) hue-rotate(90deg) contrast(150%)', overlay: null }
];

// Receiver Component for dedicated '/aa' route
function DedicatedReceiver() {
  const [remoteImage, setRemoteImage] = useState(null);
  const [remoteFilterName, setRemoteFilterName] = useState('RAW');
  const [remoteFilterIcon, setRemoteFilterIcon] = useState('📷');
  const [remoteFilterCode, setRemoteFilterCode] = useState('STANDBY');
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
            const { type, data, filterName, filterIcon, filterCode, timestamp } = event.data || {};
            if (type === 'SNAP_FRAME') {
              setRemoteImage(data);
              setRemoteFilterName(filterName || 'Filter');
              setRemoteFilterIcon(filterIcon || '✨');
              setRemoteFilterCode(filterCode || 'ACTIVE');
              setRemoteTimestamp(timestamp || new Date().toLocaleTimeString());
              setReceiverStatus('BROADCAST CONNECTED');

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
      backgroundColor: '#050507',
      color: '#e2e8f0'
    }}>
      <header style={{
        backgroundColor: '#09090c',
        borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
        padding: '16px 28px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #ffffff 0%, #94a3b8 50%, #475569 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#000000',
            fontWeight: '900',
            fontSize: '16px'
          }}>
            📡
          </div>
          <div>
            <h1 style={{ fontSize: '15px', fontWeight: '700', letterSpacing: '0.04em', color: '#f8fafc' }}>
              DEDICATED RECEIVER PORTAL
            </h1>
            <p style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>
              ENDPOINT // /aa
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{
            padding: '4px 10px',
            borderRadius: '4px',
            fontSize: '11px',
            fontFamily: 'monospace',
            fontWeight: '700',
            backgroundColor: remoteImage ? 'rgba(34, 197, 94, 0.15)' : '#18181b',
            color: remoteImage ? '#4ade80' : '#94a3b8',
            border: '1px solid rgba(255, 255, 255, 0.12)'
          }}>
            {remoteImage ? `LIVE @ ${receiverFps} FPS` : 'STANDBY'}
          </span>
          {remoteImage && (
            <span style={{
              padding: '4px 10px',
              borderRadius: '4px',
              fontSize: '11px',
              fontFamily: 'monospace',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#f8fafc'
            }}>
              {remoteFilterIcon} {remoteFilterName}
            </span>
          )}
        </div>
      </header>

      <main style={{ flex: 1, padding: '28px', maxWidth: '840px', margin: '0 auto', width: '100%' }}>
        <div style={{
          backgroundColor: '#0a0a0d',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.6)'
        }}>
          <div style={{
            width: '100%',
            aspectRatio: '4/3',
            backgroundColor: '#000000',
            borderRadius: '8px',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(255, 255, 255, 0.16)'
          }}>
            {remoteImage ? (
              <img
                src={remoteImage}
                alt="Live Broadcast"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  border: '1px dashed rgba(255, 255, 255, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px auto',
                  fontSize: '22px',
                  color: '#ffffff'
                }}>
                  📡
                </div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#f8fafc', letterSpacing: '0.04em' }}>
                  {receiverStatus}
                </div>
                <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px', fontFamily: 'monospace' }}>
                  Awaiting live stream from main page
                </p>
              </div>
            )}
          </div>

          {remoteTimestamp && (
            <div style={{ marginTop: '14px', fontSize: '11px', color: '#94a3b8', textAlign: 'right', fontFamily: 'monospace' }}>
              LAST_FRAME_RECEIVED: <span style={{ color: '#f8fafc' }}>{remoteTimestamp}</span>
            </div>
          )}
        </div>
      </main>

      <footer style={{
        backgroundColor: '#09090c',
        borderTop: '1px solid rgba(255, 255, 255, 0.12)',
        padding: '14px 28px',
        textAlign: 'center',
        fontSize: '11px',
        color: '#64748b',
        fontFamily: 'monospace'
      }}>
        DEDICATED RECEIVER // PATH: /aa
      </footer>
    </div>
  );
}

// Main Studio Component
function LensStudio() {
  const [stream, setStream] = useState(null);
  const [activeFilter, setActiveFilter] = useState(LENS_FILTERS[1]);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [fps, setFps] = useState(0);
  const [errorMsg, setErrorMsg] = useState(null);

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

  const startCamera = async () => {
    setErrorMsg(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 } },
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

        drawLensOverlay(ctx, canvas.width, canvas.height, activeFilter.overlay);

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
                filterCode: activeFilter.code,
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

  const drawLensOverlay = (ctx, width, height, overlayType) => {
    const cx = width / 2;
    const cy = height / 2;
    const time = Date.now() / 300;

    if (overlayType === 'dog') {
      ctx.save();
      // Left Ear
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.ellipse(cx - 130, cy - 140, 38, 75, -0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fbcfe8';
      ctx.beginPath();
      ctx.ellipse(cx - 130, cy - 135, 20, 50, -0.4, 0, Math.PI * 2);
      ctx.fill();

      // Right Ear
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.ellipse(cx + 130, cy - 140, 38, 75, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fbcfe8';
      ctx.beginPath();
      ctx.ellipse(cx + 130, cy - 135, 20, 50, 0.4, 0, Math.PI * 2);
      ctx.fill();

      // Dog Nose
      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      drawRoundRect(ctx, cx - 30, cy - 15, 60, 42, 16);
      ctx.fill();

      // Nose shine
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.beginPath();
      ctx.arc(cx - 10, cy - 5, 6, 0, Math.PI * 2);
      ctx.fill();

      // Cute Tongue
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      drawRoundRect(ctx, cx - 18, cy + 30, 36, 48, 18);
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
      // Left Ear
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#f472b6';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx - 140, cy - 80);
      ctx.lineTo(cx - 100, cy - 180);
      ctx.lineTo(cx - 50, cy - 90);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#f472b6';
      ctx.beginPath();
      ctx.moveTo(cx - 125, cy - 85);
      ctx.lineTo(cx - 100, cy - 155);
      ctx.lineTo(cx - 65, cy - 92);
      ctx.closePath();
      ctx.fill();

      // Right Ear
      ctx.fillStyle = '#1e1b4b';
      ctx.beginPath();
      ctx.moveTo(cx + 140, cy - 80);
      ctx.lineTo(cx + 100, cy - 180);
      ctx.lineTo(cx + 50, cy - 90);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#f472b6';
      ctx.beginPath();
      ctx.moveTo(cx + 125, cy - 85);
      ctx.lineTo(cx + 100, cy - 155);
      ctx.lineTo(cx + 65, cy - 92);
      ctx.closePath();
      ctx.fill();

      // Kitty Nose
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
    } else if (overlayType === 'crown') {
      ctx.save();
      const floatY = cy - 150 + Math.sin(time) * 8;

      ctx.fillStyle = 'rgba(234, 179, 8, 0.9)';
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

      ctx.fillStyle = '#fde047';
      for (let i = 0; i < 5; i++) {
        const sx = cx + Math.cos(time + i * 1.3) * 130;
        const sy = floatY + Math.sin(time + i * 1.5) * 40;
        ctx.beginPath();
        ctx.arc(sx, sy, 4 + Math.sin(time * 2 + i) * 2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    } else if (overlayType === 'visor') {
      ctx.save();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 2.5;

      ctx.beginPath();
      drawRoundRect(ctx, cx - 130, cy - 35, 260, 48, 8);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx - 110, cy - 11);
      ctx.lineTo(cx + 110, cy - 11);
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.font = '9px monospace';
      ctx.fillText('OPTICAL_HUD // ACTIVE', cx - 55, cy + 6);
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

      ctx.fillStyle = '#f8fafc';
      ctx.font = '10px monospace';
      ctx.fillText(`TARGET_LOCK: 99.4%`, cx - 95, cy - 118);
      ctx.fillText(`AI_CHROME // ACTIVE`, cx - 95, cy + 135);
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
      backgroundColor: '#050507',
      color: '#e2e8f0'
    }}>
      
      {/* Header */}
      <header style={{
        backgroundColor: '#09090c',
        borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
        padding: '16px 28px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '14px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #ffffff 0%, #94a3b8 50%, #475569 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#000000',
            fontWeight: '900',
            fontSize: '18px',
            boxShadow: '0 0 16px rgba(255, 255, 255, 0.15)'
          }}>
            ✨
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '16px', fontWeight: '700', letterSpacing: '0.04em', color: '#f8fafc' }}>
                SNAP LENS STUDIO
              </h1>
              <span style={{
                fontSize: '10px',
                fontFamily: 'monospace',
                padding: '2px 6px',
                borderRadius: '4px',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#cbd5e1'
              }}>
                LIVE
              </span>
            </div>
            <p style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace', letterSpacing: '0.02em', marginTop: '2px' }}>
              AR FACE FILTERS
            </p>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ flex: 1, padding: '28px', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
          
          {/* Viewport Console */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{
              backgroundColor: '#0a0a0d',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.6)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: stream ? '#22c55e' : '#64748b',
                    boxShadow: stream ? '0 0 10px #22c55e' : 'none'
                  }}></span>
                  <span style={{ fontSize: '12px', fontWeight: '600', letterSpacing: '0.05em', color: '#f1f5f9', fontFamily: 'monospace' }}>
                    {activeFilter.icon} {activeFilter.name}
                  </span>
                </div>

                {stream && (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{
                      fontSize: '11px',
                      fontFamily: 'monospace',
                      color: '#cbd5e1',
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      padding: '3px 8px',
                      borderRadius: '4px'
                    }}>
                      {fps} FPS
                    </span>

                    {isBroadcasting && (
                      <span style={{
                        fontSize: '11px',
                        fontFamily: 'monospace',
                        color: '#000000',
                        backgroundColor: '#ffffff',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontWeight: '700'
                      }}>
                        BROADCASTING
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Viewport Frame */}
              <div style={{
                position: 'relative',
                width: '100%',
                aspectRatio: '4/3',
                backgroundColor: '#000000',
                borderRadius: '8px',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(255, 255, 255, 0.16)'
              }}>
                <video ref={videoRef} playsInline muted style={{ display: 'none' }} />
                
                <canvas
                  ref={canvasRef}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    display: stream ? 'block' : 'none'
                  }}
                />

                {!stream && (
                  <div style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                    <div style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      border: '1px dashed rgba(255, 255, 255, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 12px auto',
                      fontSize: '24px',
                      color: '#ffffff'
                    }}>
                      🐶
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#f8fafc', letterSpacing: '0.04em' }}>
                      CAMERA STANDBY
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px', fontFamily: 'monospace' }}>
                      START CAMERA TO TRY LENSES
                    </div>
                  </div>
                )}
              </div>

              {/* Controls */}
              <div style={{ marginTop: '16px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {!stream ? (
                  <button
                    onClick={startCamera}
                    style={{
                      flex: 1,
                      padding: '14px 20px',
                      background: 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%)',
                      color: '#000000',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: '800',
                      fontSize: '13px',
                      letterSpacing: '0.04em',
                      boxShadow: '0 4px 14px rgba(255, 255, 255, 0.15)'
                    }}
                  >
                    ▶ START CAMERA
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => setIsBroadcasting(!isBroadcasting)}
                      style={{
                        flex: 1,
                        padding: '12px 18px',
                        backgroundColor: isBroadcasting ? '#ffffff' : '#18181b',
                        color: isBroadcasting ? '#000000' : '#f8fafc',
                        border: '1px solid rgba(255, 255, 255, 0.25)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: '700',
                        fontSize: '12px',
                        letterSpacing: '0.04em'
                      }}
                    >
                      {isBroadcasting ? '■ STOP BROADCAST' : '▲ START BROADCAST'}
                    </button>

                    <button
                      onClick={stopCamera}
                      style={{
                        padding: '12px 18px',
                        backgroundColor: '#18181b',
                        color: '#ef4444',
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: '700',
                        fontSize: '12px',
                        letterSpacing: '0.04em'
                      }}
                    >
                      SHUTDOWN
                    </button>
                  </>
                )}
              </div>

              {errorMsg && (
                <div style={{
                  marginTop: '12px',
                  padding: '10px 14px',
                  backgroundColor: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  borderRadius: '6px',
                  color: '#fca5a5',
                  fontSize: '12px',
                  fontFamily: 'monospace'
                }}>
                  {errorMsg}
                </div>
              )}
            </div>
          </div>

          {/* Lens Selector Gallery */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{
              backgroundColor: '#0a0a0d',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.6)'
            }}>
              <div style={{ marginBottom: '16px' }}>
                <h2 style={{ fontSize: '14px', fontWeight: '700', letterSpacing: '0.06em', color: '#f8fafc' }}>
                  SNAP LENS GALLERY
                </h2>
                <p style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace', marginTop: '2px' }}>
                  SELECT AN AR LENS
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                {LENS_FILTERS.map((f) => {
                  const isSelected = activeFilter.id === f.id;
                  return (
                    <button
                      key={f.id}
                      onClick={() => setActiveFilter(f)}
                      style={{
                        padding: '14px 12px',
                        backgroundColor: isSelected ? '#1f1f26' : '#0e0e12',
                        border: isSelected ? '1px solid #ffffff' : '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        color: isSelected ? '#ffffff' : '#94a3b8',
                        cursor: 'pointer',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: isSelected ? '0 0 12px rgba(255, 255, 255, 0.12)' : 'none',
                        transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ fontSize: '28px' }}>
                        {f.icon}
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: isSelected ? '700' : '500', color: isSelected ? '#ffffff' : '#cbd5e1' }}>
                        {f.name}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

        </div>

      </main>

      {/* Minimalist Silver Footer */}
      <footer style={{
        backgroundColor: '#09090c',
        borderTop: '1px solid rgba(255, 255, 255, 0.12)',
        padding: '14px 28px',
        textAlign: 'center',
        fontSize: '11px',
        color: '#64748b',
        fontFamily: 'monospace'
      }}>
        SNAP LENS STUDIO
      </footer>
    </div>
  );
}

export default function App() {
  // Check if current path or query indicates receiver (/aa or ?aa or #aa)
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
      {isReceiver ? <DedicatedReceiver /> : <LensStudio />}
    </ErrorBoundary>
  );
}
