import { Module, NestModule } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NewsController } from './news.controller';
import { NewsService } from './news.service';
import { News, NewsSchema } from './news.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: News.name, schema: NewsSchema },
    ]),
  ],
  controllers: [NewsController],
  providers: [NewsService],
})
export class NewsModule implements NestModule {
  configure() {
  }
}