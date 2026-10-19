import { Transform } from "class-transformer";
import { IsBoolean, IsOptional, IsString, Matches, MaxLength } from "class-validator";

const aparar = ({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value);

export class SalvarPerfilDto {
  @Transform(({ value }) => (typeof value === "string" ? value.trim().toLowerCase() : value))
  @Matches(/^[a-z0-9_]{3,20}$/, {
    message: "O nome de usuario deve ter de 3 a 20 caracteres: letras minusculas, numeros ou _."
  })
  username!: string;

  @IsOptional()
  @Transform(aparar)
  @IsString()
  @MaxLength(50)
  displayName?: string;

  @IsOptional()
  @Transform(aparar)
  @IsString()
  @MaxLength(280)
  bio?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
