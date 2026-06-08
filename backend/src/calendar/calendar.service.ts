import { Injectable } from '@nestjs/common';
import { google } from 'googleapis';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { decryptToken } from '../common/token-crypto';

dayjs.extend(utc);
dayjs.extend(timezone);

// 슬롯 시간은 항상 한국 기준 — 서버 타임존(Render=UTC)에 휘둘리지 않게 한다
const KST = 'Asia/Seoul';

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
    // DB에 암호화 저장된 토큰을 사용 시점에 복호화 (평문 레거시도 호환)
    auth.setCredentials({ refresh_token: decryptToken(refreshToken) });
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

  // 소프트 블락: 캘린더 일정과 겹치는 슬롯도 제외하지 않고 busy 플래그로 표시만 한다.
  // 게스트는 겹치는 시간임을 보면서도 예약할 수 있다 (기존 일정을 옮기고 잡는 경우).
  computeAvailableSlots(
    date: string,
    availability: { startTime: string; endTime: string } | null,
    duration: number,
    bufferTime: number,
    hostBusy: { start: string; end: string }[],
    guestBusy: { start: string; end: string }[],
  ): { start: string; end: string; busy: boolean }[] {
    if (!availability) return [];

    const slots: { start: string; end: string; busy: boolean }[] = [];
    const [startH, startM] = availability.startTime.split(':').map(Number);
    const [endH, endM] = availability.endTime.split(':').map(Number);

    let cursor = dayjs.tz(date, KST).hour(startH).minute(startM).second(0).millisecond(0);
    const dayEnd = dayjs.tz(date, KST).hour(endH).minute(endM).second(0).millisecond(0);
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

      slots.push({ start: slotStart.toISOString(), end: slotEnd.toISOString(), busy: overlaps });

      cursor = cursor.add(step, 'minute');
    }

    return slots;
  }
}
