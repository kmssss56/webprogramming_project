import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get('kakao')
  kakaoLogin(@Res() res: Response) {
    return res.redirect(this.authService.getKakaoAuthUrl());
  }

  @Get('kakao/callback')
  async kakaoCallback(@Query('code') code: string, @Res() res: Response) {
    const { token } = await this.authService.kakaoCallback(code);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    return res.redirect(`${frontendUrl}/kakao-callback?token=${token}`);
  }

  @UseGuards(JwtAuthGuard)
  @Get('google/calendar')
  googleCalendarAuth(@CurrentUser() user: any) {
    return { url: this.authService.getGoogleCalendarAuthUrl(user.id) };
  }

  @Get('google/callback')
  async googleCallback(
    @Query('code') code: string,
    @Query('state') userId: string,
    @Res() res: Response,
  ) {
    await this.authService.googleCalendarCallback(code, userId);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    return res.redirect(`${frontendUrl}/google-callback?success=true`);
  }
}
