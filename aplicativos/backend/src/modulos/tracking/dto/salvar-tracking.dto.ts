import { IsBoolean, IsIn, IsInt, IsOptional, Max, Min } from "class-validator";

export const STATUS_TRACKING = ["WANT", "WATCHING", "COMPLETED", "PAUSED"] as const;

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

  @IsOptional()
  @IsBoolean()
  favorite?: boolean;
}
