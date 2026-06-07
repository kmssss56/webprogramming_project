import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ProposedTimeDto {
  @IsString()
  start: string;

  @IsString()
  end: string;
}

export class CreateBookingDto {
  @IsString()
  eventTypeId: string;

  // instant 모드: 확정할 시간 (poll 모드에서는 생략 가능)
  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;

  // poll 모드: 게스트가 제안하는 후보 시간들
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProposedTimeDto)
  proposedTimes?: ProposedTimeDto[];

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  location?: string;
}
