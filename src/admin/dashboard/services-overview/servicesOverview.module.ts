import { Module } from '@nestjs/common';
import { ServicesOverviewController } from './servicesOverview.controller';
import { ServicesOverviewService } from './servicesOverview.service';
import { ServicesOverviewRepository } from './servicesOverview.repository';
import { InternalJwtGuard } from '../../../guards/internalJwt.guard';

@Module({
  controllers: [ServicesOverviewController],
  providers: [
    ServicesOverviewService,
    ServicesOverviewRepository,
    InternalJwtGuard,
  ],
})
export class ServicesOverviewModule {}