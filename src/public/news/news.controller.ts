import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req, HttpException, HttpStatus } from '@nestjs/common';
import type { Request } from 'express';
import { NewsService} from './news.service';

@Controller('public/news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}
  @Get('/')
  async getNews() {
    try {
      return await this.newsService.getNews();
    } catch (error) {
      throw new HttpException(
        'Failed to fetch news',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}