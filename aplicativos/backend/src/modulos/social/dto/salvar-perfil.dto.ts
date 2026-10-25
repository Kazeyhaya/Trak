import { Transform } from "class-transformer";
import { IsBoolean, IsIn, IsOptional, IsString, Matches, MaxLength } from "class-validator";

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

  @IsOptional()
  @Transform(aparar)
  @IsString()
  @MaxLength(60000)
  avatarUrl?: string;

  @IsOptional()
  @Transform(aparar)
  @IsString()
  @MaxLength(500)
  bannerUrl?: string;

  @IsOptional()
  @Transform(aparar)
  @IsString()
  @MaxLength(30)
  theme?: string;

  @IsOptional()
  @IsIn(["pt-BR", "en-US"], {
    message: "O idioma deve ser pt-BR ou en-US."
  })
  language?: "pt-BR" | "en-US";
}
