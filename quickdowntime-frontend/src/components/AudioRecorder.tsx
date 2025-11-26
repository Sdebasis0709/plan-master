// src/components/AudioRecorder.tsx
import { useEffect, useRef, useState } from "react";

export default function AudioRecorder({ onSave }: { onSave: (blob: Blob) => void }) {
  const [recording, setRecording] = useState(false);
  const [available, setAvailable] = useState<boolean>(false);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      setAvailable(true);
    }
  }, []);

  async function start() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mr = new MediaRecorder(stream);
    mediaRef.current = mr;
    chunksRef.current = [];
    mr.ondataavailable = (e) => chunksRef.current.push(e.data);
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      onSave(blob);
    };
    mr.start();
    setRecording(true);
  }

  function stop() {
    mediaRef.current?.stop();
    setRecording(false);
  }

  if (!available) return <div>Audio not supported</div>;

  return (
    <div>
      {recording ? (
        <button onClick={stop} className="px-3 py-1 bg-red-600 rounded">Stop</button>
      ) : (
        <button onClick={start} className="px-3 py-1 bg-green-600 rounded">Record</button>
      )}
    </div>
  );
}
