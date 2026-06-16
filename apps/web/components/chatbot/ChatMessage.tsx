'use client';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Volume2 } from 'lucide-react';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  sources?: { title: string; source: string; module: string | null }[];
  isSpeaking?: boolean;
}

export function ChatMessage({ role, content, sources, isSpeaking }: ChatMessageProps) {
  const isUser = role === 'user';
  const sourceLabels: Record<string, string> = {
    architecture: 'Arquitectura',
    code: 'Código',
    thesis: 'Tesis',
    readme: 'README',
    prompt: 'Prompt',
  };

  return (
    <div className={cn('flex w-full gap-3', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'flex max-w-[85%] flex-col gap-1.5 rounded-xl px-4 py-2.5 text-sm',
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-sm'
            : 'bg-muted/50 text-foreground rounded-bl-sm border',
          isSpeaking && 'ring-2 ring-primary ring-offset-2',
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <span className="whitespace-pre-wrap">{content}</span>
          {isSpeaking && (
            <Volume2 className="h-4 w-4 shrink-0 animate-pulse text-primary" />
          )}
        </div>

        {!isUser && sources && sources.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {sources.map((s, i) => (
              <Badge key={i} variant="secondary" className="text-[10px]">
                {sourceLabels[s.source] || s.source}
                {s.module ? `: ${s.module}` : ''}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
