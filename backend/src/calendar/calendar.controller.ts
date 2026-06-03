import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { EventTypesService } from '../event-types/event-types.service';
import { AvailabilityService } from '../availability/availability.service';
import { PrismaService } from '../prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import dayjs from 'dayjs';

@Controller('calendar')
export class CalendarController {
  constructor(
    private calendarService: CalendarService,
    private eventTypesService: EventTypesService,
    private availabilityService: AvailabilityService,
    private prisma: PrismaService,
  ) {}

  @Get('slots/:username/:slug')
  async getAvailableSlots(
    @Param('username') username: string,
    @Param('slug') slug: string,
    @Query('date') date: string,
  ) {
    const eventType = await this.eventTypesService.findBySlug(username, slug);
    const host = eventType.user as any;

    const targetDate = dayjs(date);
    const dayOfWeek = targetDate.day();

    const availabilities = await this.availabilityService.getByUser(host.id);
    const avail = availabilities.find((a) => a.dayOfWeek === dayOfWeek);

    if (!avail) return { slots: [] };

    const timeMin = targetDate.startOf('day').toISOString();
    const timeMax = targetDate.endOf('day').toISOString();

    let hostBusy: { start: string; end: string }[] = [];
    if (host.googleRefreshToken) {
      hostBusy = await this.calendarService.getFreeBusy(host.googleRefreshToken, timeMin, timeMax);
    }

    const slots = this.calendarService.computeAvailableSlots(
      date,
      avail,
      eventType.duration,
      eventType.bufferTime,
      hostBusy,
      [],
    );

    return { slots, eventType, host: { name: host.name, username: host.username } };
  }

  @UseGuards(JwtAuthGuard)
  @Get('slots/:username/:slug/with-guest')
  async getAvailableSlotsWithGuest(
    @Param('username') username: string,
    @Param('slug') slug: string,
    @Query('date') date: string,
    @CurrentUser() guestUser: any,
  ) {
    const eventType = await this.eventTypesService.findBySlug(username, slug);
    const host = eventType.user as any;

    const targetDate = dayjs(date);
    const dayOfWeek = targetDate.day();

    const availabilities = await this.availabilityService.getByUser(host.id);
    const avail = availabilities.find((a) => a.dayOfWeek === dayOfWeek);

    if (!avail) return { slots: [] };

    const timeMin = targetDate.startOf('day').toISOString();
    const timeMax = targetDate.endOf('day').toISOString();

    let hostBusy: { start: string; end: string }[] = [];
    if (host.googleRefreshToken) {
      hostBusy = await this.calendarService.getFreeBusy(host.googleRefreshToken, timeMin, timeMax);
    }

    let guestBusy: { start: string; end: string }[] = [];
    const guest = await this.prisma.user.findUnique({ where: { id: guestUser.id } });
    if (guest?.googleRefreshToken) {
      guestBusy = await this.calendarService.getFreeBusy(guest.googleRefreshToken, timeMin, timeMax);
    }

    const slots = this.calendarService.computeAvailableSlots(
      date,
      avail,
      eventType.duration,
      eventType.bufferTime,
      hostBusy,
      guestBusy,
    );

    return { slots, eventType, host: { name: host.name, username: host.username } };
  }
}
