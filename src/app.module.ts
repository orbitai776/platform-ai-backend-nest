import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { FirebaseModule } from './services/firebase/firebase.module';
import { PublicAuthModule } from './public/auth/publicAuth.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    FirebaseModule,
    PublicAuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
