import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './services/jwt/jwt.strategy';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { FirebaseModule } from './services/firebase/firebase.module';
import { PublicAuthModule } from './public/auth/publicAuth.module';

import { JwtModule } from './services/jwt/jwt.module';
import { RedisModule } from './services/redis/redis.module';
import { TokenModule } from './services/token/token.module';
import { UserUsingModule } from './services/userUsing/userUsing.module';
import { UserModule } from './services/user/user.module';
import { DatabaseModule } from './services/database/database.module';

import { ChatModule } from './chat/chat.module';
import { PartnerModule } from './partner/partner.module';
import { AiServicesModule } from './admin/ai-services/aiServices.module';
import { ServicesOverviewModule } from './admin/dashboard/services-overview/servicesOverview.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        uri:
          configService.get<string>('MONGO_URI') ||
          configService.get<string>('MONGODB_URI'),
      }),
    }),

    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule,
    RedisModule,
    DatabaseModule,

    FirebaseModule,
    PublicAuthModule,

    // TokenModule,
    // UserUsingModule,
    // FirebaseModule,
    // PublicAuthModule,
    TokenModule,
    UserUsingModule,
    UserModule,
    ServicesOverviewModule,
    ChatModule,
    PartnerModule,
    AiServicesModule,
  ],
  controllers: [AppController],
  providers: [AppService, JwtStrategy],
})
export class AppModule {}