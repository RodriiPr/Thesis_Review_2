import { IsString, IsOptional, IsArray } from 'class-validator';

export class AskQuestionDto {
  @IsString()
  question: string;

  @IsOptional()
  @IsArray()
  history?: { role: 'user' | 'assistant'; content: string }[];
}
