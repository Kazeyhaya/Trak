import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class ListarComentariosQueryDto {
  @IsString()
  @IsNotEmpty()
  mediaItemId!: string;

  @IsString()
  @IsOptional()
  userId?: string;
}
