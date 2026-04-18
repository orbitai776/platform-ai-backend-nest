import { Controller, Get, UseGuards } from '@nestjs/common';
import { Roles } from '../../../common/decorators/roles.decorator';
import { InternalJwtGuard } from '../../../guards/internalJwt.guard';
import { RolesGuard } from '../../../guards/roles.guard';
import { ServicesOverviewService } from './servicesOverview.service';

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
