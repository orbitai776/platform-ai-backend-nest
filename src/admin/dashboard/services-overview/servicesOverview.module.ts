import { Module } from '@nestjs/common';
import { ServicesOverviewController } from './servicesOverview.controller';
import { ServicesOverviewService } from './servicesOverview.service';
import { ServicesOverviewRepository } from './servicesOverview.repository';
import { InternalJwtGuard } from '../../../guards/internalJwt.guard';
import { RolesGuard } from '../../../services/jwt/roles.guard';

@Module({
  controllers: [ServicesOverviewController],
  providers: [
    ServicesOverviewService,
    ServicesOverviewRepository,
    InternalJwtGuard,
    RolesGuard,
  ],
})
export class ServicesOverviewModule {}