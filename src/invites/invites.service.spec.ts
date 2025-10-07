import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InvitesService } from './invites.service';
import { InviteEntity } from './entities/invite.entity';
import { EventEntity } from '../events/entities/event.entity';

const mockRepository = () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  find: jest.fn(),
});

describe('InvitesService', () => {
  let service: InvitesService;
  let invitesRepository: jest.Mocked<Repository<InviteEntity>>;
  let eventsRepository: jest.Mocked<Repository<EventEntity>>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        InvitesService,
        {
          provide: getRepositoryToken(InviteEntity),
          useFactory: mockRepository,
        },
        {
          provide: getRepositoryToken(EventEntity),
          useFactory: mockRepository,
        },
      ],
    }).compile();

    service = module.get(InvitesService);
    invitesRepository = module.get(getRepositoryToken(InviteEntity));
    eventsRepository = module.get(getRepositoryToken(EventEntity));
  });

  it('creates an invite with uuid token', async () => {
    const event = { id: 'event-1', createdBy: { id: 'admin-1' } } as any;
    eventsRepository.findOne.mockResolvedValue(event);
    invitesRepository.create.mockImplementation((payload) => payload as any);
    invitesRepository.save.mockImplementation(async (payload) => payload as any);

    const result = await service.createInvite('event-1', {}, { id: 'admin-1' } as any);

    expect(result.token).toMatch(
      /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}/,
    );
    expect(result.event).toBe(event);
  });

  it('prevents creating invites for foreign events', async () => {
    const event = { id: 'event-1', createdBy: { id: 'other-admin' } } as any;
    eventsRepository.findOne.mockResolvedValue(event);

    await expect(
      service.createInvite('event-1', {}, { id: 'admin-1' } as any),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('throws when invite token missing for guests', async () => {
    invitesRepository.findOne.mockResolvedValue(null);
    await expect(service.getInviteForGuest('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns guest invite info', async () => {
    const event = { id: 'event-1', title: 'Party', description: 'Fun' } as any;
    invitesRepository.findOne.mockResolvedValue({
      token: 'token-123',
      status: 'PENDING',
      event,
      recipientEmail: 'guest@example.com',
      notes: 'VIP',
    } as any);

    const result = await service.getInviteForGuest('token-123');

    expect(result).toMatchObject({
      token: 'token-123',
      event: expect.objectContaining({ title: 'Party' }),
      recipientEmail: 'guest@example.com',
      notes: 'VIP',
    });
  });
});
