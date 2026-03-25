import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from "@nestjs/common";
import { TypeError } from "../types";

@Catch()
export class DefaultExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest();
    const response = ctx.getResponse();

    try {
      const status = exception.getStatus();

      // Customize the response for role rejection
      if (status === HttpStatus.FORBIDDEN) {
        return response.status(HttpStatus.FORBIDDEN).json({
          statusCode: HttpStatus.FORBIDDEN,
          message: 'Forbidden',
          error: 'Forbidden',
        });
      }
    } catch (err) {
    }

    if (exception.errorCode !== undefined) {
      response.status(exception.status).json({
        statusCode: exception.status,
        errorCode: exception.errorCode,
        message: exception.message,
      });
    } else {
      response.status(500).json({
        statusCode: TypeError.INTERNAL_SERVER,
        message: exception.name || exception.message,
      });
    }
  }
}