import { ArgumentsHost, Catch } from "@nestjs/common";
import { BadRequestException } from "./http-exception";
import { BaseExceptionFilter } from "@nestjs/core";

@Catch(BadRequestException)
export class BadRequestFilter extends BaseExceptionFilter {
  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const status = exception.getStatus();
    const responseObject = exception.getResponse() as any;

    response.status(status).json({
      error: responseObject.errorCode,
      status: status,
      message:
        responseObject.message?.name
        || responseObject.message
        || exception.message,
      type: responseObject.type,
      details: responseObject.details
    });
  }
}