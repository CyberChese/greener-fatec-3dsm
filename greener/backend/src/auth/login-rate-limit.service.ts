import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface LoginAttemptBucket {
  attempts: number;
  expiresAt: number;
}

@Injectable()
export class LoginRateLimitService implements OnModuleDestroy {
  private readonly buckets = new Map<string, LoginAttemptBucket>();
  private readonly maxAttempts: number;
  private readonly windowMilliseconds: number;
  private readonly cleanupTimer: ReturnType<typeof setInterval>;

  constructor(configService: ConfigService) {
    this.maxAttempts = configService.getOrThrow<number>(
      'LOGIN_RATE_LIMIT_MAX_ATTEMPTS',
    );
    this.windowMilliseconds =
      configService.getOrThrow<number>('LOGIN_RATE_LIMIT_WINDOW_SECONDS') *
      1000;

    this.cleanupTimer = setInterval(
      () => this.removeExpiredBuckets(),
      Math.min(this.windowMilliseconds, 60_000),
    );
    this.cleanupTimer.unref();
  }

  consume(clientIp: string, email: string): number | undefined {
    const now = Date.now();
    const normalizedEmail = email.trim().toLowerCase();
    const keys = [`ip:${clientIp}`];

    if (normalizedEmail) {
      keys.push(`email:${normalizedEmail}`);
    }

    const buckets = keys.map((key) => this.getActiveBucket(key, now));
    const blockedUntil = Math.max(
      0,
      ...buckets
        .filter((bucket) => bucket.attempts >= this.maxAttempts)
        .map((bucket) => bucket.expiresAt),
    );

    if (blockedUntil > now) {
      return Math.max(1, Math.ceil((blockedUntil - now) / 1000));
    }

    for (const bucket of buckets) {
      bucket.attempts += 1;
    }

    return undefined;
  }

  onModuleDestroy(): void {
    clearInterval(this.cleanupTimer);
  }

  private getActiveBucket(key: string, now: number): LoginAttemptBucket {
    const existing = this.buckets.get(key);
    if (existing && existing.expiresAt > now) {
      return existing;
    }

    const bucket = {
      attempts: 0,
      expiresAt: now + this.windowMilliseconds,
    };
    this.buckets.set(key, bucket);
    return bucket;
  }

  private removeExpiredBuckets(): void {
    const now = Date.now();
    for (const [key, bucket] of this.buckets) {
      if (bucket.expiresAt <= now) {
        this.buckets.delete(key);
      }
    }
  }
}
