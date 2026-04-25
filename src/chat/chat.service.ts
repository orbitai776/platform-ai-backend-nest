import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Conversation, ConversationDocument } from './schemas/conversation.schema';
import { Message, MessageDocument } from './schemas/message.schema';
import { CreateSessionDto } from './dto/create-session.dto';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../services/redis/redis.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { randomUUID } from 'crypto';

@Injectable()
export class ChatService {
  private normalizeText(value: unknown): string {
    return String(value ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  private toNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const parsed = Number(value.replace(/[^0-9.]/g, ''));
      return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
  }

  private isPriceLikeKey(key: string): boolean {
    const normalizedKey = this.normalizeText(key);
    return [
      'price',
      'budget',
      'amount',
      'cost',
      'gia',
      'ngan sach',
      'muc gia',
    ].some((k) => normalizedKey.includes(k));
  }

  private compareSlotAndProductValue(
    slotKey: string,
    userValue: unknown,
    productValue: unknown,
  ): number {
    if (userValue == null || productValue == null) {
      return 0;
    }

    if (typeof userValue === 'boolean' || typeof productValue === 'boolean') {
      return userValue === productValue ? 10 : 0;
    }

    const userNum = this.toNumber(userValue);
    const productNum = this.toNumber(productValue);
    if (userNum != null && productNum != null) {
      if (this.isPriceLikeKey(slotKey)) {
        if (productNum <= userNum) {
          return 10;
        }

        if (productNum <= userNum * 1.2) {
          return 5;
        }

        return 0;
      }

      const ratio = Math.abs(productNum - userNum) / Math.max(userNum, 1);
      if (ratio <= 0.1) {
        return 10;
      }

      if (ratio <= 0.25) {
        return 5;
      }

      return 0;
    }

    const userText = this.normalizeText(userValue);
    const productText = this.normalizeText(productValue);
    if (userText && productText) {
      if (productText.includes(userText) || userText.includes(productText)) {
        return 10;
      }
    }

    if (Array.isArray(userValue) && Array.isArray(productValue)) {
      const normalizedProductSet = new Set(productValue.map((item) => this.normalizeText(item)));
      const intersects = userValue.some((item) => normalizedProductSet.has(this.normalizeText(item)));
      return intersects ? 10 : 0;
    }

    return userValue === productValue ? 10 : 0;
  }

  private rankProductsByUserNeed(
    products: Array<{
      id: string;
      name: string;
      category: string | null;
      description: string | null;
      base_price: any;
      metadata: any;
      currency: string | null;
      status: string | null;
    }>,
    slots: Record<string, unknown>,
  ): any[] {
    const slotEntries = Object.entries(slots || {});

    const ranked = products.map((product) => {
      let score = 0;
      let matchedKeyCount = 0;
      const metadata = ((product.metadata as Record<string, unknown>) ?? {}) as Record<string, unknown>;

      for (const [slotKey, userValue] of slotEntries) {
        if (userValue == null || userValue === '') {
          continue;
        }

        const directMetadataValue = metadata[slotKey];

        // Với slot liên quan giá, fallback sang base_price để so sánh ngân sách.
        const comparedProductValue =
          directMetadataValue != null
            ? directMetadataValue
            : this.isPriceLikeKey(slotKey)
              ? product.base_price
              : null;

        const point = this.compareSlotAndProductValue(slotKey, userValue, comparedProductValue);
        if (point > 0) {
          score += point;
          matchedKeyCount += 1;
        }
      }

      const basePriceNumber = this.toNumber(product.base_price);

      return {
        ...product,
        match_score: score,
        matched_key_count: matchedKeyCount,
        base_price_number: basePriceNumber,
      };
    });

    return ranked
      .filter((item) => item.match_score > 0)
      .sort((a, b) => {
        if (b.match_score !== a.match_score) {
          return b.match_score - a.match_score;
        }

        if (b.matched_key_count !== a.matched_key_count) {
          return b.matched_key_count - a.matched_key_count;
        }

        const aPrice = a.base_price_number ?? Number.POSITIVE_INFINITY;
        const bPrice = b.base_price_number ?? Number.POSITIVE_INFINITY;
        if (aPrice !== bPrice) {
          return aPrice - bPrice;
        }

        return a.name.localeCompare(b.name);
      });
  }

  private isUuid(value: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  }

  constructor(
    @InjectModel(Conversation.name)
    private conversationModel: Model<ConversationDocument>,
    @InjectModel(Message.name)
    private messageModel: Model<MessageDocument>,
    private prisma: PrismaService,
    private redis: RedisService,
    private httpService: HttpService,
  ) { }

  // ------------------------------------------------------------------
  // API 1: Khởi tạo phiên chat
  // ------------------------------------------------------------------
  async createSession(createSessionDto: CreateSessionDto, userId?: string | null) {
    if (!createSessionDto?.partner_service_id || !this.isUuid(createSessionDto.partner_service_id)) {
      throw new HttpException('partner_service_id phải là UUID hợp lệ', HttpStatus.BAD_REQUEST);
    }

    const guestSessionId = userId
      ? null
      : (createSessionDto?.guest_session_id?.trim() || randomUUID());

    // 1. Validate Postgres: partner_service_id có tồn tại không?
    const serviceExists = await this.prisma.partner_services.findUnique({
      where: { id: createSessionDto.partner_service_id },
    });

    if (!serviceExists) {
      throw new HttpException('Dịch vụ không tồn tại', HttpStatus.NOT_FOUND);
    }

    // 2. Tạo DB Mongo
    const newSession = await this.conversationModel.create({
      partner_service_id: createSessionDto.partner_service_id,
      user_id: userId ?? null,
      converted_user_id: userId ?? null,
      guest_session_id: guestSessionId,
      ai_session_id: null,
      slot_state: {},
      session_memory: [],
      status: 'active',
    });

    return {
      status: 'success',
      data: {
        conversation_id: String(newSession._id),
        guest_session_id: newSession.guest_session_id,
        created_at: newSession.created_at,
      },
    };
  }

  // ------------------------------------------------------------------
  // API 2: Lấy danh sách phiên chat (Phân trang)
  // ------------------------------------------------------------------
  async getUserSessions(userId: string | null, page: number = 1, limit: number = 20) {
    if (!userId) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }

    const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
    const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), 100) : 20;
    const skip = (safePage - 1) * safeLimit;

    const sessions = await this.conversationModel
      .find({ user_id: userId })
      .sort({ updated_at: -1 })
      .skip(skip)
      .limit(safeLimit)
      .lean();

    const total = await this.conversationModel.countDocuments({ user_id: userId });

    const formattedData = await Promise.all(
      sessions.map(async (sess) => {
        const lastMsg = await this.messageModel
          .findOne({ conversation_id: sess._id })
          .sort({ created_at: -1 });

        const partnerServiceInfo = await this.prisma.partner_services.findUnique({
          where: { id: sess.partner_service_id },
          include: { partners: true },
        });

        return {
          conversation_id: String(sess._id),
          partner_name: partnerServiceInfo?.partners?.name || 'Unknown Partner',
          last_message: lastMsg ? lastMsg.content : '',
          updated_at: sess.updated_at,
        };
      }),
    );

    return {
      data: formattedData,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
      },
    };
  }

  // ------------------------------------------------------------------
  // API 3: Lấy chi tiết tin nhắn
  // ------------------------------------------------------------------
  async getMessages(conversationId: string) {
    if (!Types.ObjectId.isValid(conversationId)) {
      throw new HttpException('conversation_id không hợp lệ', HttpStatus.BAD_REQUEST);
    }

    // Chuyển string sang ObjectId
    const convId = new Types.ObjectId(conversationId);

    const messages = await this.messageModel
      .find({ conversation_id: convId })
      .select('role content created_at -_id')
      .sort({ created_at: 1 });

    return { data: messages };
  }

  // ------------------------------------------------------------------
  // API 4: Lõi gửi tin nhắn
  // ------------------------------------------------------------------
  async sendMessage(conversationId: string, userText: string) {
    if (!Types.ObjectId.isValid(conversationId)) {
      throw new HttpException('conversation_id không hợp lệ', HttpStatus.BAD_REQUEST);
    }

    const convId = new Types.ObjectId(conversationId);

    if (!userText || !userText.trim()) {
      throw new HttpException('Nội dung tin nhắn không hợp lệ', HttpStatus.BAD_REQUEST);
    }

    const session = await this.conversationModel.findById(convId);
    if (!session) {
      throw new HttpException('Session not found', HttpStatus.NOT_FOUND);
    }

    // ------------------------------------------------------------------
    // BƯỚC 1: KIỂM TRA ĐIỀU KIỆN (Postgres & Redis)
    // ------------------------------------------------------------------
    // Query lấy thông tin Dịch vụ kèm theo Đối tác (Partner)
    const serviceInfo = await this.prisma.partner_services.findUnique({
      where: { id: session.partner_service_id },
      include: { services: true },
    });

    if (!serviceInfo?.partner_id) {
      throw new HttpException('Không tìm thấy đối tác của dịch vụ', HttpStatus.BAD_REQUEST);
    }

    // Check trạng thái kích hoạt 
    if (serviceInfo.status !== 'active') {
      throw new HttpException('Dịch vụ hoặc đối tác đang tạm khóa', HttpStatus.FORBIDDEN);
    }

    const serviceName = serviceInfo.services?.type?.trim();
    if (!serviceName) {
      throw new HttpException(
        'Không tìm thấy service type tương ứng với partner_service_id',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Check Quota Token trong Redis
    const tokenKey = `partner:${serviceInfo.partner_id}:tokens`;
    const tokenBalance = await this.redis.get(tokenKey);
    // if (Number(tokenBalance || 0) <= 0) {
    //   throw new HttpException('Hết hạn mức AI', HttpStatus.PAYMENT_REQUIRED);
    // }

    // ------------------------------------------------------------------
    // LƯU TIN NHẮN USER & GỌI AI SERVICE
    // ------------------------------------------------------------------
    await this.messageModel.create({
      conversation_id: convId,
      role: 'user',
      content: userText,
      tokens_used: 0,
      retrieved_docs: [],
      slot_snapshot: session.slot_state,
    });

    let aiResponseData: any;
    let aiSessionId = session.ai_session_id;
    try {
      // Gọi API sang AI Service
      const aiApiUrl = process.env.AI_SERVICE_URL;
      if (!aiApiUrl || !aiApiUrl.trim()) {
        throw new HttpException('Thiếu cấu hình AI_SERVICE_URL', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      if (!aiSessionId) {
        const startResponse: any = await firstValueFrom(
          this.httpService.post(`${aiApiUrl}/api/v1/chat/start`, {
            first_message: userText,
            service_name: serviceName,
          }),
        );

        const startData = startResponse.data?.data;
        if (!startData || typeof startData !== 'object') {
          throw new HttpException('AI start response sai định dạng (thiếu data)', HttpStatus.BAD_GATEWAY);
        }

        aiResponseData = startData;
        aiSessionId = startData.session_id;

        if (!aiSessionId) {
          throw new HttpException('AI start response không có session_id', HttpStatus.BAD_GATEWAY);
        }
      } else {
        const turnResponse: any = await firstValueFrom(
          this.httpService.post(`${aiApiUrl}/api/v1/chat/turn`, {
            session_id: aiSessionId,
            message: userText,
          }),
        );

        const turnData = turnResponse.data?.data;
        if (!turnData || typeof turnData !== 'object') {
          throw new HttpException('AI turn response sai định dạng (thiếu data)', HttpStatus.BAD_GATEWAY);
        }

        aiResponseData = turnData;
        aiSessionId = turnData.session_id;
        if (!aiSessionId) {
          throw new HttpException('AI turn response không có session_id', HttpStatus.BAD_GATEWAY);
        }
      }
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }

      const axiosError = error as AxiosError<{ message?: string }>;
      const upstreamStatus = axiosError.response?.status;
      const upstreamData = axiosError.response?.data;

      console.error('Lỗi gọi AI Service:', upstreamData || axiosError.message);

      if (upstreamStatus) {
        throw new HttpException(
          {
            message: 'AI Service trả về lỗi',
            ai_message: upstreamData?.message || axiosError.message,
          },
          upstreamStatus,
        );
      }

      throw new HttpException('AI Service hiện không phản hồi', HttpStatus.SERVICE_UNAVAILABLE);
    }

    // Map dữ liệu từ AI Service
    const replyText = aiResponseData.reply || 'Xin lỗi, hệ thống AI đang bận.';
    const aiStatus = aiResponseData.status || 'collecting'; // 'collecting' hoặc 'completed'
    const isCompleted = aiStatus === 'completed';
    const newSlots =
      aiResponseData.current_slots ||
      aiResponseData.filled_slots ||
      aiResponseData.slots ||
      session.slot_state;

    // Giả định AI Service trả về usage. Nếu không, mặc định trừ 10 token/lượt
    const tokensUsed = aiResponseData.usage?.total_tokens || 10;

    // ------------------------------------------------------------------
    // TRỪ TOKEN & CẬP NHẬT DATABASE
    // ------------------------------------------------------------------
    await this.redis.decrby(tokenKey, tokensUsed);

    await this.conversationModel.findByIdAndUpdate(convId, {
      ai_session_id: aiSessionId,
      slot_state: newSlots,
      status: isCompleted ? 'completed' : 'active', // Đánh dấu chốt deal nếu gom đủ slot
    });

    await this.messageModel.create({
      conversation_id: convId,
      role: 'assistant',
      content: replyText,
      tokens_used: tokensUsed,
      retrieved_docs: aiResponseData.retrieved_docs || [],
      slot_snapshot: newSlots,
    });

    // ------------------------------------------------------------------
    // QUERY SẢN PHẨM (Nếu AI báo đã gom đủ thông tin)
    // ------------------------------------------------------------------
    let products: any[] = [];
    if (isCompleted) {
      const activeProducts = await this.prisma.products.findMany({
        where: {
          partner_service_id: session.partner_service_id,
          status: 'active',
        },
      });

      products = this.rankProductsByUserNeed(
        activeProducts,
        (newSlots as Record<string, unknown>) ?? {},
      );

      if (products.length > 5) {
        products = products.slice(0, 5);
      }
    }

    return {
      status: 'success',
      data: {
        conversation_id: conversationId,
        role: 'assistant',
        service_name: serviceName,
        content: replyText,
        is_completed: isCompleted,
        missing_slots: aiResponseData.missing_slots || [],
        products: products,
      },
    };
  }
}