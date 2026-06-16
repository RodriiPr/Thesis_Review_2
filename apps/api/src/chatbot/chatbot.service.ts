import { Injectable } from '@nestjs/common';
import { QAPipeline } from '@thesis-review/ai-engine';
import { PrismaService } from '../prisma/prisma.service';
import { ChatResponseDto, ChatSourceDto } from './dto/chat-response.dto';

@Injectable()
export class ChatbotService {
  private readonly pipeline: QAPipeline;

  constructor(private prisma: PrismaService) {
    this.pipeline = new QAPipeline({
      temperature: Number(process.env.CHATBOT_TEMPERATURE ?? 0.3),
      maxTokens: Number(process.env.CHATBOT_MAX_TOKENS ?? 1024),
    });
  }

  async ask(
    question: string,
    history?: { role: 'user' | 'assistant'; content: string }[],
  ): Promise<ChatResponseDto> {
    const contextDocuments = await this.searchKnowledgeBase(question);

    const result = await this.pipeline.ask(question, contextDocuments, history);

    const sources: ChatSourceDto[] = result.sources.map((s) => ({
      title: s.title,
      source: s.source,
      module: s.module,
      excerpt: s.excerpt,
    }));

    return { answer: result.answer, sources };
  }

  private async searchKnowledgeBase(
    question: string,
  ): Promise<{ title: string; content: string; source: string; module: string | null }[]> {
    try {
      const keywords = question
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 3);

      if (keywords.length === 0) return [];

      const whereConditions = keywords.map((kw) => ({
        OR: [
          { title: { contains: kw, mode: 'insensitive' as const } },
          { content: { contains: kw, mode: 'insensitive' as const } },
          { module: { contains: kw, mode: 'insensitive' as const } },
        ],
      }));

      const docs = await this.prisma.projectDocumentation.findMany({
        where: { OR: whereConditions },
        select: { title: true, content: true, source: true, module: true },
        take: 5,
        orderBy: { createdAt: 'desc' },
      });

      return docs.map((d) => ({
        title: d.title,
        content: d.content.substring(0, 2000),
        source: d.source,
        module: d.module,
      }));
    } catch {
      return [];
    }
  }
}
