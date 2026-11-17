const DEFAULT_LOGIN_RATE_LIMIT_MAX_ATTEMPTS = 5;
const DEFAULT_LOGIN_RATE_LIMIT_WINDOW_SECONDS = 60;
const DEFAULT_SERVICE_DISCOVERY_INTERVAL_SECONDS = 300;
const MAX_INTERVAL_SECONDS = Math.floor(2_147_483_647 / 1000);

function parsePositiveInteger(
  name: string,
  value: unknown,
  defaultValue: number,
): number {
  if (value === undefined) {
    return defaultValue;
  }

  if (typeof value !== 'string' && typeof value !== 'number') {
    throw new Error(`${name} must be a positive integer.`);
  }

  const parsedValue = Number(value);
  if (!Number.isSafeInteger(parsedValue) || parsedValue < 1) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return parsedValue;
}

export function validateEnvironment(
  environment: Record<string, unknown>,
): Record<string, unknown> {
  const jwtSecret = environment['JWT_SECRET'];
  if (environment['NODE_ENV'] !== 'test') {
    if (
      typeof jwtSecret !== 'string' ||
      Buffer.byteLength(jwtSecret.trim(), 'utf8') < 32
    ) {
      throw new Error(
        'JWT_SECRET is required and must contain at least 32 bytes.',
      );
    }
  }

  const loginRateLimitMaxAttempts = parsePositiveInteger(
    'LOGIN_RATE_LIMIT_MAX_ATTEMPTS',
    environment['LOGIN_RATE_LIMIT_MAX_ATTEMPTS'],
    DEFAULT_LOGIN_RATE_LIMIT_MAX_ATTEMPTS,
  );
  const loginRateLimitWindowSeconds = parsePositiveInteger(
    'LOGIN_RATE_LIMIT_WINDOW_SECONDS',
    environment['LOGIN_RATE_LIMIT_WINDOW_SECONDS'],
    DEFAULT_LOGIN_RATE_LIMIT_WINDOW_SECONDS,
  );

  if (!Number.isSafeInteger(loginRateLimitWindowSeconds * 1000)) {
    throw new Error(
      'LOGIN_RATE_LIMIT_WINDOW_SECONDS is outside the supported range.',
    );
  }

  const serviceDiscoveryIntervalSeconds = parsePositiveInteger(
    'SERVICE_DISCOVERY_INTERVAL_SECONDS',
    environment['SERVICE_DISCOVERY_INTERVAL_SECONDS'],
    DEFAULT_SERVICE_DISCOVERY_INTERVAL_SECONDS,
  );
  if (serviceDiscoveryIntervalSeconds > MAX_INTERVAL_SECONDS) {
    throw new Error(
      `SERVICE_DISCOVERY_INTERVAL_SECONDS must be at most ${MAX_INTERVAL_SECONDS}.`,
    );
  }

  return {
    ...environment,
    ...(typeof jwtSecret === 'string' ? { JWT_SECRET: jwtSecret.trim() } : {}),
    LOGIN_RATE_LIMIT_MAX_ATTEMPTS: loginRateLimitMaxAttempts,
    LOGIN_RATE_LIMIT_WINDOW_SECONDS: loginRateLimitWindowSeconds,
    SERVICE_DISCOVERY_INTERVAL_SECONDS: serviceDiscoveryIntervalSeconds,
  };
}
