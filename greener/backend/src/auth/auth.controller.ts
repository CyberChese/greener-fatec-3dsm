import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request as ExpressRequest } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LoginRateLimitGuard } from './login-rate-limit.guard';

type AuthenticatedRequest = ExpressRequest & {
  user: {
    id: string;
    email: string;
    name: string;
  };
};

@Controller('auth')
@ApiTags('Auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(LoginRateLimitGuard)
  @ApiOperation({ summary: 'Authenticate a user and issue a JWT' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Credentials accepted.',
    schema: {
      example: {
        access_token: '<jwt>',
        user: { id: '<uuid>', email: 'user@example.com', name: 'User' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid request body.' })
  @ApiResponse({ status: 401, description: 'Invalid credentials.' })
  @ApiResponse({ status: 429, description: 'Login rate limit exceeded.' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Return the authenticated user profile' })
  @ApiResponse({
    status: 200,
    description: 'Authenticated user.',
    schema: {
      example: { id: '<uuid>', email: 'user@example.com', name: 'User' },
    },
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid JWT.' })
  getProfile(@Request() req: AuthenticatedRequest) {
    return req.user;
  }
}
