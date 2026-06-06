import { Injectable } from '@nestjs/common';
import { encryptToken } from '../common/token-crypto';
import { JwtService } from '@nestjs/jwt';
import axios from 'axios';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  getKakaoAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: process.env.KAKAO_CLIENT_ID,
      redirect_uri: process.env.KAKAO_REDIRECT_URI,
      response_type: 'code',
      scope: 'profile_nickname talk_message',
    });
    return `https://kauth.kakao.com/oauth/authorize?${params}`;
  }

  async kakaoCallback(code: string) {
    const tokenRes = await axios.post(
      'https://kauth.kakao.com/oauth/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.KAKAO_CLIENT_ID,
        client_secret: process.env.KAKAO_CLIENT_SECRET || '',
        redirect_uri: process.env.KAKAO_REDIRECT_URI,
        code,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );

    const { access_token, refresh_token } = tokenRes.data;

    const userRes = await axios.get('https://kapi.kakao.com/v2/user/me', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const kakaoUser = userRes.data;
    const kakaoId = String(kakaoUser.id);
    const name =
      kakaoUser.kakao_account?.profile?.nickname ||
      kakaoUser.properties?.nickname ||
      '사용자';
    const email = kakaoUser.kakao_account?.email || null;

    let user = await this.prisma.user.findUnique({ where: { kakaoId } });

    if (!user) {
      const baseUsername = name.replace(/\s+/g, '').toLowerCase();
      let username = baseUsername;
      let count = 1;
      while (await this.prisma.user.findUnique({ where: { username } })) {
        username = `${baseUsername}${count++}`;
      }

      user = await this.prisma.user.create({
        data: {
          kakaoId,
          name,
          email,
          username,
          kakaoAccessToken: encryptToken(access_token),
          kakaoRefreshToken: encryptToken(refresh_token),
        },
      });

      await this.createDefaultAvailability(user.id);
    } else {
      user = await this.prisma.user.update({
        where: { kakaoId },
        data: { kakaoAccessToken: encryptToken(access_token), kakaoRefreshToken: encryptToken(refresh_token) },
      });
    }

    const jwt = this.jwtService.sign({ sub: user.id });
    return { token: jwt, user };
  }

  getGoogleCalendarAuthUrl(userId: string): string {
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI,
      response_type: 'code',
      scope: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events',
      ].join(' '),
      access_type: 'offline',
      prompt: 'consent',
      state: userId,
    });
    return `https://accounts.google.com/o/oauth2/auth?${params}`;
  }

  async googleCalendarCallback(code: string, userId: string) {
    const tokenRes = await axios.post('https://oauth2.googleapis.com/token', {
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code',
    });

    const { refresh_token } = tokenRes.data;

    await this.prisma.user.update({
      where: { id: userId },
      data: { googleRefreshToken: encryptToken(refresh_token) },
    });

    return { success: true };
  }

  private async createDefaultAvailability(userId: string) {
    const weekdays = [1, 2, 3, 4, 5];
    await this.prisma.availability.createMany({
      data: weekdays.map((day) => ({
        userId,
        dayOfWeek: day,
        startTime: '09:00',
        endTime: '17:00',
      })),
    });
  }
}
