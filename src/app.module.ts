import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { FirebaseModule } from './services/firebase/firebase.module';
import { PublicAuthModule } from './public/auth/publicAuth.module';

import { JwtModule } from './services/jwt/jwt.module';
import { RedisModule } from './services/redis/redis.module';
import { TokenModule } from './services/token/token.module';
import { UserUsingModule } from './services/userUsing/userUsing.module';
import { DatabaseModule } from './services/database/database.module';

import { ServicesOverviewModule } from './admin/dashboard/services-overview/servicesOverview.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    JwtModule,
    RedisModule,
    DatabaseModule,
    // FirebaseModule,
    // PublicAuthModule,
    TokenModule,
    UserUsingModule,
    ServicesOverviewModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}