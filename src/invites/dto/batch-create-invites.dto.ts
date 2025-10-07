import { ArrayNotEmpty, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateInviteDto } from './create-invite.dto';

export class BatchCreateInvitesDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateInviteDto)
  invites: CreateInviteDto[];
}
