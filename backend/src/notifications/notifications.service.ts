import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';

dayjs.locale('ko');

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  async sendKakaoMessage(accessToken: string, message: string) {
    try {
      await axios.post(
        'https://kapi.kakao.com/v2/api/talk/memo/default/send',
        new URLSearchParams({
          template_object: JSON.stringify({
            object_type: 'text',
            text: message,
            link: { web_url: process.env.FRONTEND_URL, mobile_web_url: process.env.FRONTEND_URL },
          }),
        }),
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );
    } catch (e) {
      this.logger.warn('카카오톡 알림 전송 실패:', e.message);
    }
  }

  async notifyBookingConfirmed(
    hostToken: string,
    guestToken: string,
    params: {
      hostName: string;
      guestName: string;
      title: string;
      startTime: string;
      meetLink?: string;
      location?: string;
    },
  ) {
    const timeStr = dayjs(params.startTime).format('YYYY년 MM월 DD일 (ddd) HH:mm');
    const where = params.meetLink
      ? `온라인 (Google Meet)\n${params.meetLink}`
      : params.location || '장소 미정';

    const hostMsg = `[MeetLink] 새 예약이 확정되었습니다!\n\n미팅: ${params.title}\n게스트: ${params.guestName}\n일시: ${timeStr}\n장소: ${where}`;
    const guestMsg = `[MeetLink] 예약이 확정되었습니다!\n\n미팅: ${params.title}\n호스트: ${params.hostName}\n일시: ${timeStr}\n장소: ${where}`;

    await Promise.all([
      this.sendKakaoMessage(hostToken, hostMsg),
      this.sendKakaoMessage(guestToken, guestMsg),
    ]);
  }

  async notifyBookingCancelled(
    hostToken: string,
    guestToken: string,
    params: { title: string; startTime: string; hostName: string; guestName: string },
  ) {
    const timeStr = dayjs(params.startTime).format('YYYY년 MM월 DD일 (ddd) HH:mm');
    const hostMsg = `[MeetLink] 예약이 취소되었습니다.\n\n미팅: ${params.title}\n게스트: ${params.guestName}\n일시: ${timeStr}`;
    const guestMsg = `[MeetLink] 예약이 취소되었습니다.\n\n미팅: ${params.title}\n호스트: ${params.hostName}\n일시: ${timeStr}`;

    await Promise.all([
      this.sendKakaoMessage(hostToken, hostMsg),
      this.sendKakaoMessage(guestToken, guestMsg),
    ]);
  }
}
