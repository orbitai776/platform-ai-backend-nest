import { Module, NestModule } from '@nestjs/common';
import { PublicAuthController } from './publicAuth.controller';
import { PublicAuthService } from './publicAuth.service';
import { CommonErrorHandlerMiddleware } from '../../common/common-error-handler.middleware';

@Module({
  imports: [
  ],
  controllers: [PublicAuthController],
  providers: [
    PublicAuthService,
    CommonErrorHandlerMiddleware,
  ],
  exports: [PublicAuthService],
})

export class PublicAuthModule implements NestModule {
  configure() {
  }
}
