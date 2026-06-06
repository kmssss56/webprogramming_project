import { IsInt, IsOptional, IsString, Min } from 'class-validator';

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

  @IsString()
  slug: string;

  @IsOptional()
  @IsString()
  locationType?: string;
}
