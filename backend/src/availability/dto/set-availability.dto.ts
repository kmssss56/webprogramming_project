import { IsArray, IsInt, IsString, Max, Min } from 'class-validator';

export class AvailabilitySlotDto {
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @IsString()
  startTime: string;

  @IsString()
  endTime: string;
}

export class SetAvailabilityDto {
  @IsArray()
  slots: AvailabilitySlotDto[];
}
