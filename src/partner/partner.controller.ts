import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { PartnerService } from './partner.service';
import { JwtService } from '../services/jwt/jwt.service';
import { JwtAuthGuard } from '../services/jwt/jwt-auth.guard';
import { RolesGuard } from '../services/jwt/roles.guard';
import { Roles } from '../services/jwt/roles.decorator';


@Controller('v1/partner')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PartnerController {
  constructor(
    private readonly partnerService: PartnerService,
    private readonly jwtService: JwtService,
  ) { }

  private extractUserId(req: Request): string | null {
    const fromUser = (req as any)?.user?.uid || (req as any)?.user?.id;
    const fromHeader = req.headers['x-user-id'];
    const authHeader = req.headers.authorization;

    if (typeof fromUser === 'string' && fromUser.trim().length > 0) return fromUser;
    if (typeof fromHeader === 'string' && fromHeader.trim().length > 0) return fromHeader;

    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      if (token) {
        try {
          const payload = this.jwtService.verify(token);
          if (payload?.uid) return payload.uid;
        } catch { return null; }
      }
    }
    return null;
  }

  // --- Setup Organization ---
  @Roles('partner')
  @Post('organization')
  async createProfile(@Req() req: Request, @Body() body: any) {
    const userId = this.extractUserId(req);
    return this.partnerService.createProfile(userId, body);
  }
  
  @Roles('partner')
  @Get('organization')
  async getProfile(@Req() req: Request) {
    const userId = this.extractUserId(req);
    return this.partnerService.getProfile(userId);
  }

  @Roles('partner')
  @Patch('organization')
  async updateProfile(@Req() req: Request, @Body() body: any) {
    const userId = this.extractUserId(req);
    return this.partnerService.updateProfile(userId, body);
  }

  // --- AI Data Services ---
  @Roles('partner')
  @Post('ai-services')
  async setupAIService(@Req() req: Request, @Body() body: any) {
    const userId = this.extractUserId(req);
    return this.partnerService.setupAIService(userId, body);
  }

  @Roles('partner')
  @Get('ai-services-all')
  async listAIServicesAll(@Req() req: Request, @Query('status') status?: string) {
    return this.partnerService.listAIServicesAll(status);
  }

  @Roles('partner')
  @Get('ai-services')
  async listAIServices(@Req() req: Request, @Query('status') status?: string) {
    const userId = this.extractUserId(req);
    return this.partnerService.listAIServices(userId, status);
  }

  @Roles('partner')
  @Get('ai-services/:id')
  async getAIService(@Param('id') id: string, @Req() req: Request) {
    const userId = this.extractUserId(req); //
    return this.partnerService.getAIService(userId, id);
  }

  @Roles('partner')
  @Patch('ai-services/:id')
  async updateAIService(@Param('id') id: string, @Req() req: Request, @Body() body: any) {
    const userId = this.extractUserId(req);
    return this.partnerService.updateAIService(userId, id, body);
  }

  @Roles('partner')
  @Delete('ai-services/:id')
  async disableService(@Param('id') id: string) {
    return this.partnerService.disableAIService(id);
  }

}