import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { InvitesService } from './invites.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/role.enum';
import { CreateInviteDto } from './dto/create-invite.dto';
import { BatchCreateInvitesDto } from './dto/batch-create-invites.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserEntity } from '../users/entities/user.entity';

@Controller('admin/events/:eventId/invites')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
export class InvitesController {
  constructor(private readonly invitesService: InvitesService) {}

  @Get()
  list(@Param('eventId') eventId: string, @CurrentUser() user: UserEntity) {
    return this.invitesService.listEventInvites(eventId, user);
  }

  @Post()
  create(
    @Param('eventId') eventId: string,
    @Body() dto: CreateInviteDto,
    @CurrentUser() user: UserEntity,
  ) {
    return this.invitesService.createInvite(eventId, dto, user);
  }

  @Post('batch')
  createBatch(
    @Param('eventId') eventId: string,
    @Body() dto: BatchCreateInvitesDto,
    @CurrentUser() user: UserEntity,
  ) {
    return this.invitesService.createBatch(eventId, dto, user);
  }
}
