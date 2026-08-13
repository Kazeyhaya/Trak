import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class CriarComentarioDto {
  @IsString()
  @IsNotEmpty()
  mediaItemId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  content!: string;
}
