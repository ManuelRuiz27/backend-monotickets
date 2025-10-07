import { IsEmail, IsOptional, IsString } from 'class-validator';

export class CreateInviteDto {
  @IsOptional()
  @IsEmail()
  recipientEmail?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
