import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CheckinsService } from './checkins.service';
import { CheckinsController } from './checkins.controller';
import { CheckinEntity } from './entities/checkin.entity';
import { InviteEntity } from '../invites/entities/invite.entity';
import { InvitesModule } from '../invites/invites.module';
import { RedisModule } from '../redis/redis.module';
import { WsModule } from '../websocket/ws.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CheckinEntity, InviteEntity]),
    InvitesModule,
    RedisModule,
    WsModule,
  ],
  controllers: [CheckinsController],
  providers: [CheckinsService],
  exports: [CheckinsService],
})
export class CheckinsModule {}
