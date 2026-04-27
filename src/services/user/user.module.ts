// token/token.module.ts
import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserService } from './user.service';

@Module({
  imports: [],
  providers: [UserService, PrismaService],
  exports: [UserService],
})
export class UserModule {}