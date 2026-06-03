import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { SetAvailabilityDto } from './dto/set-availability.dto';

@Injectable()
export class AvailabilityService {
  constructor(private prisma: PrismaService) {}

  async getByUser(userId: string) {
    return this.prisma.availability.findMany({
      where: { userId },
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  async set(userId: string, dto: SetAvailabilityDto) {
    await this.prisma.availability.deleteMany({ where: { userId } });
    await this.prisma.availability.createMany({
      data: dto.slots.map((s) => ({ ...s, userId })),
    });
    return this.getByUser(userId);
  }
}
