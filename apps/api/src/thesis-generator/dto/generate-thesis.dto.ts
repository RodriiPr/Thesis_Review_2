import { IsString, IsArray, IsOptional, IsInt, Min, Max, ArrayMinSize, IsEnum, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { DocumentSchemaType } from '../../prisma';

export const THESIS_CHAPTERS = [
  'introduction',
  'methods',
  'results',
  'discussion',
  'conclusions',
  'bibliography',
  'annexes',
] as const;

export type ThesisChapter = (typeof THESIS_CHAPTERS)[number];

export class GenerateThesisDto {
  @IsString()
  title: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  authors: string[];

  @IsString()
  advisor: string;

  @IsString()
  lineOfResearch: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsInt()
  @Min(2020)
  @Max(2030)
  @Type(() => Number)
  year: number;

  @IsEnum(DocumentSchemaType)
  documentType: DocumentSchemaType;

  @IsOptional()
  @IsString()
  schemaId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  outputFormats?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsIn(THESIS_CHAPTERS as unknown as string[], { each: true })
  chapters?: ThesisChapter[];
}
