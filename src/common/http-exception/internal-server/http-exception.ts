import { HttpException, HttpStatus } from "@nestjs/common";
import { TypeError } from '../types';

export class InternalServerException extends HttpException {
    constructor(message?: string, details?: any) {
      super(
        {
          message,
          type: TypeError.INTERNAL_SERVER,
          details,
        },
        HttpStatus.NOT_FOUND,
      );
    }
  }