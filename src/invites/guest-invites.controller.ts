import { Controller, Get, Param } from '@nestjs/common';
import { InvitesService } from './invites.service';
import { Public } from '../common/decorators/public.decorator';

@Controller('guest/invite')
export class GuestInvitesController {
  constructor(private readonly invitesService: InvitesService) {}

  @Get(':token')
  @Public()
  findByToken(@Param('token') token: string) {
    return this.invitesService.getInviteForGuest(token);
  }
}
