import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { EventTypesService } from '../event-types/event-types.service';
import { PrismaService } from '../prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import dayjs from 'dayjs';

@Controller('calendar')
export class CalendarController {
  constructor(
    private calendarService: CalendarService,
    private eventTypesService: EventTypesService,
    private prisma: PrismaService,
  ) {}

  // 내 구글 캘린더 busy 구간 조회 — 미팅 만들 때 일정 있는 날 표시용 (정보 제공만)
  @UseGuards(JwtAuthGuard)
  @Get('my-busy')
  async getMyBusy(
    @CurrentUser() user: any,
    @Query('timeMin') timeMin: string,
    @Query('timeMax') timeMax: string,
  ) {
    const me = await this.prisma.user.findUnique({ where: { id: user.id } });
    const busy = await this.safeFreeBusy(me?.googleRefreshToken, timeMin, timeMax);
    return { busy };
  }

  @Get('slots/:username/:slug')
  async getAvailableSlots(
    @Param('username') username: string,
    @Param('slug') slug: string,
    @Query('date') date: string,
  ) {
    return this.buildSlotsResponse(username, slug, date);
  }

  @UseGuards(JwtAuthGuard)
  @Get('slots/:username/:slug/with-guest')
  async getAvailableSlotsWithGuest(
    @Param('username') username: string,
    @Param('slug') slug: string,
    @Query('date') date: string,
    @CurrentUser() guestUser: any,
  ) {
    return this.buildSlotsResponse(username, slug, date, guestUser.id);
  }

  private async buildSlotsResponse(username: string, slug: string, date: string, guestId?: string) {
    const eventType = await this.eventTypesService.findBySlug(username, slug);
    // 공개 응답에 토큰이 실리지 않도록 user 관계를 분리한다
    const { user: host, ...publicEventType } = eventType as any;
    const base = {
      eventType: publicEventType,
      host: { name: host.name, username: host.username },
    };

    const schedule = this.getScheduleForDate(eventType, date);
    if (!schedule) return { slots: [], ...base };

    const targetDate = dayjs(date);
    const timeMin = targetDate.startOf('day').toISOString();
    const timeMax = targetDate.endOf('day').toISOString();

    const hostBusy = await this.safeFreeBusy(host.googleRefreshToken, timeMin, timeMax);

    let guestBusy: { start: string; end: string }[] = [];
    if (guestId) {
      const guest = await this.prisma.user.findUnique({ where: { id: guestId } });
      guestBusy = await this.safeFreeBusy(guest?.googleRefreshToken, timeMin, timeMax);
    }

    const slots = this.calendarService.computeAvailableSlots(
      date,
      schedule,
      eventType.duration,
      eventType.bufferTime,
      hostBusy,
      guestBusy,
    );

    // 이미 확정된 예약을 슬롯에 표시 — 누가 언제 예약했는지 보이고, 정원 차면 마감 처리
    const confirmed = await this.prisma.booking.findMany({
      where: {
        eventTypeId: eventType.id,
        status: 'confirmed',
        startTime: { lt: targetDate.endOf('day').toDate() },
        endTime: { gt: targetDate.startOf('day').toDate() },
      },
      select: { startTime: true, endTime: true, guestName: true },
    });

    const enriched = slots.map((s) => {
      const bookedBy = confirmed
        .filter((b) => b.startTime < new Date(s.end) && b.endTime > new Date(s.start))
        .map((b) => b.guestName);
      return { ...s, bookedBy, full: bookedBy.length >= eventType.maxGuests };
    });

    return { slots: enriched, ...base };
  }

  // 미팅 타입 자체의 일정 설정으로 해당 날짜의 예약 가능 시간대를 결정한다
  private getScheduleForDate(eventType: any, date: string): { startTime: string; endTime: string } | null {
    if (eventType.dateMode === 'dates') {
      if (!eventType.dates?.includes(date)) return null;
    } else {
      // 요일 반복: 종료일이 지나면 예약 불가
      if (eventType.endDate && date > eventType.endDate) return null;
      const days = eventType.daysOfWeek?.length ? eventType.daysOfWeek : [1, 2, 3, 4, 5];
      if (!days.includes(dayjs(date).day())) return null;
    }
    return {
      startTime: eventType.timeStart || '09:00',
      endTime: eventType.timeEnd || '17:00',
    };
  }

  // 토큰 만료/철회 등으로 freebusy가 실패해도 슬롯 조회는 계속되도록 한다
  private async safeFreeBusy(refreshToken: string | null | undefined, timeMin: string, timeMax: string) {
    if (!refreshToken) return [];
    try {
      return await this.calendarService.getFreeBusy(refreshToken, timeMin, timeMax);
    } catch {
      return [];
    }
  }
}
