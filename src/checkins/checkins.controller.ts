import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { CheckinsService } from './checkins.service';
import { CheckinRequestDto } from './dto/checkin-request.dto';
import { CheckinSyncDto } from './dto/checkin-sync.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/role.enum';

@Controller('staff/checkin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STAFF, UserRole.ADMIN, UserRole.SUPERADMIN)
export class CheckinsController {
  constructor(private readonly checkinsService: CheckinsService) {}

  @Post()
  create(@Body() dto: CheckinRequestDto) {
    return this.checkinsService.checkin(dto);
  }

  @Post('sync')
  sync(@Body() dto: CheckinSyncDto) {
    return this.checkinsService.sync(dto);
  }
}
