'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChatbotPanel } from './ChatbotPanel';
import { Button } from '@/components/ui/button';
import { MessageSquare, X } from 'lucide-react';

export function ChatbotButton() {
  const [isOpen, setIsOpen] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const toggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  if (!isMounted) return null;

  return (
    <>
      {isOpen && (
        <div className="fixed bottom-20 right-4 z-50 animate-in slide-in-from-bottom-2 fade-in duration-200">
          <ChatbotPanel onClose={close} />
        </div>
      )}

      <Button
        type="button"
        onClick={toggle}
        size="icon"
        className="fixed bottom-4 right-4 z-50 h-12 w-12 rounded-full shadow-lg"
        title={isOpen ? 'Cerrar chat' : 'Abrir chat'}
      >
        {isOpen ? <X className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
      </Button>
    </>
  );
}
