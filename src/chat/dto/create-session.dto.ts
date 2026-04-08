import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateSessionDto {
  @IsUUID()
  partner_service_id?: string;

  @IsOptional()
  @IsString()
  guest_session_id?: string;
}