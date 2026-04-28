import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy, StrategyOptionsWithRequest } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { RedisService } from '../common/redis.service';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
    private redisService: RedisService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
      passReqToCallback: true, // ← pass request to validate
    } as StrategyOptionsWithRequest);
  }

  async validate(req: Request, payload: { sub: string; email: string }) {
    // Check if token is blacklisted
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
    if (token) {
      const blacklisted = await this.redisService.exists(`blacklist:${token}`);
      if (blacklisted)
        throw new UnauthorizedException('Token has been revoked');
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user) throw new UnauthorizedException();
    return user;
  }
}
