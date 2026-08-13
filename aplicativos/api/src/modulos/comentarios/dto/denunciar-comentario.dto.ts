import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class DenunciarComentarioDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  reason!: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  details?: string;
}
