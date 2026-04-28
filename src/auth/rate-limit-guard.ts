import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { RedisService } from '../common/redis.service';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private redisService: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const ip = request.ip || request.connection.remoteAddress;
    const key = `ratelimit:login:${ip}`;

    const attempts = await this.redisService.incr(key);

    // Set expiry on first attempt
    if (attempts === 1) {
      await this.redisService.expire(key, 900); // 15 minutes
    }

    if (attempts > 5) {
      const ttl = await this.redisService.ttl(key);
      throw new HttpException(
        {
          message: `Too many login attempts. Try again in ${Math.ceil(ttl / 60)} minutes.`,
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
