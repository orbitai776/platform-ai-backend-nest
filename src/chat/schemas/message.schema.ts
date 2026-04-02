import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type MessageDocument = HydratedDocument<Message>;

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: false } })
export class Message {
    @Prop({ type: Types.ObjectId, required: true })
    conversation_id!: Types.ObjectId;

    @Prop({ required: true, enum: ['user', 'assistant', 'system'] })
    role!: string;

    @Prop({ required: true })
    content!: string;

    @Prop({ default: 0 })
    tokens_used!: number;

    @Prop({ type: Array, default: [] })
    retrieved_docs!: any[];

    @Prop({ type: Object })
    slot_snapshot!: Record<string, any>;

    created_at!: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);