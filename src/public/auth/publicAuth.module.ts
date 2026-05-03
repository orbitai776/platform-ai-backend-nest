import { Module, NestModule } from '@nestjs/common';
import { PublicAuthController } from './publicAuth.controller';
import { PublicAuthService } from './publicAuth.service';
import { CommonErrorHandlerMiddleware } from '../../common/common-error-handler.middleware';
import { JwtModule } from '../../services/jwt/jwt.module';

import { TokenModule } from '../../services/token/token.module';
import { UserUsingModule } from '../../services/userUsing/userUsing.module';
import { UserModule } from '../../services/user/user.module';
import { RedisModule } from '../../services/redis/redis.module';

@Module({
  imports: [
    TokenModule,
    UserUsingModule,
    UserModule,
    JwtModule,
    RedisModule,
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
