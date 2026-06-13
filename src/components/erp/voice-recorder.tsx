// components/voice-recorder.tsx
'use client';

import { useState, useRef } from 'react';
import { Mic, Square, Play, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function VoiceRecorder({ paymentId, onUpload }: { paymentId: string; onUpload: (url: string) => void }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder.current = new MediaRecorder(stream);
    chunks.current = [];

    mediaRecorder.current.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.current.push(e.data);
    };

    mediaRecorder.current.onstop = async () => {
      const blob = new Blob(chunks.current, { type: 'audio/mp3' });
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      
      // آپلود
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', blob, 'voice.mp3');
      formData.append('paymentId', paymentId);
      
      const res = await fetch('/api/upload/voice', { method: 'POST', body: formData });
      if (res.ok) {
        const data = await res.json();
        onUpload(data.url);
      }
      setIsUploading(false);
    };

    mediaRecorder.current.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    mediaRecorder.current?.stop();
    mediaRecorder.current?.stream.getTracks().forEach(track => track.stop());
    setIsRecording(false);
  };

  return (
    <div className="flex items-center gap-2">
      {isRecording ? (
        <Button onClick={stopRecording} variant="destructive" size="sm" className="gap-2">
          <Square className="w-4 h-4" />
          توقف ضبط
        </Button>
      ) : (
        <Button onClick={startRecording} variant="outline" size="sm" className="gap-2">
          <Mic className="w-4 h-4" />
          ضبط ویس
        </Button>
      )}
      
      {isUploading && <Loader2 className="w-4 h-4 animate-spin" />}
      
      {audioUrl && !isUploading && (
        <audio controls src={audioUrl} className="h-8" />
      )}
    </div>
  );
}