import { BaseExceptionFilter } from "@nestjs/core";
import { ArgumentsHost, Catch } from "@nestjs/common";
import { InternalServerException } from "./http-exception";

@Catch(InternalServerException)
export class InternalServerFilter extends BaseExceptionFilter {
  catch(exception: InternalServerException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const status = exception.getStatus();
    const responseObject = exception.getResponse() as any;

    response.status(status).json({
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