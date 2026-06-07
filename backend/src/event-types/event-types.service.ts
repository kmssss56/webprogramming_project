import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateEventTypeDto } from './dto/create-event-type.dto';

@Injectable()
export class EventTypesService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateEventTypeDto) {
    const slug = await this.generateUniqueSlug(userId, dto.slug || dto.title);
    return this.prisma.eventType.create({
      data: { ...dto, slug, userId },
    });
  }

  // 제목 기반 슬러그 자동 생성 — 한글 제목 등으로 비면 'meeting', 중복이면 -2, -3… 부여
  private async generateUniqueSlug(userId: string, source: string) {
    const base =
      source.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '') ||
      'meeting';
    let candidate = base;
    let n = 2;
    while (await this.prisma.eventType.findUnique({ where: { userId_slug: { userId, slug: candidate } } })) {
      candidate = `${base}-${n++}`;
    }
    return candidate;
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

  async update(userId: string, id: string, data: Partial<CreateEventTypeDto> & { isActive?: boolean; sharedAt?: Date | string }) {
    const existing = await this.findOne(userId, id);
    // 이미 공유된 미팅은 수정 금지 — 게스트가 보는 내용이 바뀌면 안 된다 (sharedAt 최초 기록만 허용)
    if (existing.sharedAt) {
      throw new BadRequestException('이미 공유된 미팅은 수정할 수 없어요.');
    }
    return this.prisma.eventType.update({ where: { id }, data });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    // 딸린 예약(조율 요청 포함)도 함께 삭제 — FK 제약으로 삭제가 막히지 않도록
    await this.prisma.$transaction([
      this.prisma.booking.deleteMany({ where: { eventTypeId: id } }),
      this.prisma.eventType.delete({ where: { id } }),
    ]);
    return { success: true };
  }
}
