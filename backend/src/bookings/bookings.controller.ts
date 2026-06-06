import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('bookings')
export class BookingsController {
  constructor(private bookingsService: BookingsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateBookingDto) {
    return this.bookingsService.create(user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  getMyBookings(@CurrentUser() user: any, @Query('role') role: 'host' | 'guest' = 'guest') {
    return this.bookingsService.getMyBookings(user.id, role);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/cancel')
  cancel(@CurrentUser() user: any, @Param('id') id: string) {
    return this.bookingsService.cancel(user.id, id);
  }

  // 시간 조율 요청에서 호스트가 시간 하나를 골라 확정
  @UseGuards(JwtAuthGuard)
  @Patch(':id/confirm')
  confirm(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: { startTime: string; endTime: string },
  ) {
    return this.bookingsService.confirm(user.id, id, body.startTime, body.endTime);
  }
}
