import { Module } from '@nestjs/common';
import { PartnersOverviewController } from './partnersOverview.controller';
import { PartnersOverviewService } from './partnersOverview.service';
import { PartnersOverviewRepository } from './partnersOverview.repository';
import { InternalJwtGuard } from '../../../guards/internalJwt.guard';
import { RolesGuard } from '../../../services/jwt/roles.guard';

@Module({
  controllers: [PartnersOverviewController],
  providers: [
    PartnersOverviewService,
    PartnersOverviewRepository,
    InternalJwtGuard,
    RolesGuard,
  ],
})
export class PartnersOverviewModule {}
