import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvitesService } from './invites.service';
import { InvitesController } from './invites.controller';
import { GuestInvitesController } from './guest-invites.controller';
import { InviteEntity } from './entities/invite.entity';
import { EventEntity } from '../events/entities/event.entity';

@Module({
  imports: [TypeOrmModule.forFeature([InviteEntity, EventEntity])],
  controllers: [InvitesController, GuestInvitesController],
  providers: [InvitesService],
  exports: [InvitesService],
})
export class InvitesModule {}
