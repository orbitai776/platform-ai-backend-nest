import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Conversation, ConversationDocument } from './schemas/conversation.schema';
import { Message, MessageDocument } from './schemas/message.schema';
import { CreateSessionDto } from './dto/create-session.dto';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../services/redis/redis.service';

@Injectable()
export class ChatService {
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
  ) { }

  // ------------------------------------------------------------------
  // API 1: Khởi tạo phiên chat
  // ------------------------------------------------------------------
  async createSession(createSessionDto: CreateSessionDto, userId?: string | null) {
    if (!createSessionDto?.partner_service_id || !this.isUuid(createSessionDto.partner_service_id)) {
      throw new HttpException('partner_service_id phải là UUID hợp lệ', HttpStatus.BAD_REQUEST);
    }

    if (!userId && !createSessionDto?.guest_session_id) {
      throw new HttpException('guest_session_id là bắt buộc cho guest', HttpStatus.BAD_REQUEST);
    }

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
      guest_session_id: userId ? null : (createSessionDto.guest_session_id ?? null),
      slot_state: {},
      session_memory: [],
      status: 'active',
    });

    return {
      status: 'success',
      data: {
        conversation_id: String(newSession._id),
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
  async getMessages(sessionId: string) {
    // Chuyển string sang ObjectId
    const convId = new Types.ObjectId(sessionId);

    const messages = await this.messageModel
      .find({ conversation_id: convId })
      .select('role content created_at -_id')
      .sort({ created_at: 1 });

    return { data: messages };
  }

  // ------------------------------------------------------------------
  // API 4: Lõi gửi tin nhắn
  // ------------------------------------------------------------------
  async sendMessage(sessionId: string, userText: string) {
    const convId = new Types.ObjectId(sessionId);

    if (!userText || !userText.trim()) {
      throw new HttpException('Nội dung tin nhắn không hợp lệ', HttpStatus.BAD_REQUEST);
    }

    const session = await this.conversationModel.findById(convId);
    if (!session) {
      throw new HttpException('Session not found', HttpStatus.NOT_FOUND);
    }

    const serviceInfo = await this.prisma.partner_services.findUnique({
      where: { id: session.partner_service_id },
    });

    if (!serviceInfo?.partner_id) {
      throw new HttpException('Không tìm thấy đối tác của dịch vụ', HttpStatus.BAD_REQUEST);
    }

    // Bắt buộc check Redis trước khi bắn sang AI service.
    const tokenKey = `partner:${serviceInfo.partner_id}:tokens`;
    const tokenBalance = await this.redis.get(tokenKey);
    if (Number(tokenBalance || 0) <= 0) {
      throw new HttpException('Hết hạn mức AI', HttpStatus.PAYMENT_REQUIRED);
    }

    // 1. Lưu lời User
    await this.messageModel.create({
      conversation_id: convId,
      role: 'user',
      content: userText,
      tokens_used: 0,
      retrieved_docs: [],
      slot_snapshot: {},
    });

    // 2. Gọi AI (tạm fake data AI trả về)
    const aiData = {
      reply_text: 'Dạ, anh muốn đi ngày nào ạ?',
      tokens_used: 10,
      current_slots: { ...session.slot_state, destination: 'Đà Lạt' },
      new_memory: 'Khách quan tâm tour Đà Lạt',
      retrieved_docs: [
        { service_data_id: 'doc_1', content: 'Tour ĐL...', score: 0.95 },
      ],
      is_slot_filled_completed: false,
    };

    // 3. Trừ quota Redis và cập nhật hội thoại.
    await this.redis.decrby(tokenKey, aiData.tokens_used);

    await this.conversationModel.findByIdAndUpdate(convId, {
      slot_state: aiData.current_slots,
      $push: { session_memory: aiData.new_memory },
    });

    await this.messageModel.create({
      conversation_id: convId,
      role: 'assistant',
      content: aiData.reply_text,
      tokens_used: aiData.tokens_used,
      retrieved_docs: aiData.retrieved_docs,
      slot_snapshot: aiData.current_slots,
    });

    // 4. Nếu AI đã gom đủ param thì mới trả danh sách sản phẩm.
    let products: any[] = [];
    if (aiData.is_slot_filled_completed) {
      products = await this.prisma.products.findMany({
        where: { partner_service_id: session.partner_service_id, status: 'active' },
        take: 5,
      });
    }

    return {
      status: 'success',
      data: {
        role: 'assistant',
        content: aiData.reply_text,
        is_completed: aiData.is_slot_filled_completed,
        products: products,
      },
    };
  }
}