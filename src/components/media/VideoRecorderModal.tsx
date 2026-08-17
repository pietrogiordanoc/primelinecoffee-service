import { useEffect, useRef, useState } from 'react';

interface VideoRecorderModalProps {
  onCapture: (blob: Blob) => void;
  onClose: () => void;
  maxDuration: number;
}

export default function VideoRecorderModal({ onCapture, onClose, maxDuration }: VideoRecorderModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [error, setError] = useState<string | null>(null);

  async function startCamera(mode: 'environment' | 'user') {
    try {
      stream?.getTracks().forEach((track) => track.stop());
      const nextStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: true,
      });
      setStream(nextStream);
      if (videoRef.current) {
        videoRef.current.srcObject = nextStream;
        await videoRef.current.play();
      }
      setError(null);
    } catch (cameraError) {
      console.error('Error accessing camera:', cameraError);
      setError('Could not access camera');
    }
  }

  function stopStream() {
    stream?.getTracks().forEach((track) => track.stop());
  }

  function close() {
    if (recording) return;
    stopStream();
    onClose();
  }

  function startRecording() {
    if (!stream) return;
    try {
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8,opus' });
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        onCapture(new Blob(chunksRef.current, { type: 'video/webm' }));
        stopStream();
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
      setSeconds(0);
    } catch (recordingError) {
      console.error('Error starting recording:', recordingError);
      setError('Could not start recording');
    }
  }

  function stopRecording() {
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.stop();
      setRecording(false);
    }
  }

  async function toggleCamera() {
    if (recording) return;
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    await startCamera(nextMode);
  }

  useEffect(() => {
    startCamera(facingMode);
    return () => stopStream();
  }, []);

  useEffect(() => {
    if (!recording) return;
    const timer = window.setInterval(() => {
      setSeconds((current) => {
        if (current + 1 >= maxDuration) {
          stopRecording();
          return maxDuration;
        }
        return current + 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [recording, maxDuration]);

  const formattedTime = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col">
      <video ref={videoRef} autoPlay playsInline muted={!recording} className="w-full h-full object-cover" />
      {recording && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 rounded-full bg-red-600/90 px-4 py-2 text-white font-bold">
          <span className="mr-2">●</span>{formattedTime} / {String(Math.floor(maxDuration / 60)).padStart(2, '0')}:{String(maxDuration % 60).padStart(2, '0')}
        </div>
      )}
      {error && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-lg bg-red-600/90 p-4 text-white">{error}</div>}
      <div className="absolute bottom-0 inset-x-0 flex items-center justify-around bg-black/50 p-8">
        <button type="button" onClick={close} disabled={recording} className="h-12 w-12 rounded-full border-3 border-white bg-red-600/80 text-2xl text-white disabled:opacity-50">×</button>
        <button type="button" onClick={recording ? stopRecording : startRecording} className="h-[70px] w-[70px] rounded-full border-[5px] border-white bg-red-600/80 text-2xl text-white">{recording ? '■' : '●'}</button>
        <button type="button" onClick={toggleCamera} disabled={recording} className="h-12 w-12 rounded-full border-3 border-white bg-gray-600/80 text-2xl text-white disabled:opacity-50">↻</button>
      </div>
    </div>
  );
}