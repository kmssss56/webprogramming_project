import { Module } from '@nestjs/common';
import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';
import { EventTypesModule } from '../event-types/event-types.module';
import { PrismaService } from '../prisma.service';

@Module({
  imports: [EventTypesModule],
  controllers: [CalendarController],
  providers: [CalendarService, PrismaService],
  exports: [CalendarService],
})
export class CalendarModule {}
