import { Controller, Get, UseGuards } from '@nestjs/common';
import { UsersOverviewService } from './usersOverview.service';
import { InternalJwtGuard } from '../../../guards/internalJwt.guard';
import { Roles } from '../../../services/jwt/roles.decorator';
import { RolesGuard } from '../../../services/jwt/roles.guard';

@Controller('v1/admin/dashboard/users')
@UseGuards(InternalJwtGuard, RolesGuard)
@Roles('admin')
export class UsersOverviewController {
  constructor(private readonly usersOverviewService: UsersOverviewService) {}

  @Get()
  async getUsersOverview() {
    return await this.usersOverviewService.getOverview();
  }
}
