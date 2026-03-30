import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { RedisModule } from './services/redis/redis.module';
import { FirebaseModule } from './services/firebase/firebase.module';
import { PublicAuthModule } from './public/auth/publicAuth.module';
import { JwtModule } from './services/jwt/jwt.module';

import { TokenModule } from './services/token/token.module';
import { UserUsingModule } from './services/userUsing/userUsing.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    JwtModule,
    RedisModule,
    FirebaseModule,
    PublicAuthModule,

    TokenModule,
    UserUsingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
