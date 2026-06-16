'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX } from 'lucide-react';

interface VoicePlayerProps {
  text: string;
}

export function VoicePlayer({ text }: VoicePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSupported] = useState(() => {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  });

  const speak = useCallback(() => {
    if (!window.speechSynthesis) return;

    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-PE';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);

    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
  }, [text, isPlaying]);

  if (!isSupported) return null;

  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      onClick={speak}
      title={isPlaying ? 'Detener' : 'Leer en voz alta'}
      className="h-6 w-6 shrink-0"
    >
      {isPlaying ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
    </Button>
  );
}
