import { HttpException, HttpStatus } from "@nestjs/common";
import { TypeError } from '../types';

export class BadRequestException extends HttpException {
    constructor(message?: string, details?: any, errorCode?: any) {
      super(
        {
          message: details?.message || message,
          type: TypeError.BAD_REQUESTED,
          details,
          errorCode: details?.status || errorCode
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }