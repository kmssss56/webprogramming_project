import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { EventTypesService } from './event-types.service';
import { CreateEventTypeDto } from './dto/create-event-type.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { NotificationsService } from '../notifications/notifications.service';

@Controller('event-types')
export class EventTypesController {
  constructor(
    private eventTypesService: EventTypesService,
    private notificationsService: NotificationsService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateEventTypeDto) {
    return this.eventTypesService.create(user.id, dto);
  }

  // 예약 링크를 내 카카오톡(나에게 보내기)으로 전송 — 받아서 지인에게 전달
  @UseGuards(JwtAuthGuard)
  @Post(':id/share-kakao')
  async shareKakao(@CurrentUser() user: any, @Param('id') id: string) {
    const et = await this.eventTypesService.findOne(user.id, id);
    if (!user.kakaoAccessToken) throw new BadRequestException('카카오 토큰이 없습니다. 다시 로그인해주세요.');
    const url = `${process.env.FRONTEND_URL}/${encodeURIComponent(user.username)}/${et.slug}`;
    const ok = await this.notificationsService.sendKakaoLink(
      user.kakaoAccessToken,
      `[MeetLink] "${et.title}" 예약 링크예요.\n원하는 시간을 골라 예약해주세요!`,
      url,
    );
    if (!ok) throw new BadRequestException('카카오톡 전송에 실패했습니다. 다시 로그인 후 시도해주세요.');
    // 공유했으므로 시간 편집 잠금
    if (!et.sharedAt) await this.eventTypesService.update(user.id, id, { sharedAt: new Date() } as any);
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@CurrentUser() user: any) {
    return this.eventTypesService.findAllByUser(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.eventTypesService.findOne(user.id, id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() data: any) {
    return this.eventTypesService.update(user.id, id, data);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.eventTypesService.remove(user.id, id);
  }
}
