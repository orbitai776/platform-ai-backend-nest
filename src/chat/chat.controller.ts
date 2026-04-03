import { Controller, Get, Post, Body, Param, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ChatService } from './chat.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { JwtService } from '../services/jwt/jwt.service';

// Prefix tổng cho mọi API trong controller này là /api/chat/conversations
@Controller('api/chat/conversations')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
  ) { }

  private extractUserId(req: Request): string | null {
    const fromUser = (req as any)?.user?.uid || (req as any)?.user?.id;
    const fromHeader = req.headers['x-user-id'];
    const authHeader = req.headers.authorization;

    if (typeof fromUser === 'string' && fromUser.trim().length > 0) {
      return fromUser;
    }

    if (typeof fromHeader === 'string' && fromHeader.trim().length > 0) {
      return fromHeader;
    }

    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      if (token) {
        try {
          const payload = this.jwtService.verify(token);
          if (payload?.uid) {
            return payload.uid;
          }
        } catch {
          return null;
        }
      }
    }

    return null;
  }

  // 1. POST /api/chat/conversations
  @Post()
  async createSession(
    @Body() createSessionDto: CreateSessionDto,
    @Req() req: Request,
  ) {
    const userId = this.extractUserId(req);
    return this.chatService.createSession(createSessionDto, userId);
  }

  // 2. GET /api/chat/conversations
  @Get()
  async getUserSessions(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Req() req: Request,
  ) {
    const userId = this.extractUserId(req);
    return this.chatService.getUserSessions(
      userId,
      Number(page) || 1,
      Number(limit) || 20,
    );
  }

  // 3. GET /api/chat/conversations/:conversation_id/messages
  @Get(':conversation_id/messages')
  async getMessages(@Param('conversation_id') conversationId: string) {
    return this.chatService.getMessages(conversationId);
  }

  // 4. POST /api/chat/conversations/:conversation_id/messages
  @Post(':conversation_id/messages')
  async sendMessage(
    @Param('conversation_id') conversationId: string,
    @Body() sendMessageDto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(conversationId, sendMessageDto.content);
  }
}