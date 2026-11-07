import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class ListarComentariosQueryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  mediaItemId!: string;
}
