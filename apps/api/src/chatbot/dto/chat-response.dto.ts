export class ChatSourceDto {
  title: string;
  source: string;
  module: string | null;
  excerpt: string;
}

export class ChatResponseDto {
  answer: string;
  sources: ChatSourceDto[];
}
