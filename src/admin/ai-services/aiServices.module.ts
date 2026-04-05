import { Module } from '@nestjs/common';
import { AiServicesController } from './aiServices.controller';
import { AiServicesService } from './aiServices.service';
import { AiServicesRepository } from './aiServices.repository';
import { InternalJwtGuard } from '../../guards/internalJwt.guard';

@Module({
  controllers: [AiServicesController],
  providers: [
    AiServicesService,
    AiServicesRepository,
    InternalJwtGuard,
  ],
})
export class AiServicesModule {}