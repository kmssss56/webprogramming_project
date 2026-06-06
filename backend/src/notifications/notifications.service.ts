import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import { decryptToken } from '../common/token-crypto';

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
            Authorization: `Bearer ${decryptToken(accessToken)}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );
    } catch (e) {
      this.logger.warn('카카오톡 알림 전송 실패:', e.message);
    }
  }

  // 예약 링크를 내 카카오톡(나에게 보내기)으로 전송. 공유 버튼용이라 실패를 호출자에 알린다.
  async sendKakaoLink(accessToken: string, text: string, url: string): Promise<boolean> {
    try {
      await axios.post(
        'https://kapi.kakao.com/v2/api/talk/memo/default/send',
        new URLSearchParams({
          template_object: JSON.stringify({
            object_type: 'text',
            text: `${text}\n${url}`,
            link: { web_url: url, mobile_web_url: url },
            button_title: '예약 페이지 열기',
          }),
        }),
        {
          headers: {
            Authorization: `Bearer ${decryptToken(accessToken)}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );
      return true;
    } catch (e) {
      this.logger.warn('카카오톡 링크 전송 실패:', e.response?.data || e.message);
      return false;
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

  // 시간 조율 요청 도착 알림 (호스트에게)
  async notifyBookingRequested(
    hostToken: string,
    params: { guestName: string; title: string; count: number },
  ) {
    const msg = `[MeetLink] 시간 조율 요청이 도착했어요!\n\n미팅: ${params.title}\n게스트: ${params.guestName}\n제안한 시간: ${params.count}개\n\n미팅 목록에서 시간을 골라 확정해주세요.`;
    await this.sendKakaoMessage(hostToken, msg);
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
