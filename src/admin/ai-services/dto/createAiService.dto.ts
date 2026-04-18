import { IsIn, IsObject, IsOptional, IsString, Length } from 'class-validator';

export class CreateAiServiceDto {
  @IsString()
  @Length(2, 255)
  name!: string;

  @IsString()
  @Length(2, 50)
  type!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  defaultConfig?: Record<string, any>;

  @IsOptional()
  @IsIn(['active', 'paused', 'disabled'])
  status?: string;
}