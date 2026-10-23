import { ArrayMaxSize, IsArray, IsString } from "class-validator";

export class ReordenarFavoritosDto {
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  mediaItemIds!: string[];
}
