import { IsArray, IsIn, IsInt, IsOptional, IsString, Matches, Min } from 'class-validator';

export class CreateEventTypeDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  @Min(15)
  duration: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  bufferTime?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxGuests?: number;

  // 미입력 시 서버가 제목 기반으로 자동 생성 (중복 시 번호 부여)
  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  locationType?: string;

  // 일정 형식 (OneTime 스타일)
  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/)
  timeStart?: string;

  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/)
  timeEnd?: string;

  @IsOptional()
  @IsIn(['days', 'dates'])
  dateMode?: string;

  @IsOptional()
  @IsArray()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { each: true })
  dates?: string[];

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  daysOfWeek?: number[];

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  endDate?: string;

  @IsOptional()
  @IsIn(['instant', 'poll'])
  confirmMode?: string;

  // 호스트 그리드 편집: 막은 칸 / 일정 무시하고 연 칸 (슬롯 시작시각 ISO)
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  blockedTimes?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  openedTimes?: string[];
}
