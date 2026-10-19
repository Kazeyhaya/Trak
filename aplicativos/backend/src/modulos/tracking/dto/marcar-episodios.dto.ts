import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsInt, Max, Min } from "class-validator";

export class MarcarEpisodiosDto {
  @IsInt()
  @Min(0)
  @Max(200)
  season!: number;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(5000, { each: true })
  episodes!: number[];

  @IsBoolean()
  watched!: boolean;
}
