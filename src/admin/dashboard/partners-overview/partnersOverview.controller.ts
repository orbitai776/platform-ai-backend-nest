import { Controller, Get, UseGuards } from '@nestjs/common';
import { PartnersOverviewService } from './partnersOverview.service';
import { InternalJwtGuard } from '../../../guards/internalJwt.guard';
import { Roles } from '../../../services/jwt/roles.decorator';
import { RolesGuard } from '../../../services/jwt/roles.guard';

@Controller('v1/admin/dashboard/partners')
@UseGuards(InternalJwtGuard, RolesGuard)
@Roles('admin')
export class PartnersOverviewController {
  constructor(
    private readonly partnersOverviewService: PartnersOverviewService,
  ) {}

  @Get()
  async getPartnersOverview() {
    return await this.partnersOverviewService.getOverview();
  }
}
