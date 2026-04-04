import { Module } from '@nestjs/common';
import { PartnerController } from './partner.controller';
import { PartnerService } from './partner.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtModule } from '../services/jwt/jwt.module'; 

@Module({
  imports: [
    JwtModule,  
  ],
  controllers: [PartnerController],
  providers: [PartnerService,PrismaService],
  exports: [PartnerService], 
})
export class PartnerModule {}