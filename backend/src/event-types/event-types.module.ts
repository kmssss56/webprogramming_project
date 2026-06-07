import { Module } from '@nestjs/common';
import { EventTypesController } from './event-types.controller';
import { EventTypesService } from './event-types.service';
import { PrismaService } from '../prisma.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [EventTypesController],
  providers: [EventTypesService, PrismaService],
  exports: [EventTypesService],
})
export class EventTypesModule {}
