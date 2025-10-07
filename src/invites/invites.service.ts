import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InviteEntity } from './entities/invite.entity';
import { CreateInviteDto } from './dto/create-invite.dto';
import { BatchCreateInvitesDto } from './dto/batch-create-invites.dto';
import { UserEntity } from '../users/entities/user.entity';
import { InviteStatus } from './entities/invite-status.enum';
import { EventEntity } from '../events/entities/event.entity';

@Injectable()
export class InvitesService {
  constructor(
    @InjectRepository(InviteEntity)
    private readonly invitesRepository: Repository<InviteEntity>,
    @InjectRepository(EventEntity)
    private readonly eventsRepository: Repository<EventEntity>,
  ) {}

  private async validateOwnership(eventId: string, user: UserEntity) {
    const event = await this.eventsRepository.findOne({
      where: { id: eventId },
      relations: ['createdBy'],
    });
    if (!event) {
      throw new NotFoundException('Event not found');
    }
    if (event.createdBy.id !== user.id) {
      throw new UnauthorizedException('You cannot create invites for this event');
    }
    return event;
  }

  async listEventInvites(eventId: string, user: UserEntity) {
    await this.validateOwnership(eventId, user);
    return this.invitesRepository.find({
      where: { event: { id: eventId } },
      relations: ['event'],
      order: { createdAt: 'DESC' },
    });
  }

  async createInvite(eventId: string, dto: CreateInviteDto, user: UserEntity) {
    const event = await this.validateOwnership(eventId, user);
    const token = InviteEntity.generateToken();
    const invite = this.invitesRepository.create({
      token,
      recipientEmail: dto.recipientEmail,
      notes: dto.notes,
      event,
      createdBy: user,
      status: InviteStatus.PENDING,
    });
    return this.invitesRepository.save(invite);
  }

  async createBatch(eventId: string, dto: BatchCreateInvitesDto, user: UserEntity) {
    const event = await this.validateOwnership(eventId, user);
    const invites = dto.invites.map((inviteDto) =>
      this.invitesRepository.create({
        token: InviteEntity.generateToken(),
        recipientEmail: inviteDto.recipientEmail,
        notes: inviteDto.notes,
        createdBy: user,
        event,
        status: InviteStatus.PENDING,
      }),
    );
    return this.invitesRepository.save(invites);
  }

  async getInviteForGuest(token: string) {
    const invite = await this.invitesRepository.findOne({
      where: { token },
      relations: ['event'],
    });
    if (!invite) {
      throw new NotFoundException('Invite not found');
    }
    return {
      token: invite.token,
      status: invite.status,
      event: {
        id: invite.event.id,
        title: invite.event.title,
        description: invite.event.description,
        startAt: invite.event.startAt,
        endAt: invite.event.endAt,
      },
      recipientEmail: invite.recipientEmail,
      notes: invite.notes,
    };
  }

  async markCheckedIn(inviteId: string) {
    await this.invitesRepository.update(inviteId, { status: InviteStatus.CHECKED_IN });
  }
}
