import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ConversationDocument = HydratedDocument<Conversation>;

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class Conversation {
    @Prop({ required: true })
    partner_service_id!: string;

    @Prop({ type: String, default: null })
    user_id!: string | null;

    @Prop({ type: String, default: null })
    converted_user_id!: string | null;

    @Prop({ type: String, default: null })
    guest_session_id!: string | null;

    @Prop({ type: String, default: null })
    ai_session_id!: string | null;

    @Prop({ type: Object, default: {} })
    slot_state!: Record<string, any>;

    @Prop({ type: [String], default: [] })
    session_memory!: string[];

    @Prop({ default: 'active' })
    status!: string;

    created_at!: Date;
    updated_at!: Date;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);