import { IsNotEmpty, IsString } from "class-validator";

export class AdicionarFavoritoDto {
  @IsString()
  @IsNotEmpty()
  mediaItemId!: string;
}
