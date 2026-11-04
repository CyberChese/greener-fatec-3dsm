import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { LoginRateLimitService } from './login-rate-limit.service';

@Injectable()
export class LoginRateLimitGuard implements CanActivate {
  constructor(private readonly loginRateLimitService: LoginRateLimitService) {}

  canActivate(context: ExecutionContext): boolean {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request>();
    const response = httpContext.getResponse<Response>();
    const clientIp = request.ip || request.socket.remoteAddress || 'unknown';
    const email = this.readEmail(request.body);
    const retryAfterSeconds = this.loginRateLimitService.consume(
      clientIp,
      email,
    );

    if (retryAfterSeconds !== undefined) {
      response.setHeader('Retry-After', retryAfterSeconds);
      const message =
        'Muitas tentativas de login. Tente novamente após o período indicado.';
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message,
          error: 'Too Many Requests',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  private readEmail(body: unknown): string {
    if (
      typeof body === 'object' &&
      body !== null &&
      'email' in body &&
      typeof body.email === 'string'
    ) {
      return body.email;
    }

    return '';
  }
}
