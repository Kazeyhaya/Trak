import { Transform } from "class-transformer";
import { IsBoolean, IsDateString, IsIn, IsOptional, IsString, Matches, MaxLength } from "class-validator";

const aparar = ({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value);

// Envio parcial: cada secao das configuracoes manda so os proprios campos. O nome de
// usuario so e obrigatorio na primeira gravacao (quando ainda nao ha perfil).
export class SalvarPerfilDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim().toLowerCase() : value))
  @Matches(/^[a-z0-9_]{3,20}$/, {
    message: "O nome de usuario deve ter de 3 a 20 caracteres: letras minusculas, numeros ou _."
  })
  username?: string;

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

  // AAAA-MM-DD. So a propria pessoa ve; serve para liberar conteudo +18.
  @IsOptional()
  @IsDateString({ strict: true }, { message: "Informe a data de nascimento no formato AAAA-MM-DD." })
  birthDate?: string;

  // Mostrar conteudo +18 no catalogo. Exige 18 anos ou mais pela data de nascimento.
  @IsOptional()
  @IsBoolean()
  adultContent?: boolean;
}
