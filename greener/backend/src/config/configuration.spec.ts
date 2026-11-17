import { validateEnvironment } from './configuration';

describe('validateEnvironment', () => {
  it('fails outside tests when JWT_SECRET is missing', () => {
    expect(() =>
      validateEnvironment({
        NODE_ENV: 'production',
      }),
    ).toThrow('JWT_SECRET is required and must contain at least 32 bytes.');
  });

  it('requires a JWT secret with at least 32 bytes outside tests', () => {
    expect(() =>
      validateEnvironment({
        NODE_ENV: 'production',
        JWT_SECRET: 'too-short',
      }),
    ).toThrow('JWT_SECRET is required and must contain at least 32 bytes.');
  });

  it('normalizes and validates login rate-limit settings', () => {
    const validated = validateEnvironment({
      NODE_ENV: 'production',
      JWT_SECRET: '0123456789abcdef0123456789abcdef',
      LOGIN_RATE_LIMIT_MAX_ATTEMPTS: '7',
      LOGIN_RATE_LIMIT_WINDOW_SECONDS: '90',
      SERVICE_DISCOVERY_INTERVAL_SECONDS: '600',
    });

    expect(validated).toMatchObject({
      JWT_SECRET: '0123456789abcdef0123456789abcdef',
      LOGIN_RATE_LIMIT_MAX_ATTEMPTS: 7,
      LOGIN_RATE_LIMIT_WINDOW_SECONDS: 90,
      SERVICE_DISCOVERY_INTERVAL_SECONDS: 600,
    });
  });

  it('rejects invalid rate-limit settings', () => {
    expect(() =>
      validateEnvironment({
        NODE_ENV: 'production',
        JWT_SECRET: '0123456789abcdef0123456789abcdef',
        LOGIN_RATE_LIMIT_MAX_ATTEMPTS: '0',
      }),
    ).toThrow('LOGIN_RATE_LIMIT_MAX_ATTEMPTS must be a positive integer.');
  });

  it('allows the JWT secret to be omitted by unit tests', () => {
    expect(validateEnvironment({ NODE_ENV: 'test' })).toMatchObject({
      LOGIN_RATE_LIMIT_MAX_ATTEMPTS: 5,
      LOGIN_RATE_LIMIT_WINDOW_SECONDS: 60,
      SERVICE_DISCOVERY_INTERVAL_SECONDS: 300,
    });
  });

  it('rejects invalid service discovery intervals', () => {
    expect(() =>
      validateEnvironment({
        NODE_ENV: 'test',
        SERVICE_DISCOVERY_INTERVAL_SECONDS: '0',
      }),
    ).toThrow('SERVICE_DISCOVERY_INTERVAL_SECONDS must be a positive integer.');
    expect(() =>
      validateEnvironment({
        NODE_ENV: 'test',
        SERVICE_DISCOVERY_INTERVAL_SECONDS: '2147484',
      }),
    ).toThrow('SERVICE_DISCOVERY_INTERVAL_SECONDS must be at most 2147483.');
  });
});
