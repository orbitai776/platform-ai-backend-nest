import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './services/jwt/jwt.strategy';
import * as dns from 'node:dns';
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
import { UserModule } from './services/user/user.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const dnsServers = configService.get<string>('DNS_SERVERS');

        if (dnsServers) {
          const servers = dnsServers
            .split(',')
            .map((server) => server.trim())
            .filter(Boolean);

          if (servers.length > 0) {
            dns.setServers(servers);
          }
        }

        return {
          uri:
            configService.get<string>('MONGO_URI') ||
            configService.get<string>('MONGODB_URI'),
        };
      },
    }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule,
    RedisModule,
    DatabaseModule,
    FirebaseModule,
    PublicAuthModule,
    TokenModule,
    UserUsingModule,
    UserModule,
    ServicesOverviewModule,
    ChatModule,
    AiServicesModule,
    PartnerModule,
  ],
  controllers: [AppController],
  providers: [AppService, JwtStrategy],
})
export class AppModule {}
