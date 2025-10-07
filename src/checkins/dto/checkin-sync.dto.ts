import { ArrayNotEmpty, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CheckinRequestDto } from './checkin-request.dto';

export class CheckinSyncDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CheckinRequestDto)
  entries: CheckinRequestDto[];
}
