import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CheckinEntity } from './entities/checkin.entity';
import { InviteEntity } from '../invites/entities/invite.entity';
import { CheckinRequestDto } from './dto/checkin-request.dto';
import { CheckinSyncDto } from './dto/checkin-sync.dto';
import { InvitesService } from '../invites/invites.service';
import { RedisService } from '../redis/redis.service';
import { WsGateway } from '../websocket/ws.gateway';

@Injectable()
export class CheckinsService {
  constructor(
    @InjectRepository(CheckinEntity)
    private readonly checkinsRepository: Repository<CheckinEntity>,
    @InjectRepository(InviteEntity)
    private readonly invitesRepository: Repository<InviteEntity>,
    private readonly invitesService: InvitesService,
    private readonly redisService: RedisService,
    private readonly wsGateway: WsGateway,
  ) {}

  private async processSingle(dto: CheckinRequestDto, options?: { offline?: boolean }) {
    const invite = await this.invitesRepository.findOne({
      where: { token: dto.code },
      relations: ['event', 'checkins'],
    });
    if (!invite) {
      throw new NotFoundException('Invite not found');
    }
    const existingCheckin = await this.checkinsRepository.findOne({
      where: { invite: { id: invite.id } },
    });
    const isDuplicate = !!existingCheckin;
    // [CONTRACT-LOCK:CHECKIN_DUPLICATE] NO MODIFICAR SIN MIGRACIÓN
    const checkin = this.checkinsRepository.create({
      invite,
      gate: dto.gate,
      passType: dto.passType,
      isDuplicate,
      offline: options?.offline ?? false,
    });
    await this.checkinsRepository.save(checkin);

    let insideCount: number;
    if (!isDuplicate) {
      await this.invitesService.markCheckedIn(invite.id);
      insideCount = await this.redisService.incrementInsideCount(invite.event.id, 1);
      this.wsGateway.emitInsideCount(invite.event.id, 1, insideCount);
    } else {
      insideCount = await this.redisService.getInsideCount(invite.event.id);
    }

    return {
      token: invite.token,
      duplicate: isDuplicate,
      insideCount,
    };
  }

  async checkin(dto: CheckinRequestDto) {
    return this.processSingle(dto, { offline: false });
  }

  async sync(dto: CheckinSyncDto) {
    const results = [];
    for (const entry of dto.entries) {
      try {
        const result = await this.processSingle(entry, { offline: true });
        results.push(result);
      } catch (error) {
        results.push({ error: error.message, codeTried: entry.code });
      }
    }
    return results;
  }
}
