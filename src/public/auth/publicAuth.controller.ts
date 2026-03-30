
import { Controller, Get, Query, Request, Body, Post, Req, Delete } from '@nestjs/common';
import { CommonErrorHandlerMiddleware } from '../../common/common-error-handler.middleware';
import { PublicAuthService } from './publicAuth.service';

@Controller('public/auth')
export class PublicAuthController {
  constructor(
    private readonly publicAuthService: PublicAuthService,
    private errorHandler: CommonErrorHandlerMiddleware,
  ) {}

  @Post('/')
  async refundBooking(@Body() input:any, @Request() req: any) {
    try {
      return await this.publicAuthService.auth(input);
    } catch (error) {
      this.errorHandler.checkError(error)
    }
  }

  @Get('/inc-using-token')
  async testIncUsingToken(@Query() input: any, @Request() req: any) {
    try {
      input.uid = input.uid || 'tHShcFW7dEbyOnriYg7IZJyOPyj1';
      return await this.publicAuthService.testIncUsingToken(input);
    } catch (error) {
      this.errorHandler.checkError(error)
    }
  }

  @Get('/redis')
  async getAllTokensRedis(@Request() req: any) {
    try {
      return await this.publicAuthService.getAllTokensRedis();
    } catch (error) {
      this.errorHandler.checkError(error)
    }
  }

  @Delete('/redis')
  async delAllTokensRedis(@Request() req: any) {
    try {
      return await this.publicAuthService.delAllTokensRedis();
    } catch (error) {
      this.errorHandler.checkError(error)
    }
  }
}
