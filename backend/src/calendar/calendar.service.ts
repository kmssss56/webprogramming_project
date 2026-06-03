import { Injectable } from '@nestjs/common';
import { google } from 'googleapis';
import dayjs from 'dayjs';

@Injectable()
export class CalendarService {
  private getOAuthClient() {
    return new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI,
    );
  }

  private getCalendarClient(refreshToken: string) {
    const auth = this.getOAuthClient();
    auth.setCredentials({ refresh_token: refreshToken });
    return google.calendar({ version: 'v3', auth });
  }

  async getFreeBusy(refreshToken: string, timeMin: string, timeMax: string): Promise<{ start: string; end: string }[]> {
    const calendar = this.getCalendarClient(refreshToken);
    const res = await calendar.freebusy.query({
      requestBody: {
        timeMin,
        timeMax,
        items: [{ id: 'primary' }],
      },
    });
    return (res.data.calendars?.primary?.busy || []) as { start: string; end: string }[];
  }

  async createEvent(
    refreshToken: string,
    params: {
      title: string;
      startTime: string;
      endTime: string;
      description?: string;
      location?: string;
      withMeet?: boolean;
      attendeeEmail?: string;
    },
  ) {
    const calendar = this.getCalendarClient(refreshToken);

    const event: any = {
      summary: params.title,
      description: params.description,
      start: { dateTime: params.startTime, timeZone: 'Asia/Seoul' },
      end: { dateTime: params.endTime, timeZone: 'Asia/Seoul' },
    };

    if (params.location) event.location = params.location;

    if (params.attendeeEmail) {
      event.attendees = [{ email: params.attendeeEmail }];
    }

    if (params.withMeet) {
      event.conferenceData = {
        createRequest: { requestId: Math.random().toString(36).substring(2) },
      };
    }

    const res = await calendar.events.insert({
      calendarId: 'primary',
      conferenceDataVersion: params.withMeet ? 1 : 0,
      requestBody: event,
    });

    const meetLink = res.data.conferenceData?.entryPoints?.find(
      (e) => e.entryPointType === 'video',
    )?.uri;

    return { eventId: res.data.id, meetLink };
  }

  async deleteEvent(refreshToken: string, eventId: string) {
    const calendar = this.getCalendarClient(refreshToken);
    await calendar.events.delete({ calendarId: 'primary', eventId });
  }

  computeAvailableSlots(
    date: string,
    availability: { startTime: string; endTime: string } | null,
    duration: number,
    bufferTime: number,
    hostBusy: { start: string; end: string }[],
    guestBusy: { start: string; end: string }[],
  ): { start: string; end: string }[] {
    if (!availability) return [];

    const slots: { start: string; end: string }[] = [];
    const [startH, startM] = availability.startTime.split(':').map(Number);
    const [endH, endM] = availability.endTime.split(':').map(Number);

    let cursor = dayjs(date).hour(startH).minute(startM).second(0);
    const dayEnd = dayjs(date).hour(endH).minute(endM).second(0);
    const step = duration + bufferTime;

    const allBusy = [...hostBusy, ...guestBusy];

    while (cursor.add(duration, 'minute').isBefore(dayEnd) || cursor.add(duration, 'minute').isSame(dayEnd)) {
      const slotStart = cursor;
      const slotEnd = cursor.add(duration, 'minute');

      const overlaps = allBusy.some((b) => {
        const busyStart = dayjs(b.start);
        const busyEnd = dayjs(b.end);
        return slotStart.isBefore(busyEnd) && slotEnd.isAfter(busyStart);
      });

      if (!overlaps) {
        slots.push({ start: slotStart.toISOString(), end: slotEnd.toISOString() });
      }

      cursor = cursor.add(step, 'minute');
    }

    return slots;
  }
}
