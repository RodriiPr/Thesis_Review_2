import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Ip,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RefreshTokenService } from './refresh-token.service';
import { LocalAuthGuard } from './local-auth.guard';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RefreshDto } from './dto/refresh.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private refreshTokenService: RefreshTokenService,
  ) {}

  @Post('login')
  @UseGuards(LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  login(
    @Request() req: { user: Parameters<AuthService['login']>[0] },
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.authService.login(req.user, { ip, userAgent });
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(
    @Body() body: RefreshDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.refreshTokenService.rotateRefreshToken(body.refreshToken, {
      ip,
      userAgent,
    });
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body() body: { refreshToken?: string }, @Request() req: { user: { id: string } }) {
    if (body.refreshToken) {
      await this.refreshTokenService.revokeToken(body.refreshToken);
    } else {
      await this.refreshTokenService.revokeAllUserTokens(req.user.id);
    }
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() body: { email: string }) {
    return this.authService.forgotPassword(body.email);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Request() req: { user: { id: string } }) {
    return this.authService.me(req.user.id);
  }
}
