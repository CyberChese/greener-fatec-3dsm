import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoginRateLimitGuard } from './login-rate-limit.guard';
import { LoginRateLimitService } from './login-rate-limit.service';

describe('LoginRateLimitGuard', () => {
  let rateLimitService: LoginRateLimitService;
  let guard: LoginRateLimitGuard;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));

    const configService = new ConfigService({
      LOGIN_RATE_LIMIT_MAX_ATTEMPTS: 2,
      LOGIN_RATE_LIMIT_WINDOW_SECONDS: 1,
    });
    rateLimitService = new LoginRateLimitService(configService);
    guard = new LoginRateLimitGuard(rateLimitService);
  });

  afterEach(() => {
    rateLimitService.onModuleDestroy();
    jest.useRealTimers();
  });

  it('returns 429 with Retry-After, then allows requests after the window', () => {
    const response = { setHeader: jest.fn() };
    const context = createExecutionContext(
      '192.0.2.10',
      'user@example.com',
      response,
    );

    expect(guard.canActivate(context)).toBe(true);
    expect(guard.canActivate(context)).toBe(true);

    let blockedError: unknown;
    try {
      guard.canActivate(context);
    } catch (error) {
      blockedError = error;
    }

    expect(blockedError).toBeInstanceOf(HttpException);
    if (blockedError instanceof HttpException) {
      expect(blockedError.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      expect(blockedError.getResponse()).toEqual({
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message:
          'Muitas tentativas de login. Tente novamente após o período indicado.',
        error: 'Too Many Requests',
      });
    }
    expect(response.setHeader).toHaveBeenCalledWith('Retry-After', 1);

    jest.advanceTimersByTime(1000);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('limits requests independently by source IP and normalized identity', () => {
    expect(
      rateLimitService.consume('192.0.2.11', 'first@example.com'),
    ).toBeUndefined();
    expect(
      rateLimitService.consume('192.0.2.11', 'second@example.com'),
    ).toBeUndefined();
    expect(rateLimitService.consume('192.0.2.11', 'third@example.com')).toBe(1);

    expect(
      rateLimitService.consume('192.0.2.12', 'same@example.com'),
    ).toBeUndefined();
    expect(
      rateLimitService.consume('192.0.2.13', 'SAME@example.com'),
    ).toBeUndefined();
    expect(rateLimitService.consume('192.0.2.14', 'same@example.com')).toBe(1);
  });
});

function createExecutionContext(
  ip: string,
  email: string,
  response: { setHeader: jest.Mock },
): ExecutionContext {
  const request = {
    ip,
    socket: { remoteAddress: ip },
    body: { email },
  };
  const context = {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  };

  return context as unknown as ExecutionContext;
}
