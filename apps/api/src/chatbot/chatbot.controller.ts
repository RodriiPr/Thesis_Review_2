import { Controller, Post, Body } from '@nestjs/common';
import { ChatbotService } from './chatbot.service';
import { AskQuestionDto } from './dto/ask-question.dto';
import { ChatResponseDto } from './dto/chat-response.dto';

@Controller('chatbot')
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @Post('ask')
  async ask(@Body() dto: AskQuestionDto): Promise<ChatResponseDto> {
    return this.chatbotService.ask(dto.question, dto.history);
  }
}
