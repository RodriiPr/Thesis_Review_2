import { IsString, IsOptional, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';

export enum TemplateType {
  THESIS_PROJECT = 'THESIS_PROJECT',
  THESIS = 'THESIS',
  SCIENTIFIC_ARTICLE = 'SCIENTIFIC_ARTICLE',
}

export class GenerateFromTemplateDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value.replace(/'/g, '"'));
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        return [value];
      }
    }
    return Array.isArray(value) ? value : [value];
  })
  authors?: any;

  @IsOptional()
  @IsString()
  advisor?: string;

  @IsOptional()
  @IsString()
  institution?: string;

  @IsOptional()
  @IsString()
  year?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsEnum(TemplateType)
  templateType?: TemplateType;

  @IsOptional()
  file?: any;
}
