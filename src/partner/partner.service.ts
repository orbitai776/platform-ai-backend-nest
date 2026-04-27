import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PartnerService {
  constructor(private prisma: PrismaService) { }

  private isUuid(value: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  }

  // --- Setup Organization ---
  async createProfile(userId: string | null, data: any) {
    if (!userId) throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);

    // Check xem user này đã có partner chưa
    const existing = await this.prisma.partners.findFirst({ where: { owner_user_id: userId } });
    if (existing) throw new HttpException('Tài khoản đã thiết lập tổ chức', HttpStatus.CONFLICT);

    const partner = await this.prisma.partners.create({
      data: {
        id: uuidv4(),
        owner_user_id: userId,
        name: data.name,
        description: data.description,
        email: data.email,
        phone: data.phone,
        address: data.address,
        status: 'pending', // Mặc định là pending khi tạo mới nà
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    return { status: 'success', data: partner };
  }

  //Lấy thông tin doanh nghiệp
  async getProfile(userId: string | null) {
    if (!userId) throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);

    let partner: any;
    
    try {
      console.log('Fetching partner profile for userId:', userId);
      partner = await this.prisma.partners.findFirst({
        where: { owner_user_id: userId },
      });
    } catch (error) {
      console.error('Error fetching partner profile:', error);
    }

    if (!partner) throw new HttpException('Chưa thiết lập tổ chức', HttpStatus.NOT_FOUND);
    return { status: 'success', data: partner };
  }

  // Cập nhật thông tin doanh nghiệp
  async updateProfile(userId: string | null, data: any) {
    const profile = await this.getProfile(userId);
    const updated = await this.prisma.partners.update({
      where: { id: profile.data.id },
      data: {
        name: data.name,
        phone: data.phone,
        address: data.address,
        email: data.email,
        description: data.description,
        status: data.status,
        updated_at: new Date(),
      },
    });
    return { status: 'success', data: updated };
  }

  // --- AI Data Services ---

  async listAIServicesAll(statusQuery?: string) {
    const filterStatus = statusQuery ? statusQuery.split(',') : ['active', 'pause'];

    const services = await this.prisma.services.findMany({
      where: {
        status: { in: filterStatus, not: 'disable' }, 
      },
    });
    if (services.length === 0) {
      throw new HttpException('Không có dịch vụ AI nào', HttpStatus.NOT_FOUND);
    }

    return { status: 'success', data: services };
  }

  // Gán dịch vụ AI cho đối tác
  async setupAIService(userId: string | null, data: any) {
    const profile = await this.getProfile(userId);
    
    const existingService = await this.prisma.partner_services.findFirst({
      where: {
        partner_id: profile.data.id,
        service_id: data.service_id,
      },
    });
    if (existingService) {
      if (existingService.status === 'disable') {
        const reactivated = await this.prisma.partner_services.update({
          where: { id: existingService.id },
          data: { 
            name: data.name || existingService.name,
            token_limit: data.token_limit || existingService.token_limit,
            available_schedule: data.available_schedule || existingService.available_schedule,
            config: data.config || existingService.config,
            storage_limit: data.storage_limit || existingService.storage_limit,
            status: 'active',
            updated_at: new Date()
          },
        });
        return { status: 'success', message: 'Dịch vụ đã được kích hoạt lại', data: reactivated };
      }
      throw new HttpException('Dịch vụ này đã được thiết lập cho tổ chức của bạn', HttpStatus.CONFLICT);
    }
    
    const ps = await this.prisma.partner_services.create({
      data: {
        id: uuidv4(),
        partner_id: profile.data.id,
        service_id: data.service_id, // ID của dịch vụ AI gốc (tour, khách sạn...)
        name: data.name || 'Chatbot AI',
        token_limit: data.token_limit || 10000,
        token_used: 0,
        available_schedule: data.available_schedule || {"monday":{"open":"08:00","close":"22:00"},
                                                        "tuesday":{"open":"08:00","close":"22:00"},
                                                        "saturday":{"open":"09:00","close":"21:00"},
                                                        "sunday":{"open":"09:00","close":"20:00"}
                                                      },
        config: data.config || {
                                  "language": "vi",
                                  "max_turns": 20,
                                  "rag_top_k": 5,
                                  "temperature": 0.7,
                                  "system_prompt": "Bạn là trợ lý AI tư vấn du lịch chuyên nghiệp."
                                },
        storage_limit: data.storage_limit || 500,
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    return { status: 'success', data: ps };
  }

  async listAIServices(userId: string | null, statusQuery?: string) {
    const profile = await this.getProfile(userId);
    const filterStatus = statusQuery ? statusQuery.split(',') : ['active', 'pause'];

    const services = await this.prisma.partner_services.findMany({
      where: {
        partner_id: profile.data.id,
        status: { in: filterStatus, not: 'disable' }, 
      },
    });
    if (services.length === 0) {
      throw new HttpException('Không có dịch vụ AI nào', HttpStatus.NOT_FOUND);
    }

    return { status: 'success', data: services };
  }

  async getAIService(userId: string | null, id: string) {
    
    if (!this.isUuid(id)) { //
      throw new HttpException('ID dịch vụ không hợp lệ', HttpStatus.BAD_REQUEST);
    }
    const profile = await this.getProfile(userId); //

    const service = await this.prisma.partner_services.findFirst({
      where: {
        id: id,
        partner_id: profile.data.id,
        status: { not: 'disable' }    
      },  
    });
    if (!service) {
      throw new HttpException('Không tìm thấy dịch vụ AI hoặc bạn không có quyền truy cập', HttpStatus.NOT_FOUND);
    }

    return { status: 'success', data: service };
  }

 async updateAIService(userId: string | null, id: string, data: any) {
    if (!this.isUuid(id)) {
      throw new HttpException('ID dịch vụ không hợp lệ', HttpStatus.BAD_REQUEST);
    }
    const profile = await this.getProfile(userId);
    const service = await this.prisma.partner_services.findFirst({
      where: {
        id: id,
        partner_id: profile.data.id,
        status: { not: 'disable' }
      },
    });

    if (!service) {
      throw new HttpException('Không tìm thấy dịch vụ AI hoặc bạn không có quyền truy cập', HttpStatus.NOT_FOUND);
    }
    const updated = await this.prisma.partner_services.update({
      where: { id: id },
      data: {
        name: data.name,
        token_limit: data.token_limit,
        storage_limit: data.storage_limit,
        available_schedule: data.available_schedule,
        config: data.config,
        status: data.status ,
        updated_at: new Date(),
      },
    });

    return { status: 'success', data: updated };
  }
    

  // Chuyển status thành disable
  async disableAIService(id: string) {
    await this.prisma.partner_services.update({
      where: { id },
      data: { status: 'disable' },
    });
    return { status: 'success', message: 'Đã hủy dịch vụ' };
  }
  async listActiveAIServices() {
    const services = await this.prisma.partner_services.findMany({
      where: {
        status: 'active',
      },
    });
    if (services.length === 0) {
      throw new HttpException('Không có dịch vụ AI nào đang hoạt động', HttpStatus.NOT_FOUND);
    }
    return { status: 'success', data: services };
  }

}