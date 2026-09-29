import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { Prisma } from '../../generated/prisma/client.js';

// Turns common database errors into clean HTTP responses instead of a 500.
const PRISMA_ERROR_MAP: Record<string, { status: HttpStatus; message: string }> = {
  P2002: { status: HttpStatus.CONFLICT, message: 'A record with this value already exists' },
  P2003: { status: HttpStatus.BAD_REQUEST, message: 'Related record does not exist' },
  P2025: { status: HttpStatus.NOT_FOUND, message: 'Record not found' },
};

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const mapped = PRISMA_ERROR_MAP[exception.code] ?? {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Database error',
    };

    response.status(mapped.status).json({
      statusCode: mapped.status,
      message: mapped.message,
      error: exception.code,
    });
  }
}
