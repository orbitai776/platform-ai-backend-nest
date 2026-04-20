import { Controller, Get, UseGuards } from '@nestjs/common';
import { ServicesOverviewService } from './servicesOverview.service';
import { InternalJwtGuard } from '../../../guards/internalJwt.guard';
import { Roles } from '../../../services/jwt/roles.decorator';
import { RolesGuard } from '../../../services/jwt/roles.guard';

@Controller('v1/admin/dashboard')
@UseGuards(InternalJwtGuard, RolesGuard)
@Roles('admin')
export class ServicesOverviewController {
  constructor(
    private readonly servicesOverviewService: ServicesOverviewService,
  ) {}

  @Get('services')
  async getServicesOverview() {
    return await this.servicesOverviewService.getOverview();
  }
}