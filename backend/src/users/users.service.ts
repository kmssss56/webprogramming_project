import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getMe(userId: string) {
    return this.prisma.user.findUnique({
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
  }

  async updateMe(userId: string, data: { name?: string; username?: string; timezone?: string }) {
    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        timezone: true,
        googleRefreshToken: true,
      },
    });
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
