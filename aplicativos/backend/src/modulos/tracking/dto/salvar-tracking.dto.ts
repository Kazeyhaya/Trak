import { Transform } from "class-transformer";
import { IsIn, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

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

  // null remove a avaliacao. Aceita notas inteiras e fracionadas (ex: 0.5 a 5.0).
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0.5)
  @Max(5)
  rating?: number | null;

  // null ou "" remove a nota.
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() || null : value))
  @IsString()
  @MaxLength(1000)
  notes?: string | null;

  // Paginas lidas e total da edicao: pertencem ao tracking do usuario, nao a obra.
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(50000)
  pagesRead?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(50000)
  totalPages?: number;
}
