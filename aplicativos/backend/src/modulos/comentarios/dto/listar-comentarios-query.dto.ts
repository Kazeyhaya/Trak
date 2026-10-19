import { IsNotEmpty, IsString } from "class-validator";

export class ListarComentariosQueryDto {
  @IsString()
  @IsNotEmpty()
  mediaItemId!: string;
}
