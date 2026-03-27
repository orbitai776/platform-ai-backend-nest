import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { RedisModule } from './services/redis/redis.module';
import { FirebaseModule } from './services/firebase/firebase.module';
import { PublicAuthModule } from './public/auth/publicAuth.module';
import { TokenModule } from './public/token/token.module';
import { JwtModule } from './services/jwt/jwt.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    JwtModule,
    TokenModule,
    RedisModule,
    FirebaseModule,
    PublicAuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
