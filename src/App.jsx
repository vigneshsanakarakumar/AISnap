import React, { useState, useEffect, useRef, Component } from 'react';
import Peer from 'peerjs';

import { CameraManager } from './ar/camera/CameraManager.js';
import { FaceTracker } from './ar/tracking/FaceTracker.js';
import { ARRenderer } from './ar/renderer/ARRenderer.js';
import { ARRecorder } from './ar/utils/recorder.js';
import { ALL_FILTERS } from './ar/filters/index.js';

// Global default room channel
const DEFAULT_CHANNEL = 'aisnap-room';

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

// Dedicated Receiver Portal (/aa) with Photo Gallery & Download Support
function DedicatedReceiver() {
  const [remoteImage, setRemoteImage] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [remoteFilterName, setRemoteFilterName] = useState('RAW');
  const [remoteFilterIcon, setRemoteFilterIcon] = useState('📷');
  const [remoteTimestamp, setRemoteTimestamp] = useState(null);
  const [connectionState, setConnectionState] = useState('Initializing Cloud Link...');
  const [isConnected, setIsConnected] = useState(false);
  const [receiverFps, setReceiverFps] = useState(0);
  const [roomCode, setRoomCode] = useState(DEFAULT_CHANNEL);
  const [savedPhotos, setSavedPhotos] = useState([]);
  const [newPhotoToast, setNewPhotoToast] = useState(null);

  const videoRef = useRef(null);
  const peerRef = useRef(null);
  const activeConnRef = useRef(null);
  const broadcastChannelRef = useRef(null);
  const receiverFrameCountRef = useRef(0);
  const receiverLastFpsUpdateRef = useRef(Date.now());
  const retryIntervalRef = useRef(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const targetRoom = urlParams.get('room') || DEFAULT_CHANNEL;
    setRoomCode(targetRoom);

    // 1. Same-device local BroadcastChannel
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const channel = new BroadcastChannel('snap_filter_broadcast_stream');
        broadcastChannelRef.current = channel;

        channel.onmessage = (event) => {
          try {
            const { type, frame, image, filterName, filterIcon, timestamp } = event.data || {};
            if (type === 'SNAP_FRAME' && frame) {
              setRemoteImage(frame);
              setRemoteFilterName(filterName || 'Filter');
              setRemoteFilterIcon(filterIcon || '✨');
              setRemoteTimestamp(timestamp || new Date().toLocaleTimeString());
              setConnectionState('CONNECTED (SAME-DEVICE SYNC)');
              setIsConnected(true);
              updateFps();
            } else if (type === 'REMOTE_SNAPSHOT' && image) {
              handleNewSnapshot({ image, filterName, filterIcon, timestamp });
            } else if (type === 'SNAP_STREAM_CLOSED') {
              setRemoteImage(null);
              setRemoteStream(null);
              setConnectionState('BROADCAST ENDED');
              setIsConnected(false);
              setReceiverFps(0);
            }
          } catch (e) {
            console.error('Local channel error:', e);
          }
        };
      }
    } catch (e) {
      console.warn('BroadcastChannel error:', e);
    }

    // 2. Internet WebRTC Peer
    const receiverId = `aisnap-rx-${Math.random().toString(36).substring(2, 8)}`;
    const peer = new Peer(receiverId, {
      debug: 1,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' }
        ]
      }
    });

    peerRef.current = peer;

    peer.on('open', () => {
      setConnectionState(`Searching for Mobile Host on "${targetRoom}"...`);
      attemptConnection(peer, targetRoom);
    });

    peer.on('call', (call) => {
      call.answer();
      call.on('stream', (stream) => {
        setRemoteStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(console.warn);
        }
        setIsConnected(true);
        setConnectionState('LIVE WEBRTC VIDEO');
      });
    });

    peer.on('error', (err) => {
      if (err.type === 'peer-unavailable') {
        setConnectionState(`Waiting for Mobile to start camera on "${targetRoom}"...`);
      }
    });

    // Auto-reconnect heartbeat every 1.5 seconds for instant pairing upon phone reload
    retryIntervalRef.current = setInterval(() => {
      if (peer && !peer.destroyed && !activeConnRef.current?.open) {
        attemptConnection(peer, targetRoom);
      }
    }, 1500);

    return () => {
      if (broadcastChannelRef.current) {
        try { broadcastChannelRef.current.close(); } catch (e) {}
      }
      if (peer) {
        try { peer.destroy(); } catch (e) {}
      }
      if (retryIntervalRef.current) {
        clearInterval(retryIntervalRef.current);
      }
    };
  }, []);

  const handleNewSnapshot = (photo) => {
    setSavedPhotos((prev) => [photo, ...prev]);
    setNewPhotoToast(photo);
    setTimeout(() => {
      setNewPhotoToast(null);
    }, 6000);
  };

  const attemptConnection = (peer, targetRoom) => {
    if (!peer || peer.destroyed) return;

    try {
      const conn = peer.connect(targetRoom, {
        reliable: false,
        serialization: 'json'
      });

      conn.on('open', () => {
        activeConnRef.current = conn;
        setConnectionState('CONNECTED (STREAMING)');
        setIsConnected(true);
        try {
          conn.send({ type: 'REQUEST_FRAME' });
        } catch (e) {}
      });

      conn.on('data', (data) => {
        if (data && data.type === 'FRAME_DATA' && data.frame) {
          setRemoteImage(data.frame);
          setRemoteFilterName(data.filterName || 'Lens');
          setRemoteFilterIcon(data.filterIcon || '✨');
          setRemoteTimestamp(data.timestamp);
          setIsConnected(true);
          setConnectionState('LIVE CLOUD STREAM');
          updateFps();
        } else if (data && data.type === 'REMOTE_SNAPSHOT' && data.image) {
          handleNewSnapshot(data);
        }
      });

      conn.on('close', () => {
        activeConnRef.current = null;
        setIsConnected(false);
        setConnectionState('Stream Paused / Reconnecting...');
      });

      conn.on('error', () => {
        activeConnRef.current = null;
        setIsConnected(false);
      });
    } catch (e) {
      console.warn('Attempt connection error:', e);
    }
  };

  const updateFps = () => {
    receiverFrameCountRef.current += 1;
    const now = Date.now();
    if (now - receiverLastFpsUpdateRef.current >= 1000) {
      setReceiverFps(receiverFrameCountRef.current);
      receiverFrameCountRef.current = 0;
      receiverLastFpsUpdateRef.current = now;
    }
  };

  const downloadPhoto = (photo) => {
    const a = document.createElement('a');
    a.href = photo.image;
    a.download = `SnapAI_${photo.filterName || 'Photo'}_${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const hasFeed = Boolean(remoteStream || remoteImage);

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
              CHANNEL // {roomCode}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{
            padding: '4px 12px',
            borderRadius: '999px',
            fontSize: '11px',
            fontWeight: '700',
            backgroundColor: hasFeed ? 'rgba(34, 197, 94, 0.18)' : 'rgba(234, 179, 8, 0.15)',
            color: hasFeed ? '#4ade80' : '#facc15',
            border: `1px solid ${hasFeed ? 'rgba(34, 197, 94, 0.3)' : 'rgba(234, 179, 8, 0.3)'}`,
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: hasFeed ? '#4ade80' : '#facc15',
              display: 'inline-block'
            }}></span>
            {hasFeed ? `STREAMING (${receiverFps || 30} FPS)` : 'CONNECTING'}
          </span>

          {hasFeed && (
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
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                display: remoteStream ? 'block' : 'none'
              }}
            />

            {!remoteStream && remoteImage && (
              <img
                src={remoteImage}
                alt="Live Stream from Phone"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            )}

            {!hasFeed && (
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
                  {connectionState}
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
                  Instructions: Open <strong>https://snap-filter-bay.vercel.app/</strong> on your phone and tap Start
                </div>
              </div>
            )}
          </div>

          {remoteTimestamp && (
            <div style={{ padding: '10px 16px', fontSize: '11px', color: '#64748b', textAlign: 'right', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
              CLOUD PACKET RX: <span style={{ color: '#cbd5e1' }}>{remoteTimestamp}</span>
            </div>
          )}
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

// Main Production Web AR Camera Studio
function SnapStudio() {
  const [activeFilter, setActiveFilter] = useState(ALL_FILTERS[0]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cameraState, setCameraState] = useState('idle');
  const [isFaceDetected, setIsFaceDetected] = useState(false);
  const [fps, setFps] = useState(0);
  const [errorMsg, setErrorMsg] = useState(null);
  const [snapshotFlash, setSnapshotFlash] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState('00:00');
  const [availableCameras, setAvailableCameras] = useState([]);
  const [roomCode] = useState(DEFAULT_CHANNEL);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const broadcastCanvasRef = useRef(null);
  const cameraManagerRef = useRef(null);
  const faceTrackerRef = useRef(null);
  const rendererRef = useRef(null);
  const recorderRef = useRef(null);
  const peerRef = useRef(null);
  const broadcastChannelRef = useRef(null);
  const connectedClientsRef = useRef([]);

  const activeFilterRef = useRef(activeFilter);
  useEffect(() => {
    activeFilterRef.current = activeFilter;
    if (rendererRef.current) {
      rendererRef.current.setFilter(activeFilter);
    }
  }, [activeFilter]);

  // Create lightweight compression canvas for DataChannel packet limit (<64KB)
  useEffect(() => {
    const offscreen = document.createElement('canvas');
    offscreen.width = 360;
    offscreen.height = 480;
    broadcastCanvasRef.current = offscreen;
  }, []);

  // Initialize Modules & PeerJS Host
  useEffect(() => {
    const cameraManager = new CameraManager();
    const faceTracker = new FaceTracker();
    const recorder = new ARRecorder();

    cameraManagerRef.current = cameraManager;
    faceTrackerRef.current = faceTracker;
    recorderRef.current = recorder;

    cameraManager.setStatusCallback(({ status, error }) => {
      setCameraState(status);
      if (error) setErrorMsg(error);
    });

    faceTracker.initialize().catch(console.warn);

    // Setup Local BroadcastChannel
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        broadcastChannelRef.current = new BroadcastChannel('snap_filter_broadcast_stream');
      }
    } catch (e) {
      console.warn('BroadcastChannel error:', e);
    }

    // Setup PeerJS Host
    initHostPeer(roomCode);

    // Clean unload cleanup
    const handleUnload = () => {
      if (peerRef.current) {
        try { peerRef.current.destroy(); } catch (e) {}
      }
    };
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      window.removeEventListener('beforeunload', handleUnload);
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
  }, [roomCode]);

  const getCompressedFrame = () => {
    if (!canvasRef.current || !broadcastCanvasRef.current) return null;
    try {
      const offscreen = broadcastCanvasRef.current;
      const ctx = offscreen.getContext('2d');
      ctx.drawImage(canvasRef.current, 0, 0, offscreen.width, offscreen.height);
      return offscreen.toDataURL('image/jpeg', 0.42);
    } catch (e) {
      return null;
    }
  };

  const sendLatestFrame = (conn) => {
    if (!conn || !conn.open) return;
    try {
      const frameData = getCompressedFrame();
      if (frameData) {
        conn.send({
          type: 'FRAME_DATA',
          frame: frameData,
          filterName: activeFilterRef.current.name,
          filterIcon: activeFilterRef.current.icon,
          timestamp: new Date().toLocaleTimeString()
        });
      }
    } catch (e) {
      console.warn('Send latest frame error:', e);
    }
  };

  const initHostPeer = (hostId) => {
    if (peerRef.current) {
      try { peerRef.current.destroy(); } catch (e) {}
    }

    const hostPeer = new Peer(hostId, {
      debug: 1,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' }
        ]
      }
    });

    peerRef.current = hostPeer;

    hostPeer.on('open', (id) => {
      console.log('PeerJS Host Registered:', id);
    });

    hostPeer.on('connection', (conn) => {
      console.log('Incoming connection from client:', conn.peer);

      const registerConnection = () => {
        if (!connectedClientsRef.current.some((c) => c.peer === conn.peer)) {
          connectedClientsRef.current.push(conn);
        }

        // Direct WebRTC MediaStream call if canvas stream is active
        if (canvasRef.current && canvasRef.current.captureStream) {
          try {
            const stream = canvasRef.current.captureStream(25);
            hostPeer.call(conn.peer, stream);
          } catch (e) {
            console.warn('Host call stream error:', e);
          }
        }

        // Transmit lightweight frame
        sendLatestFrame(conn);
      };

      if (conn.open) {
        registerConnection();
      } else {
        conn.on('open', registerConnection);
      }

      conn.on('data', (data) => {
        if (data?.type === 'REQUEST_FRAME' || data?.type === 'PING') {
          registerConnection();
        }
      });

      const removeConn = () => {
        connectedClientsRef.current = connectedClientsRef.current.filter((c) => c.peer !== conn.peer);
      };

      conn.on('close', removeConn);
      conn.on('error', removeConn);
    });

    hostPeer.on('error', (err) => {
      console.warn('Host peer notice:', err);
      // Auto-recover immediately on reload
      if (err.type === 'unavailable-id') {
        setTimeout(() => initHostPeer(hostId), 1200);
      }
    });
  };

  const startSession = async () => {
    setErrorMsg(null);
    if (!videoRef.current || !canvasRef.current) return;

    try {
      const camera = cameraManagerRef.current;
      camera.setVideoElement(videoRef.current);
      await camera.startCamera();

      const devices = await camera.getAvailableCameras();
      setAvailableCameras(devices);

      const renderer = new ARRenderer(canvasRef.current, videoRef.current, faceTrackerRef.current);
      renderer.setFilter(activeFilterRef.current);

      renderer.onFpsUpdate = (currentFps, hasFace) => {
        setFps(currentFps);
        setIsFaceDetected(hasFace);
      };

      // Frame Broadcast Pipeline
      let lastBroadcastTime = 0;
      renderer.onFrameRendered = (canvas, filter) => {
        const now = performance.now();
        if (now - lastBroadcastTime > 40) {
          try {
            const frameData = getCompressedFrame();
            if (!frameData) return;

            const payload = {
              type: 'SNAP_FRAME',
              frame: frameData,
              filterName: filter ? filter.name : 'Lens',
              filterIcon: filter ? filter.icon : '✨',
              timestamp: new Date().toLocaleTimeString()
            };

            // 1. Same-device BroadcastChannel
            if (broadcastChannelRef.current) {
              broadcastChannelRef.current.postMessage(payload);
            }

            // 2. WebRTC Connected Clients (Laptop / PC)
            if (connectedClientsRef.current.length > 0) {
              connectedClientsRef.current.forEach((conn) => {
                if (conn && conn.open) {
                  try {
                    conn.send({
                      type: 'FRAME_DATA',
                      frame: frameData,
                      filterName: payload.filterName,
                      filterIcon: payload.filterIcon,
                      timestamp: payload.timestamp
                    });
                  } catch (e) {
                    console.warn('Send error:', e);
                  }
                }
              });
            }

            lastBroadcastTime = now;
          } catch (e) {
            console.warn('Broadcast frame error:', e);
          }
        }
      };

      rendererRef.current = renderer;
      renderer.start();

      // Trigger WebRTC call to existing open peers
      if (connectedClientsRef.current.length > 0 && peerRef.current && canvasRef.current?.captureStream) {
        const stream = canvasRef.current.captureStream(25);
        connectedClientsRef.current.forEach((conn) => {
          try {
            peerRef.current.call(conn.peer, stream);
          } catch (e) {}
        });
      }

    } catch (err) {
      setErrorMsg(err.message || 'Failed to start camera');
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
    if (broadcastChannelRef.current) {
      try {
        broadcastChannelRef.current.postMessage({ type: 'SNAP_STREAM_CLOSED' });
      } catch (e) {}
    }

    setFps(0);
    setIsFaceDetected(false);
  };

  // High-Resolution Snapshot Capture & Remote Laptop Sync
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

      // 2. Synchronize high-res photo to Laptop receiver
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

      if (connectedClientsRef.current.length > 0) {
        connectedClientsRef.current.forEach((conn) => {
          if (conn && conn.open) {
            try {
              conn.send(snapshotPayload);
            } catch (e) {
              console.warn('Snapshot sync error:', e);
            }
          }
        });
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
      {/* Mobile Header */}
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

              {/* Face Tracking Status */}
              <span style={{
                fontSize: '10px',
                fontFamily: 'monospace',
                color: isFaceDetected ? '#4ade80' : '#facc15',
                backgroundColor: isFaceDetected ? 'rgba(34, 197, 94, 0.12)' : 'rgba(250, 204, 21, 0.12)',
                border: `1px solid ${isFaceDetected ? 'rgba(34, 197, 94, 0.25)' : 'rgba(250, 204, 21, 0.25)'}`,
                padding: '4px 8px',
                borderRadius: '999px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <span style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: isFaceDetected ? '#4ade80' : '#facc15',
                  display: 'inline-block'
                }}></span>
                {isFaceDetected ? 'FACE TRACKED' : 'SCANNING'}
              </span>

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
