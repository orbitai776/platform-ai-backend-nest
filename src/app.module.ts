import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { FirebaseModule } from './services/firebase/firebase.module';
import { PublicAuthModule } from './public/auth/publicAuth.module';
import { DatabaseModule } from './services/database/database.module';
import { AiServicesModule } from './admin/ai-services/aiServices.module';
import { JwtModule } from './services/jwt/jwt.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    DatabaseModule,
    FirebaseModule,
    PublicAuthModule,
    JwtModule,
    AiServicesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}