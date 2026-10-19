import { Transform } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export const STATUS_TRACKING = ["WANT", "WATCHING", "COMPLETED", "PAUSED", "DROPPED"] as const;

export type StatusTracking = (typeof STATUS_TRACKING)[number];

export class SalvarTrackingDto {
  @IsOptional()
  @IsIn(STATUS_TRACKING)
  status?: StatusTracking;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  progress?: number;

  // null remove a avaliacao.
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number | null;

  // null ou "" remove a nota.
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() || null : value))
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}
