import { Module, NestModule } from '@nestjs/common';
import { PublicAuthController } from './publicAuth.controller';
import { PublicAuthService } from './publicAuth.service';
import { CommonErrorHandlerMiddleware } from '../../common/common-error-handler.middleware';
import { TokenModule } from '../token/token.module';
import { JwtModule } from '../../services/jwt/jwt.module';

@Module({
  imports: [
    TokenModule,
    JwtModule,
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
