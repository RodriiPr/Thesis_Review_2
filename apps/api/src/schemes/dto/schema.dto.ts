import { IsString, IsEnum, IsOptional, IsBoolean, IsObject } from 'class-validator';
import { DocumentSchemaType } from '../../prisma';

export class CreateSchemaDto {
  @IsString()
  name: string;

  @IsEnum(DocumentSchemaType)
  type: DocumentSchemaType;

  @IsString()
  @IsOptional()
  description?: string;

  @IsObject()
  @IsOptional()
  structure?: any;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}

export class UpdateSchemaDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(DocumentSchemaType)
  @IsOptional()
  type?: DocumentSchemaType;

  @IsString()
  @IsOptional()
  description?: string;

  @IsObject()
  @IsOptional()
  structure?: any;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
