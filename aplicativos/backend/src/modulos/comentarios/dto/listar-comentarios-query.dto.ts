import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class ListarComentariosQueryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  mediaItemId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  cursor?: string;
}
