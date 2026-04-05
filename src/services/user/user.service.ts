// token.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly prisma: PrismaService
  ) {}

  async checkAndCreateUser(data: any) {

    const {
      user_id,
      name,
      email,
      picture,
    } = data;

    // Check existing user
    const existing = await this.prisma.users.findFirst({ where: { firebase_uid: user_id } });
    if (existing) {
        return {
          status: 'success', 
          data: existing
        }
    }

    const user = await this.prisma.users.create({
      data: {
        id: uuidv4(),
        firebase_uid: user_id,
        full_name: name,
        email: email,
        avatar_url: picture,
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    return { status: 'success', data: user };
  }
}