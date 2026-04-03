import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { RedisModule } from './services/redis/redis.module';
import { FirebaseModule } from './services/firebase/firebase.module';
import { PublicAuthModule } from './public/auth/publicAuth.module';
import { JwtModule } from './services/jwt/jwt.module';

import { TokenModule } from './services/token/token.module';
import { UserUsingModule } from './services/userUsing/userUsing.module';
import { ChatModule } from './chat/chat.module';

import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    ConfigModule.forRoot(),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_URI'),
      }),
    }),
    JwtModule,
    RedisModule,
    FirebaseModule,
    PublicAuthModule,

    TokenModule,
    UserUsingModule,
    ChatModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
