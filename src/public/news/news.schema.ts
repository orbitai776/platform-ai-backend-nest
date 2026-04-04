import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type NewsDocument = News & Document;

@Schema({ collection: 'news' })
export class News {
  @Prop()
  title!: string;

  @Prop()
  slug!: string;

  @Prop()
  body!: string;

  @Prop([String])
  tags!: string[];

  @Prop()
  status!: string;

  @Prop()
  author_id!: string;

  @Prop()
  published_at!: Date;

  @Prop()
  created_at!: Date;
}

export const NewsSchema = SchemaFactory.createForClass(News);