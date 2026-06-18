import { useRef, useState } from 'react';

export default function TestCamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const time = new Date().toLocaleTimeString();
    const logMessage = `${time}: ${message}`;
    console.log(logMessage);
    setLogs(prev => [...prev, logMessage]);
  };

  const stopCurrentStream = () => {
    if (stream) {
      addLog('🛑 Deteniendo stream...');
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const enumerateCameras = async () => {
    try {
      addLog('📹 Enumerando dispositivos...');
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      setCameras(videoDevices);
      videoDevices.forEach((device, i) => {
        addLog(`  ↳ Cámara ${i + 1}: ${device.label || 'Sin nombre'}`);
      });
      addLog(`✅ ${videoDevices.length} cámaras encontradas`);
      
      return videoDevices;
    } catch (error: any) {
      addLog(`❌ Error enumerando: ${error.message}`);
      return [];
    }
  };

  const initCameraStream = async (facingMode: string = 'environment', deviceId?: string) => {
    stopCurrentStream();
    
    const size = 1280;
    const constraints: MediaStreamConstraints = {
      audio: false,
      video: deviceId 
        ? { deviceId: { exact: deviceId }, width: { ideal: size }, height: { ideal: size } }
        : { width: { ideal: size }, height: { ideal: size }, facingMode: facingMode }
    };

    try {
      addLog(`📹 getUserMedia con ${deviceId ? 'deviceId' : 'facingMode: ' + facingMode}...`);
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      addLog('✅ Stream obtenido!');
      setStream(mediaStream);
      
      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = mediaStream;
        
        await new Promise<void>((resolve) => {
          video.onloadedmetadata = () => {
            addLog('✅ Video metadata cargado');
            resolve();
          };
        });
        
        await video.play();
        addLog('✅ Video reproduciendo!');
        
        const track = mediaStream.getVideoTracks()[0];
        const settings = track.getSettings();
        addLog(`📐 Resolución: ${settings.width}x${settings.height}`);
        
        setCameraActive(true);
      }
    } catch (err: any) {
      addLog(`❌ Error: ${err.message}`);
      alert("Error: " + err.message);
    }
  };

  const handleStartCamera = async () => {
    addLog('🚀 INICIANDO MÉTODO KASPER...');
    
    if (cameras.length > 0) {
      await initCameraStream('environment', selectedCameraId);
      return;
    }
    
    addLog('📍 PASO 1: Permiso genérico SIN facingMode');
    
    try {
      const permissionStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: true,
      });
      
      addLog('✅ Permiso concedido');
      
      addLog('📍 PASO 2: Deteniendo stream de permisos');
      permissionStream.getTracks().forEach(track => {
        track.stop();
        addLog(`  ↳ Track ${track.kind} detenido`);
      });
      
      addLog('📍 PASO 3: Enumerando dispositivos');
      const cams = await enumerateCameras();
      
      const backCamera = cams.find(c => 
        c.label.toLowerCase().includes('back') || 
        c.label.toLowerCase().includes('trasera') ||
        c.label.toLowerCase().includes('rear') ||
        c.label.toLowerCase().includes('environment')
      );
      
      addLog('📍 PASO 4: Iniciando cámara final');
      if (backCamera) {
        addLog(`🎯 Usando cámara trasera: ${backCamera.label}`);
        setSelectedCameraId(backCamera.deviceId);
        await initCameraStream('environment', backCamera.deviceId);
      } else {
        addLog('⚠️ Cámara trasera no encontrada, usando facingMode');
        await initCameraStream('environment');
      }
      
    } catch (err: any) {
      addLog(`❌ Error: ${err.message}`);
      if (err.name === 'NotAllowedError') {
        alert('Permiso denegado. Por favor recarga y acepta el permiso.');
      } else {
        alert("Error: " + err.message);
      }
    }
  };

  const handleTakePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    addLog(`📸 Capturando: ${canvas.width}x${canvas.height}`);
    
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedPhoto(dataUrl);
    addLog('✅ Foto capturada!');
  };

  const handleStopCamera = () => {
    stopCurrentStream();
    setCameraActive(false);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    addLog('🛑 Cámara detenida');
  };

  return (
    <div style={{ maxWidth: '600px', margin: '20px auto', padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ fontSize: '24px', marginBottom: '20px' }}>🎥 Test de Cámara - Método Kasper</h1>
      <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>
        Página aislada sin interferencias
      </p>

      <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
        {!cameraActive ? (
          <button
            onClick={handleStartCamera}
            style={{
              width: '100%',
              padding: '15px',
              fontSize: '18px',
              fontWeight: 'bold',
              background: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            1️⃣ Iniciar Cámara
          </button>
        ) : (
          <div>
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              style={{
                width: '100%',
                background: '#000',
                borderRadius: '8px',
                marginBottom: '10px'
              }}
            />
            
            {cameras.length > 1 && (
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  📹 Cambiar Cámara:
                </label>
                <select
                  value={selectedCameraId}
                  onChange={(e) => {
                    setSelectedCameraId(e.target.value);
                    initCameraStream('environment', e.target.value);
                  }}
                  style={{
                    width: '100%',
                    padding: '10px',
                    fontSize: '14px',
                    borderRadius: '5px',
                    border: '1px solid #ccc'
                  }}
                >
                  {cameras.map((camera, i) => (
                    <option key={camera.deviceId} value={camera.deviceId}>
                      {camera.label || `Cámara ${i + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            <button
              onClick={handleTakePhoto}
              style={{
                width: '100%',
                padding: '15px',
                fontSize: '18px',
                fontWeight: 'bold',
                background: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                marginBottom: '10px'
              }}
            >
              2️⃣ Tomar Foto 📸
            </button>
            
            <button
              onClick={handleStopCamera}
              style={{
                width: '100%',
                padding: '10px',
                fontSize: '16px',
                fontWeight: 'bold',
                background: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              🛑 Detener Cámara
            </button>

            <canvas ref={canvasRef} style={{ display: 'none' }} />
            
            {capturedPhoto && (
              <div style={{ marginTop: '15px' }}>
                <p style={{ fontWeight: 'bold', marginBottom: '10px' }}>✅ Foto capturada:</p>
                <img 
                  src={capturedPhoto} 
                  alt="Captura" 
                  style={{
                    width: '100%',
                    borderRadius: '8px',
                    border: '3px solid #28a745'
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{
        marginTop: '20px',
        background: '#f8f9fa',
        padding: '15px',
        borderRadius: '8px',
        maxHeight: '300px',
        overflowY: 'auto'
      }}>
        <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px' }}>📋 Logs:</h3>
        {logs.map((log, i) => (
          <div key={i} style={{
            fontSize: '12px',
            padding: '3px 0',
            borderBottom: '1px solid #dee2e6',
            fontFamily: 'monospace'
          }}>
            {log}
          </div>
        ))}
      </div>
    </div>
  );
}
