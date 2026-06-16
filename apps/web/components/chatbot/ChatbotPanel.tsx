'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { apiClient } from '@/lib/api-client';
import { X, MessageSquare, Trash2, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: { title: string; source: string; module: string | null }[];
}

const WELCOME_TEXT = '¡Hola! Soy el asistente de ThesisReview. Puedo responder preguntas sobre la arquitectura, el código, las funcionalidades del sistema y la tesis. ¿En qué puedo ayudarte?';

function speakAndWait(text: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      resolve();
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-PE';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}

export function ChatbotPanel({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([
    { id: 'welcome', role: 'assistant', content: WELCOME_TEXT },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [autoListening, setAutoListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pendingSpeak = useRef(false);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const speakMessage = useCallback(async (text: string) => {
    setIsSpeaking(true);
    setAutoListening(false);
    await speakAndWait(text);
    setIsSpeaking(false);
    setAutoListening(true);
  }, []);

  useEffect(() => {
    const handler = () => {
      setUserInteracted(true);
      setTimeout(() => speakMessage(WELCOME_TEXT), 300);
    };
    document.addEventListener('click', handler, { once: true });
    return () => document.removeEventListener('click', handler);
  }, [speakMessage]);

  useEffect(() => {
    if (messages.length > 1 && !pendingSpeak.current) {
      const last = messages[messages.length - 1];
      if (last.role === 'assistant') {
        pendingSpeak.current = true;
        speakMessage(last.content);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  const handleSend = useCallback(async (text: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setAutoListening(false);

    try {
      const history = messages
        .filter((m) => m.id !== 'welcome')
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.content }));

      const { data } = await apiClient.post('/chatbot/ask', {
        question: text,
        history,
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.answer,
        sources: data.sources,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      pendingSpeak.current = true;
      await speakMessage(data.answer);
      pendingSpeak.current = false;
    } catch {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Lo siento, ocurrió un error al procesar tu pregunta. Intenta de nuevo.',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, speakMessage]);

  const handleClear = useCallback(() => {
    setMessages([
      { id: 'welcome', role: 'assistant', content: WELCOME_TEXT },
    ]);
  }, []);

  return (
    <div className="flex h-[500px] w-[380px] flex-col rounded-xl border bg-background shadow-2xl">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          <span className="text-sm font-semibold">Asistente ThesisReview</span>
        </div>
        <div className="flex items-center gap-1">
          <Button type="button" size="icon" variant="ghost" onClick={handleClear} title="Limpiar conversación" className="h-7 w-7">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <Button type="button" size="icon" variant="ghost" onClick={onClose} title="Cerrar" className="h-7 w-7">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <div className="flex flex-col gap-3">
          {messages.map((msg) => (
            <ChatMessage key={msg.id} role={msg.role} content={msg.content} sources={msg.sources} isSpeaking={isSpeaking && msg.id === messages[messages.length - 1]?.id && msg.role === 'assistant'} />
          ))}
          {!userInteracted && (
            <div className="flex justify-center pt-2">
              <div className="flex items-center gap-2 rounded-full border bg-muted/30 px-4 py-2 text-xs text-muted-foreground animate-pulse">
                <Mic className="h-3 w-3" />
                <span>Haz clic en cualquier parte para comenzar</span>
              </div>
            </div>
          )}
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex max-w-[85%] items-center gap-1.5 rounded-xl rounded-bl-sm border bg-muted/50 px-4 py-2.5 text-sm">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:0.1s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:0.2s]" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <ChatInput onSend={handleSend} isLoading={isLoading} autoListen={autoListening} />
    </div>
  );
}
