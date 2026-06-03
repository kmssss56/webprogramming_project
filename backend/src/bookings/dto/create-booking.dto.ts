import { IsOptional, IsString } from 'class-validator';

export class CreateBookingDto {
  @IsString()
  eventTypeId: string;

  @IsString()
  startTime: string;

  @IsString()
  endTime: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  location?: string;
}
