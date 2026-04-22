import { Module } from '@nestjs/common';
import { UsersOverviewController } from './usersOverview.controller';
import { UsersOverviewService } from './usersOverview.service';
import { UsersOverviewRepository } from './usersOverview.repository';
import { InternalJwtGuard } from '../../../guards/internalJwt.guard';
import { RolesGuard } from '../../../services/jwt/roles.guard';

@Module({
  controllers: [UsersOverviewController],
  providers: [
    UsersOverviewService,
    UsersOverviewRepository,
    InternalJwtGuard,
    RolesGuard,
  ],
})
export class UsersOverviewModule {}
