import React, { useState, useEffect, useRef, Component } from 'react';
import Peer from 'peerjs';

import { CameraManager } from './ar/camera/CameraManager.js';
import { FaceTracker } from './ar/tracking/FaceTracker.js';
import { ARRenderer } from './ar/renderer/ARRenderer.js';
import { ARRecorder } from './ar/utils/recorder.js';
import { ALL_FILTERS } from './ar/filters/index.js';

// Dedicated Direct 1-to-1 Cloud Receiver Endpoint
const RECEIVER_PORTAL_ID = 'aisnap-portal-stream';

function getIceServers() {
  const servers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' }
  ];

  if (import.meta.env?.VITE_TURN_URL) {
    servers.push({
      urls: import.meta.env.VITE_TURN_URL,
      username: import.meta.env.VITE_TURN_USERNAME || '',
      credential: import.meta.env.VITE_TURN_CREDENTIAL || ''
    });
  }

  return servers;
}

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
          <pre style={{ marginTop: '12px', background: '#000', padding: '16px', borderRadius: '8px', color: '#fca5a5', overflowX: 'auto' }}>
            {this.state.error?.toString()}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: '20px', padding: '12px 24px', background: '#fff', color: '#000', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Reload Application
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Dedicated Receiver Portal (/aa)
function DedicatedReceiver() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [remoteFilterName, setRemoteFilterName] = useState('Lens');
  const [remoteFilterIcon, setRemoteFilterIcon] = useState('✨');
  const [receiverFps, setReceiverFps] = useState(0);
  const [savedPhotos, setSavedPhotos] = useState([]);
  const [newPhotoToast, setNewPhotoToast] = useState(null);

  // Debug Panel State for Laptop
  const [receiverPeerStatus, setReceiverPeerStatus] = useState('INITIALIZING');
  const [incomingCallStatus, setIncomingCallStatus] = useState('NO');
  const [remoteStreamStatus, setRemoteStreamStatus] = useState('MISSING');
  const [videoTrackStatus, setVideoTrackStatus] = useState('ENDED');
  const [videoElementStatus, setVideoElementStatus] = useState('BLOCKED');

  const videoRef = useRef(null);
  const peerRef = useRef(null);
  const activeMediaCallRef = useRef(null);
  const activeDataConnRef = useRef(null);
  const broadcastChannelRef = useRef(null);
  const receiverFrameCountRef = useRef(0);
  const receiverLastFpsUpdateRef = useRef(Date.now());
  const fpsIntervalRef = useRef(null);

  useEffect(() => {
    console.log('[LAPTOP] Receiver initializing');

    // 1. Local BroadcastChannel for same-device testing
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const channel = new BroadcastChannel('snap_filter_broadcast_stream');
        broadcastChannelRef.current = channel;

        channel.onmessage = (event) => {
          try {
            const { type, image, filterName, filterIcon, timestamp } = event.data || {};
            if (type === 'REMOTE_SNAPSHOT' && image) {
              handleNewSnapshot({ image, filterName, filterIcon, timestamp });
            } else if (type === 'FILTER_CHANGE') {
              if (filterName) setRemoteFilterName(filterName);
              if (filterIcon) setRemoteFilterIcon(filterIcon);
            }
          } catch (e) {
            console.error('[LAPTOP] BroadcastChannel error:', e);
          }
        };
      }
    } catch (e) {
      console.warn('[LAPTOP] BroadcastChannel warning:', e);
    }

    // 2. Initialize Receiver Peer
    initReceiverPeer();

    // FPS Meter Loop
    fpsIntervalRef.current = setInterval(() => {
      if (videoRef.current && !videoRef.current.paused && videoRef.current.readyState >= 2) {
        const now = Date.now();
        if (now - receiverLastFpsUpdateRef.current >= 1000) {
          setReceiverFps(24);
          receiverLastFpsUpdateRef.current = now;
        }
      } else {
        setReceiverFps(0);
      }
    }, 1000);

    const handleUnload = () => {
      if (peerRef.current) {
        try { peerRef.current.destroy(); } catch (e) {}
      }
    };
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      if (fpsIntervalRef.current) clearInterval(fpsIntervalRef.current);
      if (broadcastChannelRef.current) {
        try { broadcastChannelRef.current.close(); } catch (e) {}
      }
      if (activeMediaCallRef.current) {
        try { activeMediaCallRef.current.close(); } catch (e) {}
      }
      if (peerRef.current) {
        try { peerRef.current.destroy(); } catch (e) {}
      }
    };
  }, []);

  const initReceiverPeer = () => {
    if (peerRef.current) {
      try { peerRef.current.destroy(); } catch (e) {}
    }

    console.log('[LAPTOP] Creating Peer with ID:', RECEIVER_PORTAL_ID);
    const peer = new Peer(RECEIVER_PORTAL_ID, {
      debug: 1,
      config: {
        iceServers: getIceServers()
      }
    });

    peerRef.current = peer;

    peer.on('open', (id) => {
      console.log('[LAPTOP] Receiver peer open:', id);
      console.log('[LAPTOP] Receiver ready');
      setReceiverPeerStatus('READY');
    });

    // Single Controlled Incoming WebRTC MediaCall Handler
    peer.on('call', (call) => {
      console.log('[LAPTOP] Incoming call received from:', call.peer);
      setIncomingCallStatus('YES');

      if (activeMediaCallRef.current) {
        console.log('[LAPTOP] Closing existing active media call');
        try {
          activeMediaCallRef.current.close();
        } catch (e) {}
      }
      activeMediaCallRef.current = call;

      console.log('[LAPTOP] call.answer executed');
      call.answer();

      call.on('stream', async (remoteStream) => {
        console.log('[LAPTOP] Remote stream received');
        setRemoteStreamStatus('RECEIVED');

        const tracks = remoteStream.getVideoTracks();
        console.log('[LAPTOP] Video tracks count:', tracks.length);

        if (tracks.length > 0) {
          console.log('[LAPTOP] Track readyState:', tracks[0].readyState);
          setVideoTrackStatus(tracks[0].readyState === 'live' ? 'LIVE' : 'ENDED');

          tracks[0].onended = () => {
            console.log('[LAPTOP] Video track ended');
            setVideoTrackStatus('ENDED');
            setIsStreaming(false);
          };
        } else {
          setVideoTrackStatus('ENDED');
        }

        if (!videoRef.current) {
          console.error('[LAPTOP] VIDEO ELEMENT DOES NOT EXIST');
          setVideoElementStatus('BLOCKED');
          return;
        }

        videoRef.current.srcObject = remoteStream;
        videoRef.current.muted = true;
        videoRef.current.autoplay = true;
        videoRef.current.playsInline = true;
        console.log('[LAPTOP] video.srcObject assigned');

        try {
          await videoRef.current.play();
          console.log('[LAPTOP] VIDEO PLAYING SUCCESSFULLY');
          setVideoElementStatus('PLAYING');
          setIsStreaming(true);
        } catch (error) {
          console.error('[LAPTOP] VIDEO PLAY FAILED', error);
          setVideoElementStatus('BLOCKED');
        }
      });

      call.on('close', () => {
        console.log('[LAPTOP] Call closed');
        if (activeMediaCallRef.current === call) {
          activeMediaCallRef.current = null;
          setIsStreaming(false);
          setVideoTrackStatus('ENDED');
          setVideoElementStatus('BLOCKED');
          setRemoteStreamStatus('MISSING');
        }
      });

      call.on('error', (err) => {
        console.error('[LAPTOP] Call error:', err);
        if (activeMediaCallRef.current === call) {
          activeMediaCallRef.current = null;
          setIsStreaming(false);
        }
      });
    });

    // Metadata DataChannel for Snapshots and Filters
    peer.on('connection', (conn) => {
      console.log('[LAPTOP] Incoming metadata connection from:', conn.peer);
      activeDataConnRef.current = conn;

      conn.on('data', (data) => {
        if (data?.type === 'REMOTE_SNAPSHOT' && data.image) {
          handleNewSnapshot(data);
        } else if (data?.type === 'FILTER_CHANGE') {
          if (data.filterName) setRemoteFilterName(data.filterName);
          if (data.filterIcon) setRemoteFilterIcon(data.filterIcon);
        }
      });

      conn.on('close', () => {
        if (activeDataConnRef.current === conn) {
          activeDataConnRef.current = null;
        }
      });
    });

    peer.on('error', (err) => {
      console.error('[LAPTOP] Receiver peer error:', err);
      if (err.type === 'unavailable-id') {
        setReceiverPeerStatus('FAILED (ID in use - retrying...)');
        setTimeout(() => initReceiverPeer(), 1500);
      } else {
        setReceiverPeerStatus(`FAILED (${err.type || err.message})`);
      }
    });
  };

  const handleNewSnapshot = (photo) => {
    setSavedPhotos((prev) => [photo, ...prev]);
    setNewPhotoToast(photo);
    setTimeout(() => {
      setNewPhotoToast(null);
    }, 7000);
  };

  const downloadPhoto = (photo) => {
    const a = document.createElement('a');
    a.href = photo.image;
    a.download = `SnapAI_${photo.filterName || 'Photo'}_${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#060609',
      color: '#f8fafc'
    }}>
      <header style={{
        padding: '16px 20px',
        backgroundColor: 'rgba(15, 15, 20, 0.88)',
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
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px'
          }}>
            📡
          </div>
          <div>
            <h1 style={{ fontSize: '15px', fontWeight: '800', letterSpacing: '-0.01em', color: '#ffffff' }}>
              Live Receiver Portal
            </h1>
            <p style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>
              ENDPOINT // /aa
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{
            padding: '4px 12px',
            borderRadius: '999px',
            fontSize: '11px',
            fontWeight: '700',
            backgroundColor: isStreaming ? 'rgba(34, 197, 94, 0.18)' : 'rgba(255, 255, 255, 0.06)',
            color: isStreaming ? '#4ade80' : '#94a3b8',
            border: `1px solid ${isStreaming ? 'rgba(34, 197, 94, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: isStreaming ? '#4ade80' : '#64748b',
              display: 'inline-block'
            }}></span>
            {isStreaming ? `LIVE (${receiverFps || 24} FPS)` : 'READY'}
          </span>

          {isStreaming && (
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

      {/* Snapshot Toast Notification */}
      {newPhotoToast && (
        <div style={{
          position: 'fixed',
          top: '80px',
          right: '20px',
          zIndex: 100,
          backgroundColor: '#1e1e2d',
          border: '1.5px solid #ec4899',
          borderRadius: '16px',
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.8)'
        }}>
          <img
            src={newPhotoToast.image}
            alt="Snap Preview"
            style={{ width: '48px', height: '64px', objectFit: 'cover', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.2)' }}
          />
          <div>
            <div style={{ fontSize: '13px', fontWeight: '800', color: '#ffffff' }}>
              📸 New Photo Snapped on Mobile!
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
              {newPhotoToast.filterIcon} {newPhotoToast.filterName} Lens ({newPhotoToast.timestamp})
            </div>
            <button
              onClick={() => downloadPhoto(newPhotoToast)}
              style={{
                marginTop: '6px',
                padding: '6px 12px',
                backgroundColor: '#ec4899',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              💾 Download to Laptop
            </button>
          </div>
        </div>
      )}

      <main style={{ flex: 1, padding: '16px', maxWidth: '760px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* On-Screen Diagnostic Debug Panel */}
        <div style={{
          backgroundColor: '#0c0d14',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '12px 16px',
          fontSize: '11px',
          fontFamily: 'monospace'
        }}>
          <div style={{ fontWeight: '800', color: '#cbd5e1', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
            <span>🛠️ LAPTOP WEBRTC DIAGNOSTICS</span>
            <span style={{ color: '#ec4899' }}>{isStreaming ? 'STREAMING OK' : 'STANDBY'}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
            <div>Receiver Peer: <strong style={{ color: receiverPeerStatus === 'READY' ? '#4ade80' : '#f87171' }}>{receiverPeerStatus}</strong></div>
            <div>Incoming Call: <strong style={{ color: incomingCallStatus === 'YES' ? '#4ade80' : '#94a3b8' }}>{incomingCallStatus}</strong></div>
            <div>Remote Stream: <strong style={{ color: remoteStreamStatus === 'RECEIVED' ? '#4ade80' : '#94a3b8' }}>{remoteStreamStatus}</strong></div>
            <div>Video Track: <strong style={{ color: videoTrackStatus === 'LIVE' ? '#4ade80' : '#f87171' }}>{videoTrackStatus}</strong></div>
            <div>Video Element: <strong style={{ color: videoElementStatus === 'PLAYING' ? '#4ade80' : '#f87171' }}>{videoElementStatus}</strong></div>
          </div>
        </div>

        {/* Main Live Viewport */}
        <div style={{
          backgroundColor: '#0f0f14',
          border: '1.5px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '24px',
          overflow: 'hidden',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7)'
        }}>
          <div style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '3/4',
            maxHeight: '62vh',
            backgroundColor: '#000000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {/* Real Visible Video Element */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                display: isStreaming ? 'block' : 'none'
              }}
            />

            {!isStreaming && (
              <div style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                <div style={{
                  width: '68px',
                  height: '68px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.15), rgba(139, 92, 246, 0.15))',
                  border: '1.5px dashed rgba(255, 255, 255, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px auto',
                  fontSize: '28px'
                }}>
                  ✨
                </div>
                <div style={{ fontSize: '17px', fontWeight: '800', color: '#ffffff' }}>
                  Live Portal Ready
                </div>
                <div style={{
                  marginTop: '12px',
                  padding: '8px 16px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '12px',
                  fontSize: '12px',
                  color: '#cbd5e1',
                  display: 'inline-block',
                  fontFamily: 'monospace'
                }}>
                  Open <strong>https://snap-filter-bay.vercel.app/</strong> on your phone and tap Start
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Captured Photos Gallery on Laptop */}
        {savedPhotos.length > 0 && (
          <div style={{
            backgroundColor: '#0f0f14',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '20px',
            padding: '16px 20px'
          }}>
            <div style={{ fontSize: '14px', fontWeight: '800', color: '#ffffff', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📸</span> Snapped Photos Gallery ({savedPhotos.length})
            </div>
            <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '4px' }}>
              {savedPhotos.map((p, idx) => (
                <div key={idx} style={{ flex: '0 0 auto', textAlign: 'center' }}>
                  <img
                    src={p.image}
                    alt="Captured Snap"
                    style={{ width: '100px', height: '133px', objectFit: 'cover', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.15)' }}
                  />
                  <button
                    onClick={() => downloadPhoto(p)}
                    style={{
                      marginTop: '6px',
                      padding: '4px 10px',
                      backgroundColor: 'rgba(236, 72, 153, 0.2)',
                      border: '1px solid #ec4899',
                      borderRadius: '8px',
                      color: '#ffffff',
                      fontSize: '10px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'block',
                      width: '100%'
                    }}
                  >
                    💾 Save
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// Main Production Web AR Camera Studio (Phone)
function SnapStudio() {
  const [activeFilter, setActiveFilter] = useState(ALL_FILTERS[0]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cameraState, setCameraState] = useState('idle');
  const [fps, setFps] = useState(0);
  const [errorMsg, setErrorMsg] = useState(null);
  const [snapshotFlash, setSnapshotFlash] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState('00:00');
  const [availableCameras, setAvailableCameras] = useState([]);

  // Debug Panel State for Phone
  const [peerDebugStatus, setPeerDebugStatus] = useState('INITIALIZING');
  const [cameraDebugStatus, setCameraDebugStatus] = useState('IDLE');
  const [canvasDebugStatus, setCanvasDebugStatus] = useState('IDLE');
  const [canvasStreamStatus, setCanvasStreamStatus] = useState('MISSING');
  const [mediaCallStatus, setMediaCallStatus] = useState('IDLE');

  // Single Controlled WebRTC References
  const mediaCallRef = useRef(null);
  const canvasStreamRef = useRef(null);
  const connectionAttemptRef = useRef(false);
  const reconnectTimeoutRef = useRef(null);
  const reconnectDelayRef = useRef(1000); // Exponential backoff starts at 1s

  // Unique session ID for phone to avoid broker locks
  const sessionIdRef = useRef(`snap-phone-${Date.now()}`);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraManagerRef = useRef(null);
  const faceTrackerRef = useRef(null);
  const rendererRef = useRef(null);
  const recorderRef = useRef(null);
  const peerRef = useRef(null);
  const dataConnRef = useRef(null);
  const broadcastChannelRef = useRef(null);

  const activeFilterRef = useRef(activeFilter);
  useEffect(() => {
    activeFilterRef.current = activeFilter;
    if (rendererRef.current) {
      rendererRef.current.setFilter(activeFilter);
    }
    // Notify laptop of filter change over metadata DataChannel & BroadcastChannel
    notifyFilterChange(activeFilter);
  }, [activeFilter]);

  const notifyFilterChange = (filter) => {
    const payload = {
      type: 'FILTER_CHANGE',
      filterName: filter.name,
      filterIcon: filter.icon
    };
    if (broadcastChannelRef.current) {
      try { broadcastChannelRef.current.postMessage(payload); } catch (e) {}
    }
    if (dataConnRef.current && dataConnRef.current.open) {
      try { dataConnRef.current.send(payload); } catch (e) {}
    }
  };

  // Initialize Modules & Outbound Link to Laptop
  useEffect(() => {
    console.log('[PHONE] Studio initializing');
    const cameraManager = new CameraManager();
    const faceTracker = new FaceTracker();
    const recorder = new ARRecorder();

    cameraManagerRef.current = cameraManager;
    faceTrackerRef.current = faceTracker;
    recorderRef.current = recorder;

    cameraManager.setStatusCallback(({ status, error }) => {
      setCameraState(status);
      if (status === 'active') setCameraDebugStatus('READY');
      else if (status === 'error') setCameraDebugStatus('FAILED');
      else setCameraDebugStatus(status.toUpperCase());
      if (error) setErrorMsg(error);
    });

    faceTracker.initialize().catch(console.warn);

    // Setup Local BroadcastChannel
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        broadcastChannelRef.current = new BroadcastChannel('snap_filter_broadcast_stream');
      }
    } catch (e) {
      console.warn('[PHONE] BroadcastChannel warning:', e);
    }

    // Initialize Phone PeerJS Instance
    initPhonePeer();

    const handleUnload = () => {
      if (mediaCallRef.current) {
        try { mediaCallRef.current.close(); } catch (e) {}
      }
      if (peerRef.current) {
        try { peerRef.current.destroy(); } catch (e) {}
      }
    };
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (mediaCallRef.current) {
        try { mediaCallRef.current.close(); } catch (e) {}
      }
      if (canvasStreamRef.current) {
        canvasStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (cameraManager) cameraManager.stopCamera();
      if (faceTracker) faceTracker.dispose();
      if (rendererRef.current) rendererRef.current.stop();
      if (peerRef.current) {
        try { peerRef.current.destroy(); } catch (e) {}
      }
      if (broadcastChannelRef.current) {
        try { broadcastChannelRef.current.close(); } catch (e) {}
      }
    };
  }, []);

  const initPhonePeer = () => {
    console.log('[PHONE] Peer initializing with ID:', sessionIdRef.current);
    if (peerRef.current) {
      try { peerRef.current.destroy(); } catch (e) {}
    }

    const phonePeer = new Peer(sessionIdRef.current, {
      debug: 1,
      config: {
        iceServers: getIceServers()
      }
    });

    peerRef.current = phonePeer;

    phonePeer.on('open', (id) => {
      console.log('[PHONE] Peer open:', id);
      console.log('[PHONE] Peer ID:', id);
      setPeerDebugStatus('READY');
      // If camera is already active, initiate remote stream call
      if (cameraManagerRef.current?.isActive() && rendererRef.current?.isRunning) {
        startRemoteStream();
      }
    });

    phonePeer.on('error', (err) => {
      console.error('[PHONE] Peer error:', err);
      setPeerDebugStatus(`FAILED (${err.type || err.message})`);
    });
  };

  // STEP 3 & STEP 4 — Single Controlled WebRTC Stream Call Pipeline
  const startRemoteStream = () => {
    // 1. Guard against duplicate calls or unready states
    if (!peerRef.current || peerRef.current.destroyed) {
      console.log('[PHONE] Cannot stream: Peer not ready');
      return;
    }
    if (mediaCallRef.current) {
      console.log('[PHONE] Stream call already active, skipping duplicate call');
      return;
    }
    if (connectionAttemptRef.current) {
      console.log('[PHONE] Connection attempt already running, skipping');
      return;
    }
    if (!canvasRef.current || canvasRef.current.width === 0 || canvasRef.current.height === 0) {
      console.log('[PHONE] Cannot stream: Canvas not ready or dimensions 0');
      return;
    }

    connectionAttemptRef.current = true;
    console.log('[PHONE] Starting single controlled remote stream...');

    // 2. Create Canvas CaptureStream once per active session
    if (!canvasStreamRef.current || canvasStreamRef.current.getVideoTracks().length === 0 || canvasStreamRef.current.getVideoTracks()[0].readyState === 'ended') {
      console.log('[PHONE] Creating captureStream(24)');
      console.log(`[PHONE] Canvas dimensions: ${canvasRef.current.width}x${canvasRef.current.height}`);
      
      const stream = canvasRef.current.captureStream(24);
      canvasStreamRef.current = stream;

      const tracks = stream.getVideoTracks();
      console.log('[PHONE] Video tracks count:', tracks.length);

      if (tracks.length === 0) {
        console.error('[PHONE] ERROR: captureStream produced 0 tracks!');
        setCanvasStreamStatus('MISSING');
        connectionAttemptRef.current = false;
        return;
      }

      console.log('[PHONE] Video track readyState:', tracks[0].readyState);
      setCanvasStreamStatus('LIVE');
    }

    const streamToCall = canvasStreamRef.current;

    // 3. Connect Metadata DataChannel
    if (!dataConnRef.current || !dataConnRef.current.open) {
      console.log('[PHONE] Connecting metadata channel to laptop');
      const conn = peerRef.current.connect(RECEIVER_PORTAL_ID, {
        reliable: false,
        serialization: 'json'
      });
      dataConnRef.current = conn;
      conn.on('open', () => {
        console.log('[PHONE] Metadata DataChannel open to laptop');
        notifyFilterChange(activeFilterRef.current);
      });
    }

    // 4. Create WebRTC Call to Laptop
    console.log(`[PHONE] Creating WebRTC call to ${RECEIVER_PORTAL_ID}`);
    setMediaCallStatus('CONNECTING');

    try {
      const call = peerRef.current.call(RECEIVER_PORTAL_ID, streamToCall);
      mediaCallRef.current = call;
      connectionAttemptRef.current = false;

      // Handle Call Events
      if (call.peerConnection) {
        call.peerConnection.onconnectionstatechange = () => {
          const state = call.peerConnection.connectionState;
          console.log('[PHONE] ICE/connection state:', state);
          if (state === 'connected') {
            console.log('[PHONE] Call connected');
            setMediaCallStatus('CONNECTED');
            reconnectDelayRef.current = 1000; // Reset exponential backoff
          } else if (state === 'failed' || state === 'disconnected') {
            setMediaCallStatus('FAILED');
            handleCallClosedOrFailed();
          }
        };
      } else {
        // Fallback status
        setTimeout(() => {
          if (mediaCallRef.current === call) {
            setMediaCallStatus('CONNECTED');
          }
        }, 1500);
      }

      call.on('close', () => {
        console.log('[PHONE] Call closed');
        handleCallClosedOrFailed();
      });

      call.on('error', (err) => {
        console.error('[PHONE] Call error:', err);
        handleCallClosedOrFailed();
      });

    } catch (err) {
      console.error('[PHONE] Create call exception:', err);
      connectionAttemptRef.current = false;
      handleCallClosedOrFailed();
    }
  };

  const handleCallClosedOrFailed = () => {
    mediaCallRef.current = null;
    setMediaCallStatus('IDLE');

    // STEP 8 — Exponential Backoff Reconnection (1s -> 2s -> 4s -> 8s -> max 15s)
    if (cameraManagerRef.current?.isActive() && rendererRef.current?.isRunning) {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      
      const delay = reconnectDelayRef.current;
      console.log(`[PHONE] Scheduling reconnect in ${delay}ms`);
      
      reconnectTimeoutRef.current = setTimeout(() => {
        if (cameraManagerRef.current?.isActive() && rendererRef.current?.isRunning) {
          startRemoteStream();
        }
      }, delay);

      reconnectDelayRef.current = Math.min(reconnectDelayRef.current * 2, 15000);
    }
  };

  const startSession = async () => {
    setErrorMsg(null);
    if (!videoRef.current || !canvasRef.current) return;

    try {
      const camera = cameraManagerRef.current;
      camera.setVideoElement(videoRef.current);
      await camera.startCamera();
      console.log('[PHONE] Camera ready');
      setCameraDebugStatus('READY');

      const devices = await camera.getAvailableCameras();
      setAvailableCameras(devices);

      const renderer = new ARRenderer(canvasRef.current, videoRef.current, faceTrackerRef.current);
      renderer.setFilter(activeFilterRef.current);

      renderer.onFpsUpdate = (currentFps) => {
        setFps(currentFps);
      };

      // Set canvas status once first frame renders
      renderer.onFrameRendered = () => {
        if (canvasDebugStatus !== 'READY') {
          setCanvasDebugStatus('READY');
          console.log('[PHONE] AR renderer ready & Canvas is rendering');
          // Start stream once canvas is actively rendering
          startRemoteStream();
        }
      };

      rendererRef.current = renderer;
      renderer.start();
      console.log('[PHONE] AR renderer started');

    } catch (err) {
      console.error('[PHONE] Start session error:', err);
      setErrorMsg(err.message || 'Failed to start camera');
      setCameraDebugStatus('FAILED');
    }
  };

  const flipCamera = async () => {
    if (!cameraManagerRef.current) return;
    try {
      await cameraManagerRef.current.switchCamera();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const stopSession = () => {
    console.log('[PHONE] Stopping session');
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    if (mediaCallRef.current) {
      try { mediaCallRef.current.close(); } catch (e) {}
      mediaCallRef.current = null;
    }
    if (canvasStreamRef.current) {
      canvasStreamRef.current.getTracks().forEach((t) => t.stop());
      canvasStreamRef.current = null;
    }
    if (cameraManagerRef.current) {
      cameraManagerRef.current.stopCamera();
    }
    if (rendererRef.current) {
      rendererRef.current.stop();
    }
    if (recorderRef.current && isRecording) {
      recorderRef.current.stopRecording().catch(console.warn);
      setIsRecording(false);
    }

    setFps(0);
    setCameraDebugStatus('IDLE');
    setCanvasDebugStatus('IDLE');
    setCanvasStreamStatus('MISSING');
    setMediaCallStatus('IDLE');
  };

  const capturePhoto = () => {
    if (!rendererRef.current || cameraState !== 'active') return;

    setSnapshotFlash(true);
    setTimeout(() => setSnapshotFlash(false), 220);

    const snapshot = rendererRef.current.captureSnapshot();
    if (snapshot) {
      // 1. Download on Mobile
      const link = document.createElement('a');
      link.download = `SnapAI_${activeFilterRef.current.name}_${Date.now()}.png`;
      link.href = snapshot;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // 2. Synchronize to Laptop over DataChannel & BroadcastChannel
      const snapshotPayload = {
        type: 'REMOTE_SNAPSHOT',
        image: snapshot,
        filterName: activeFilterRef.current.name,
        filterIcon: activeFilterRef.current.icon,
        timestamp: new Date().toLocaleTimeString()
      };

      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.postMessage(snapshotPayload);
      }

      if (dataConnRef.current && dataConnRef.current.open) {
        try {
          dataConnRef.current.send(snapshotPayload);
        } catch (e) {}
      }
    }
  };

  const toggleRecording = async () => {
    const recorder = recorderRef.current;
    if (!recorder || !canvasRef.current || cameraState !== 'active') return;

    if (!isRecording) {
      try {
        recorder.startRecording(canvasRef.current, (time) => {
          setRecordingTime(time);
        });
        setIsRecording(true);
      } catch (err) {
        setErrorMsg(err.message);
      }
    } else {
      try {
        const result = await recorder.stopRecording();
        setIsRecording(false);
        setRecordingTime('00:00');
        if (result && result.url) {
          recorder.downloadVideo(result.url, activeFilterRef.current.name);
        }
      } catch (err) {
        setErrorMsg('Error exporting video: ' + err.message);
      }
    }
  };

  const categories = ['All', 'Cute AR', 'Beauty', 'Cyber', 'Cinematic', 'Artistic', 'AR Props'];
  const filteredList = selectedCategory === 'All'
    ? ALL_FILTERS
    : ALL_FILTERS.filter((f) => f.category === selectedCategory || (selectedCategory === 'Cute AR' && f.category === 'Cute AR'));

  const isCameraActive = cameraState === 'active';

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#060609',
      color: '#f8fafc'
    }}>
      {/* Clean Mobile Header */}
      <header style={{
        padding: '12px 18px',
        backgroundColor: 'rgba(10, 10, 14, 0.92)',
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
              Real-Time Web AR Lenses
            </p>
          </div>
        </div>

        {/* Top Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isCameraActive && (
            <>
              {availableCameras.length > 1 && (
                <button
                  onClick={flipCamera}
                  title="Flip Camera (Front/Rear)"
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
                    fontSize: '15px',
                    cursor: 'pointer'
                  }}
                >
                  🔄
                </button>
              )}

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
        gap: '12px'
      }}>
        
        {/* On-Screen Diagnostic Debug Panel */}
        <div style={{
          width: '100%',
          backgroundColor: '#0c0d14',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '10px 14px',
          fontSize: '10px',
          fontFamily: 'monospace'
        }}>
          <div style={{ fontWeight: '800', color: '#cbd5e1', marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
            <span>🛠️ PHONE STREAM DIAGNOSTICS</span>
            <span style={{ color: '#ec4899' }}>{mediaCallStatus === 'CONNECTED' ? 'STREAMING' : 'OFFLINE'}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '6px' }}>
            <div>Peer: <strong style={{ color: peerDebugStatus === 'READY' ? '#4ade80' : '#f87171' }}>{peerDebugStatus}</strong></div>
            <div>Camera: <strong style={{ color: cameraDebugStatus === 'READY' ? '#4ade80' : '#94a3b8' }}>{cameraDebugStatus}</strong></div>
            <div>AR Canvas: <strong style={{ color: canvasDebugStatus === 'READY' ? '#4ade80' : '#94a3b8' }}>{canvasDebugStatus}</strong></div>
            <div>Canvas Stream: <strong style={{ color: canvasStreamStatus === 'LIVE' ? '#4ade80' : '#f87171' }}>{canvasStreamStatus}</strong></div>
            <div>Media Call: <strong style={{ color: mediaCallStatus === 'CONNECTED' ? '#4ade80' : mediaCallStatus === 'CONNECTING' ? '#facc15' : '#94a3b8' }}>{mediaCallStatus}</strong></div>
          </div>
        </div>

        {/* Camera Viewfinder */}
        <div style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '3/4',
          maxHeight: '60vh',
          backgroundColor: '#0a0a0f',
          borderRadius: '24px',
          overflow: 'hidden',
          border: '1.5px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {snapshotFlash && (
            <div style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: '#ffffff',
              zIndex: 40,
              pointerEvents: 'none'
            }} />
          )}

          {isRecording && (
            <div style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              zIndex: 30,
              backgroundColor: 'rgba(239, 68, 68, 0.88)',
              color: '#ffffff',
              padding: '4px 10px',
              borderRadius: '999px',
              fontSize: '11px',
              fontWeight: '800',
              fontFamily: 'monospace',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 0 12px rgba(239, 68, 68, 0.6)'
            }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ffffff', animation: 'pulseGlow 1s infinite' }}></span>
              REC {recordingTime}
            </div>
          )}

          <video ref={videoRef} playsInline muted style={{ display: 'none' }} />

          <canvas
            ref={canvasRef}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: isCameraActive ? 'block' : 'none'
            }}
          />

          {!isCameraActive && (
            <div style={{ textAlign: 'center', padding: '28px', color: '#94a3b8' }}>
              <div style={{
                width: '68px',
                height: '68px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.2), rgba(168, 85, 247, 0.2))',
                border: '1.5px dashed rgba(255, 255, 255, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 14px auto',
                fontSize: '32px'
              }}>
                ✨
              </div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#ffffff', letterSpacing: '-0.01em' }}>
                Can we start?
              </div>
              <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '6px', maxWidth: '280px', margin: '6px auto 0 auto' }}>
                Tap "shall we start cam for <strong>ar lens?</strong>"
              </p>
            </div>
          )}

          {isCameraActive && (
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
              gap: '6px',
              zIndex: 20
            }}>
              <span>{activeFilter.icon}</span>
              <span>{activeFilter.name}</span>
            </div>
          )}
        </div>

        {/* Category Pills */}
        <div style={{
          width: '100%',
          display: 'flex',
          gap: '6px',
          overflowX: 'auto',
          padding: '2px 0',
          scrollbarWidth: 'none'
        }}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: '4px 10px',
                borderRadius: '999px',
                border: selectedCategory === cat ? '1px solid #ec4899' : '1px solid rgba(255, 255, 255, 0.08)',
                backgroundColor: selectedCategory === cat ? 'rgba(236, 72, 153, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                color: selectedCategory === cat ? '#ffffff' : '#94a3b8',
                fontSize: '11px',
                fontWeight: '600',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* AR Filter Carousel */}
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
            {filteredList.map((lens) => {
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
                    backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.16)' : 'rgba(255, 255, 255, 0.04)',
                    border: isSelected ? '2px solid #ec4899' : '1px solid rgba(255, 255, 255, 0.08)',
                    cursor: 'pointer',
                    scrollSnapAlign: 'center',
                    minWidth: '72px',
                    boxShadow: isSelected ? '0 0 16px rgba(236, 72, 153, 0.6)' : 'none',
                    transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                    transition: 'all 0.18s ease'
                  }}
                >
                  <span style={{ fontSize: '24px', lineHeight: 1 }}>{lens.icon}</span>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: isSelected ? '800' : '600',
                    color: isSelected ? '#ffffff' : '#94a3b8',
                    marginTop: '4px',
                    whiteSpace: 'nowrap'
                  }}>
                    {lens.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ width: '100%', marginTop: 'auto', paddingBottom: '8px' }}>
          {!isCameraActive ? (
            <button
              onClick={() => startSession()}
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
              ✨ Yes, Start Lenses
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
              <button
                onClick={toggleRecording}
                title={isRecording ? 'Stop Recording' : 'Record Video'}
                style={{
                  flex: 1,
                  padding: '12px 14px',
                  backgroundColor: isRecording ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                  color: isRecording ? '#f87171' : '#ffffff',
                  border: isRecording ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '14px',
                  cursor: 'pointer',
                  fontWeight: '700',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                {isRecording ? '⏹ Stop Rec' : '🎥 Record'}
              </button>

              <button
                onClick={capturePhoto}
                title="Take Snap Photo"
                style={{
                  width: '62px',
                  height: '62px',
                  borderRadius: '50%',
                  backgroundColor: '#ffffff',
                  border: '4px solid rgba(255, 255, 255, 0.3)',
                  boxShadow: '0 0 20px rgba(255, 255, 255, 0.5)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '22px',
                  flexShrink: 0
                }}
              >
                📸
              </button>

              <button
                onClick={stopSession}
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
