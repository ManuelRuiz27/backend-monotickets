import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventsService } from './events.service';
import { EventEntity } from './entities/event.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

const mockRepository = () => ({
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
});

describe('EventsService', () => {
  let service: EventsService;
  let repository: jest.Mocked<Repository<EventEntity>>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        EventsService,
        {
          provide: getRepositoryToken(EventEntity),
          useFactory: mockRepository,
        },
      ],
    }).compile();

    service = module.get(EventsService);
    repository = module.get(getRepositoryToken(EventEntity));
  });

  it('creates an event', async () => {
    const dto: CreateEventDto = { title: 'Launch', capacity: 100 };
    const user: any = { id: 'admin-1' };
    const event = { id: 'evt-1', ...dto, createdBy: user } as EventEntity;
    repository.create.mockReturnValue(event);
    repository.save.mockResolvedValue(event);

    const result = await service.create(dto, user);

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Launch', capacity: 100, createdBy: user }),
    );
    expect(result).toBe(event);
  });

  it('lists events for user', async () => {
    const user: any = { id: 'admin-1' };
    const events = [{ id: 'evt-1' }] as any;
    repository.find.mockResolvedValue(events);

    const result = await service.findAllByUser(user);

    expect(repository.find).toHaveBeenCalledWith(
      expect.objectContaining({ where: { createdBy: { id: 'admin-1' } } }),
    );
    expect(result).toBe(events);
  });

  it('updates an event', async () => {
    const user: any = { id: 'admin-1' };
    const event = { id: 'evt-1', title: 'Old', createdBy: user } as any;
    repository.findOne.mockResolvedValue(event);
    repository.save.mockResolvedValue({ ...event, title: 'New' });

    const dto: UpdateEventDto = { title: 'New' };
    const result = await service.update('evt-1', dto, user);

    expect(result.title).toBe('New');
  });

  it('throws when event missing on update', async () => {
    const user: any = { id: 'admin-1' };
    repository.findOne.mockResolvedValue(null);

    await expect(service.update('missing', {}, user)).rejects.toBeInstanceOf(NotFoundException);
  });
});
