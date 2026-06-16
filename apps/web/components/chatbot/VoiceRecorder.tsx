'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Loader2 } from 'lucide-react';

interface VoiceRecorderProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
  autoStart?: boolean;
}

export function VoiceRecorder({ onTranscript, disabled, autoStart }: VoiceRecorderProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported] = useState(() => {
    return typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
  });
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const startListening = useCallback(() => {
    if (recognitionRef.current) return;

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = 'es-PE';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = Array.from(event.results)
        .map((r) => r[0].transcript)
        .join('');

      if (event.results[0].isFinal) {
        onTranscript(transcript);
        setIsListening(false);
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [onTranscript]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const toggle = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  useEffect(() => {
    if (autoStart && !disabled) {
      const timer = setTimeout(() => {
        startListening();
      }, 300);
      return () => {
        clearTimeout(timer);
        stopListening();
      };
    }
    if (!autoStart) {
      stopListening();
    }
  }, [autoStart, disabled, startListening, stopListening]);

  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  if (!isSupported) return null;

  return (
    <Button
      type="button"
      size="icon"
      variant={isListening ? 'destructive' : 'ghost'}
      onClick={toggle}
      disabled={disabled}
      title={isListening ? 'Escuchando... habla ahora' : 'Grabar voz'}
      className={`shrink-0 ${isListening ? 'animate-pulse' : ''}`}
    >
      {isListening ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
    </Button>
  );
}
