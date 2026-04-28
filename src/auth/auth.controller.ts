import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  Headers,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth } from '@nestjs/swagger';
import { RateLimitGuard } from './rate-limit-guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  // @Post('login')
  // login(@Body() dto: LoginDto) {
  //   return this.authService.login(dto);
  // }

  @Post('login')
  @UseGuards(RateLimitGuard) // ← add this
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // Protected route — returns logged in user's info
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  getMe(@Request() req) {
    const { password, ...user } = req.user;
    return user;
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('logout')
  async logout(@Request() req, @Headers('authorization') auth: string) {
    const token = auth?.replace('Bearer ', '');
    if (token) {
      await this.authService.logout(token);
    }
    return { message: 'Logged out successfully' };
  }
}
