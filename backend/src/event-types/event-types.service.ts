import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateEventTypeDto } from './dto/create-event-type.dto';

@Injectable()
export class EventTypesService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateEventTypeDto) {
    const existing = await this.prisma.eventType.findUnique({
      where: { userId_slug: { userId, slug: dto.slug } },
    });
    if (existing) throw new ConflictException('이미 사용 중인 슬러그입니다.');

    return this.prisma.eventType.create({
      data: { ...dto, userId },
    });
  }

  async findAllByUser(userId: string) {
    return this.prisma.eventType.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(userId: string, id: string) {
    const et = await this.prisma.eventType.findFirst({
      where: { id, userId },
    });
    if (!et) throw new NotFoundException();
    return et;
  }

  async findBySlug(username: string, slug: string) {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');

    const et = await this.prisma.eventType.findUnique({
      where: { userId_slug: { userId: user.id, slug } },
      include: { user: { select: { id: true, name: true, username: true, googleRefreshToken: true } } },
    });
    if (!et || !et.isActive) throw new NotFoundException('미팅 타입을 찾을 수 없습니다.');
    return et;
  }

  async update(userId: string, id: string, data: Partial<CreateEventTypeDto> & { isActive?: boolean }) {
    await this.findOne(userId, id);
    return this.prisma.eventType.update({ where: { id }, data });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    return this.prisma.eventType.delete({ where: { id } });
  }
}
