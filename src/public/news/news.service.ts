import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { News, NewsDocument } from './news.schema';

@Injectable()
export class NewsService {
  constructor(
    @InjectModel(News.name)
    private readonly newsModel: Model<NewsDocument>,
  ) {}

  getNews = async () => {
    return this.newsModel
      .find({ status: 'published' })
      .sort({ created_at: -1 });
  };
}