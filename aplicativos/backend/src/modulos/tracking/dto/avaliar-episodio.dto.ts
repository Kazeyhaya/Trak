import { Transform } from "class-transformer";
import { IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export class AvaliarEpisodioDto {
  @IsInt()
  @Min(0)
  season!: number;

  @IsInt()
  @Min(1)
  episode!: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0.5)
  @Max(5)
  rating?: number | null;

  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() || null : value))
  @IsString()
  @MaxLength(100)
  highlightCharacterId?: string | null;

  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() || null : value))
  @IsString()
  @MaxLength(200)
  highlightCharacterName?: string | null;

  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() || null : value))
  @IsString()
  @MaxLength(2000)
  highlightCharacterAvatar?: string | null;
}
