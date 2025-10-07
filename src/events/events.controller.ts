import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { EventsService } from './events.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/role.enum';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserEntity } from '../users/entities/user.entity';

@Controller('admin/events')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  findAll(@CurrentUser() user: UserEntity) {
    return this.eventsService.findAllByUser(user);
  }

  @Post()
  create(@Body() dto: CreateEventDto, @CurrentUser() user: UserEntity) {
    return this.eventsService.create(dto, user);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateEventDto,
    @CurrentUser() user: UserEntity,
  ) {
    return this.eventsService.update(id, dto, user);
  }
}
