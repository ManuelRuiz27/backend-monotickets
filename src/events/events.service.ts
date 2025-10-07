import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEntity } from './entities/event.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { UserEntity } from '../users/entities/user.entity';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(EventEntity)
    private readonly eventsRepository: Repository<EventEntity>,
  ) {}

  async create(dto: CreateEventDto, user: UserEntity) {
    const event = this.eventsRepository.create({
      title: dto.title,
      description: dto.description,
      startAt: dto.startAt ? new Date(dto.startAt) : undefined,
      endAt: dto.endAt ? new Date(dto.endAt) : undefined,
      capacity: dto.capacity ?? 0,
      createdBy: user,
    });
    return this.eventsRepository.save(event);
  }

  findAllByUser(user: UserEntity) {
    return this.eventsRepository.find({
      where: { createdBy: { id: user.id } },
      relations: ['createdBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async update(id: string, dto: UpdateEventDto, user: UserEntity) {
    const event = await this.eventsRepository.findOne({
      where: { id, createdBy: { id: user.id } },
      relations: ['createdBy'],
    });
    if (!event) {
      throw new NotFoundException('Event not found');
    }
    if (dto.title !== undefined) {
      event.title = dto.title;
    }
    if (dto.description !== undefined) {
      event.description = dto.description;
    }
    if (dto.startAt !== undefined) {
      event.startAt = dto.startAt ? new Date(dto.startAt) : undefined;
    }
    if (dto.endAt !== undefined) {
      event.endAt = dto.endAt ? new Date(dto.endAt) : undefined;
    }
    if (dto.capacity !== undefined) {
      event.capacity = dto.capacity;
    }
    return this.eventsRepository.save(event);
  }
}
