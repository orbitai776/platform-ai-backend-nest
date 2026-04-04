import { Controller, Get, UseGuards } from '@nestjs/common';
import { ServicesOverviewService } from './servicesOverview.service';
import { InternalJwtGuard } from '../../../guards/internalJwt.guard';

@Controller('v1/admin/dashboard')
@UseGuards(InternalJwtGuard)
export class ServicesOverviewController {
  constructor(
    private readonly servicesOverviewService: ServicesOverviewService,
  ) {}

  @Get('services')
  async getServicesOverview() {
    return await this.servicesOverviewService.getOverview();
  }
}