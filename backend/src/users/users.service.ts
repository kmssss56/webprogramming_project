import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // 토큰 원문은 절대 클라이언트로 보내지 않는다 — 연동 여부만 boolean으로
  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        timezone: true,
        googleRefreshToken: true,
        createdAt: true,
      },
    });
    if (!user) return null;
    const { googleRefreshToken, ...safe } = user;
    return { ...safe, googleConnected: Boolean(googleRefreshToken) };
  }

  async updateMe(userId: string, data: { name?: string; username?: string; timezone?: string }) {
    // 화이트리스트: 허용된 필드만 반영 (mass-assignment 방지)
    const allowed = {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.username !== undefined && { username: data.username }),
      ...(data.timezone !== undefined && { timezone: data.timezone }),
    };
    await this.prisma.user.update({ where: { id: userId }, data: allowed });
    return this.getMe(userId);
  }

  async getPublicProfile(username: string) {
    return this.prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        name: true,
        username: true,
        eventTypes: {
          where: { isActive: true },
          select: {
            id: true,
            title: true,
            description: true,
            duration: true,
            slug: true,
            locationType: true,
            maxGuests: true,
          },
        },
      },
    });
  }
}
