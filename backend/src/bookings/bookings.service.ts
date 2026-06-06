import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CalendarService } from '../calendar/calendar.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateBookingDto } from './dto/create-booking.dto';

@Injectable()
export class BookingsService {
  constructor(
    private prisma: PrismaService,
    private calendarService: CalendarService,
    private notificationsService: NotificationsService,
  ) {}

  async create(guestId: string, dto: CreateBookingDto) {
    const eventType = await this.prisma.eventType.findUnique({
      where: { id: dto.eventTypeId },
      include: { user: true },
    });
    if (!eventType) throw new NotFoundException('미팅을 찾을 수 없습니다.');

    const host = eventType.user;
    if (guestId === host.id) throw new BadRequestException('내 미팅은 직접 예약할 수 없어요. 링크를 게스트에게 공유해주세요.');

    const guest = await this.prisma.user.findUnique({ where: { id: guestId } });

    // 시간 조율 모드: 후보 시간들을 pending으로 저장, 호스트가 확정해야 캘린더에 들어간다
    if (eventType.confirmMode === 'poll') {
      if (!dto.proposedTimes?.length) throw new BadRequestException('가능한 시간을 한 개 이상 선택해주세요.');

      const first = dto.proposedTimes[0];
      const booking = await this.prisma.booking.create({
        data: {
          eventTypeId: dto.eventTypeId,
          hostId: host.id,
          guestId,
          startTime: new Date(first.start),
          endTime: new Date(first.end),
          status: 'pending',
          proposedTimes: dto.proposedTimes as any,
          location: dto.location,
          notes: dto.notes,
          guestName: guest.name,
          guestEmail: guest.email,
        },
      });

      // 참가 인원이 모두 시간을 보냈으면 호스트+참가자 전원에게, 아니면 호스트에게만 알림
      const allRequests = await this.prisma.booking.findMany({
        where: { eventTypeId: dto.eventTypeId, status: { in: ['pending', 'confirmed'] } },
        include: { guest: { select: { kakaoAccessToken: true } } },
      });
      if (allRequests.length >= eventType.maxGuests) {
        const guestMsg = `[MeetLink] "${eventType.title}" 참가자 전원이 가능한 시간을 보냈어요!\n호스트가 시간을 확정하면 알려드릴게요.`;
        const hostMsg = `[MeetLink] "${eventType.title}" 참가자 전원(${allRequests.length}명)이 가능한 시간을 보냈어요!\n미팅 목록에서 시간을 골라 확정해주세요.`;
        await Promise.all([
          host.kakaoAccessToken ? this.notificationsService.sendKakaoMessage(host.kakaoAccessToken, hostMsg) : Promise.resolve(),
          ...allRequests.map((b) =>
            b.guest?.kakaoAccessToken
              ? this.notificationsService.sendKakaoMessage(b.guest.kakaoAccessToken, guestMsg)
              : Promise.resolve(),
          ),
        ]);
      } else if (host.kakaoAccessToken) {
        await this.notificationsService.notifyBookingRequested(host.kakaoAccessToken, {
          guestName: guest.name,
          title: eventType.title,
          count: dto.proposedTimes.length,
        });
      }
      return booking;
    }

    // 바로 확정 모드
    if (!dto.startTime || !dto.endTime) throw new BadRequestException('예약 시간을 선택해주세요.');

    const conflicting = await this.prisma.booking.findMany({
      where: {
        eventTypeId: dto.eventTypeId,
        status: 'confirmed',
        startTime: { lt: new Date(dto.endTime) },
        endTime: { gt: new Date(dto.startTime) },
      },
    });
    if (conflicting.length >= eventType.maxGuests) throw new BadRequestException('이미 마감된 시간입니다.');

    const { meetLink } = await this.createCalendarEvents(host, guest, eventType, dto.startTime, dto.endTime, dto.notes, dto.location);

    const booking = await this.prisma.booking.create({
      data: {
        eventTypeId: dto.eventTypeId,
        hostId: host.id,
        guestId,
        startTime: new Date(dto.startTime),
        endTime: new Date(dto.endTime),
        status: 'confirmed',
        meetLink,
        location: dto.location,
        notes: dto.notes,
        guestName: guest.name,
        guestEmail: guest.email,
      },
    });

    if (host.kakaoAccessToken && guest.kakaoAccessToken) {
      await this.notificationsService.notifyBookingConfirmed(host.kakaoAccessToken, guest.kakaoAccessToken, {
        hostName: host.name,
        guestName: guest.name,
        title: eventType.title,
        startTime: dto.startTime,
        meetLink,
        location: dto.location,
      });
    }

    return booking;
  }

  // 호스트가 조율 요청에서 시간 하나를 골라 확정
  async confirm(hostId: string, bookingId: string, startTime: string, endTime: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, hostId, status: 'pending' },
      include: { host: true, guest: true, eventType: true },
    });
    if (!booking) throw new NotFoundException('확정할 조율 요청이 없습니다.');

    const proposed = (booking.proposedTimes as any[]) || [];
    if (!proposed.some((t) => t.start === startTime)) {
      throw new BadRequestException('게스트가 제안한 시간 중에서 선택해주세요.');
    }

    // 정원 체크: 같은 시간에 이미 확정된 인원이 동시 예약 인원에 도달하면 마감
    const confirmedAtTime = await this.prisma.booking.count({
      where: {
        eventTypeId: booking.eventTypeId,
        status: 'confirmed',
        startTime: { lt: new Date(endTime) },
        endTime: { gt: new Date(startTime) },
      },
    });
    if (confirmedAtTime >= booking.eventType.maxGuests) {
      throw new BadRequestException('이 시간은 정원이 마감됐어요. 다른 시간을 선택해주세요.');
    }

    const { meetLink } = await this.createCalendarEvents(
      booking.host, booking.guest, booking.eventType, startTime, endTime, booking.notes, booking.location,
    );

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'confirmed', startTime: new Date(startTime), endTime: new Date(endTime), meetLink },
    });

    if (booking.host.kakaoAccessToken && booking.guest.kakaoAccessToken) {
      await this.notificationsService.notifyBookingConfirmed(
        booking.host.kakaoAccessToken, booking.guest.kakaoAccessToken,
        {
          hostName: booking.host.name,
          guestName: booking.guest.name,
          title: booking.eventType.title,
          startTime,
          meetLink,
          location: booking.location || undefined,
        },
      );
    }

    return updated;
  }

  // 양측 구글 캘린더에 이벤트 생성 (연동된 쪽만, 온라인이면 Meet 자동 생성)
  private async createCalendarEvents(
    host: any, guest: any, eventType: any,
    startTime: string, endTime: string,
    notes?: string | null, location?: string | null,
  ): Promise<{ meetLink?: string }> {
    const eventTitle = `${eventType.title} - ${guest.name} & ${host.name}`;
    // 캘린더 이벤트 설명 = 미팅 설명 + 게스트 메모
    const description = [eventType.description, notes].filter(Boolean).join('\n\n');

    let meetLink: string | undefined;

    if (host.googleRefreshToken) {
      const result = await this.calendarService.createEvent(host.googleRefreshToken, {
        title: eventTitle,
        startTime,
        endTime,
        description,
        location: location || undefined,
        withMeet: eventType.locationType === 'online',
        attendeeEmail: guest.email,
      });
      meetLink = result.meetLink;
    }

    if (guest.googleRefreshToken) {
      await this.calendarService.createEvent(guest.googleRefreshToken, {
        title: eventTitle,
        startTime,
        endTime,
        description,
        location: location || meetLink,
        withMeet: false,
        attendeeEmail: host.email,
      });
    }

    return { meetLink };
  }

  async getMyBookings(userId: string, role: 'host' | 'guest') {
    const where = role === 'host' ? { hostId: userId } : { guestId: userId };
    const bookings = await this.prisma.booking.findMany({
      where,
      include: {
        eventType: { select: { title: true, duration: true, locationType: true, confirmMode: true } },
        host: { select: { name: true, username: true } },
        guest: { select: { name: true } },
      },
      orderBy: { startTime: 'asc' },
    });

    // 호스트: 조율 대기 건의 제안 시간마다 내 구글 캘린더와 겹치는지 표시
    // (대기 건이 있을 때만 유저 조회 + freebusy 호출 — 불필요한 지연 방지)
    const pendingExists = role === 'host' && bookings.some((b) => b.status === 'pending' && (b.proposedTimes as any[])?.length);
    if (pendingExists) {
      const me = await this.prisma.user.findUnique({ where: { id: userId } });
      const pending = bookings.filter((b) => b.status === 'pending' && (b.proposedTimes as any[])?.length);
      if (me?.googleRefreshToken && pending.length) {
        const all = pending.flatMap((b) => b.proposedTimes as any[]);
        const timeMin = all.reduce((m, t) => (t.start < m ? t.start : m), all[0].start);
        const timeMax = all.reduce((m, t) => (t.end > m ? t.end : m), all[0].end);
        let busy: { start: string; end: string }[] = [];
        try {
          busy = await this.calendarService.getFreeBusy(me.googleRefreshToken, timeMin, timeMax);
        } catch {
          // freebusy 실패 시 충돌 표시 없이 목록은 정상 반환
        }
        for (const b of pending) {
          (b as any).proposedTimes = (b.proposedTimes as any[]).map((t) => ({
            ...t,
            busy: busy.some((bz) => new Date(bz.start) < new Date(t.end) && new Date(bz.end) > new Date(t.start)),
          }));
        }
      }
    }

    return bookings;
  }

  async cancel(userId: string, bookingId: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, OR: [{ hostId: userId }, { guestId: userId }] },
      include: {
        host: true,
        guest: true,
        eventType: { select: { title: true } },
      },
    });
    if (!booking) throw new NotFoundException();

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'cancelled' },
    });

    if (booking.status === 'confirmed' && booking.host.kakaoAccessToken && booking.guest.kakaoAccessToken) {
      await this.notificationsService.notifyBookingCancelled(
        booking.host.kakaoAccessToken,
        booking.guest.kakaoAccessToken,
        {
          title: booking.eventType.title,
          startTime: booking.startTime.toISOString(),
          hostName: booking.host.name,
          guestName: booking.guest.name,
        },
      );
    } else if (booking.status === 'pending') {
      // 조율 중 취소: 상대방에게 카톡 알림
      const cancelledByHost = userId === booking.hostId;
      const otherToken = cancelledByHost ? booking.guest.kakaoAccessToken : booking.host.kakaoAccessToken;
      const who = cancelledByHost ? `호스트(${booking.host.name})` : `게스트(${booking.guest.name})`;
      if (otherToken) {
        await this.notificationsService.sendKakaoMessage(
          otherToken,
          `[MeetLink] "${booking.eventType.title}" 시간 조율 요청이 ${who}에 의해 취소되었습니다.`,
        );
      }
    }

    return updated;
  }
}
