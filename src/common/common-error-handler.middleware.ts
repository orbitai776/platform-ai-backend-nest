import { Injectable } from '@nestjs/common';
import { BadRequestException } from './http-exception';
import { TypeMessage } from './http-exception/types';

@Injectable()
export class CommonErrorHandlerMiddleware {
  checkError(err: any) {
    if (err.details) {
      const errors = err.details.map((detail: any) => ({ err: detail.message }));
      throw new BadRequestException(TypeMessage.BAD_INPUT, errors);
    } else if (err.response && err.response.error && err.response.message && err.response.statusCode) {
      const rdetail = err.response;
      throw new BadRequestException(rdetail.error, rdetail.message, rdetail.statusCode);
    } else if (err.status && err.message) {
      throw new BadRequestException(err.message, err.message, err.status);
    }
    throw new BadRequestException("Exception", err);
  }
}
