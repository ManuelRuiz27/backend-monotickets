import { IsOptional, IsString, MinLength } from 'class-validator';

export class CheckinRequestDto {
  @IsString()
  @MinLength(4)
  code: string;

  @IsString()
  @MinLength(1)
  gate: string;

  @IsOptional()
  @IsString()
  passType?: string;
}
