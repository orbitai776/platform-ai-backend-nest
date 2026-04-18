import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ServicesOverviewModule } from './admin/dashboard/services-overview/servicesOverview.module';
import { AiServicesModule } from './admin/ai-services/aiServices.module';

import { ChatModule } from './chat/chat.module';
import { DatabaseModule } from './services/database/database.module';
import { FirebaseModule } from './services/firebase/firebase.module';
import { JwtModule } from './services/jwt/jwt.module';
import { PartnerModule } from './partner/partner.module';
import { PublicAuthModule } from './public/auth/publicAuth.module';
import { RedisModule } from './services/redis/redis.module';
import { TokenModule } from './services/token/token.module';
import { UserUsingModule } from './services/userUsing/userUsing.module';

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
    JwtModule,
    RedisModule,
    DatabaseModule,
    FirebaseModule,
    PublicAuthModule,
    TokenModule,
    UserUsingModule,
    ServicesOverviewModule,
    ChatModule,
    AiServicesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
