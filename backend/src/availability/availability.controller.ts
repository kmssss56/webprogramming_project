import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { SetAvailabilityDto } from './dto/set-availability.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('availability')
export class AvailabilityController {
  constructor(private availabilityService: AvailabilityService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  get(@CurrentUser() user: any) {
    return this.availabilityService.getByUser(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Put()
  set(@CurrentUser() user: any, @Body() dto: SetAvailabilityDto) {
    return this.availabilityService.set(user.id, dto);
  }
}
