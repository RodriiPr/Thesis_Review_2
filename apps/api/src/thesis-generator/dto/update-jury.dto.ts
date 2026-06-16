import { IsOptional, IsString } from 'class-validator';

export class UpdateJuryDto {
  @IsOptional()
  @IsString()
  presidente?: string;

  @IsOptional()
  @IsString()
  secretario?: string;

  @IsOptional()
  @IsString()
  vocal?: string;

  @IsOptional()
  @IsString()
  suplente?: string;
}
