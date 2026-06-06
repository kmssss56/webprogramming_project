import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CalendarService } from '../calendar/calendar.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import dayjs from 'dayjs';

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
    if (!eventType) throw new NotFoundException('미팅 타입을 찾을 수 없습니다.');

    const host = eventType.user;
    const guest = await this.prisma.user.findUnique({ where: { id: guestId } });

    const conflicting = await this.prisma.booking.findFirst({
      where: {
        eventTypeId: dto.eventTypeId,
        status: 'confirmed',
        startTime: { lt: new Date(dto.endTime) },
        endTime: { gt: new Date(dto.startTime) },
      },
    });
    if (conflicting) throw new BadRequestException('이미 예약된 시간입니다.');

    let meetLink: string | undefined;
    let hostEventId: string | undefined;
    let guestEventId: string | undefined;

    const eventTitle = `${eventType.title} - ${guest.name} & ${host.name}`;
    const description = dto.notes || '';

    if (host.googleRefreshToken) {
      const result = await this.calendarService.createEvent(host.googleRefreshToken, {
        title: eventTitle,
        startTime: dto.startTime,
        endTime: dto.endTime,
        description,
        location: dto.location,
        withMeet: eventType.locationType === 'online',
        attendeeEmail: guest.email,
      });
      meetLink = result.meetLink;
      hostEventId = result.eventId;
    }

    if (guest.googleRefreshToken) {
      const result = await this.calendarService.createEvent(guest.googleRefreshToken, {
        title: eventTitle,
        startTime: dto.startTime,
        endTime: dto.endTime,
        description,
        location: dto.location || meetLink,
        withMeet: false,
        attendeeEmail: host.email,
      });
      guestEventId = result.eventId;
    }

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
      await this.notificationsService.notifyBookingConfirmed(
        host.kakaoAccessToken,
        guest.kakaoAccessToken,
        {
          hostName: host.name,
          guestName: guest.name,
          title: eventType.title,
          startTime: dto.startTime,
          meetLink,
          location: dto.location,
        },
      );
    }

    return booking;
  }

  async getMyBookings(userId: string, role: 'host' | 'guest') {
    const where = role === 'host' ? { hostId: userId } : { guestId: userId };
    return this.prisma.booking.findMany({
      where,
      include: {
        eventType: { select: { title: true, duration: true, locationType: true } },
        host: { select: { name: true, username: true } },
        guest: { select: { name: true } },
      },
      orderBy: { startTime: 'asc' },
    });
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

    if (booking.host.kakaoAccessToken && booking.guest.kakaoAccessToken) {
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
    }

    return updated;
  }
}
