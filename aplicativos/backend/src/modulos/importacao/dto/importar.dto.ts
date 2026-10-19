import { IsIn, IsNotEmpty, IsString, MaxLength } from "class-validator";
import { LISTAS_LETTERBOXD, ListaLetterboxd } from "../importacao.parsers";

const LIMITE_ARQUIVO = 5_000_000;

export class ImportarLetterboxdDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(LIMITE_ARQUIVO)
  csv!: string;

  @IsIn(LISTAS_LETTERBOXD)
  lista!: ListaLetterboxd;
}

export class ImportarTraktDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(LIMITE_ARQUIVO)
  json!: string;
}

export class ImportarSteamDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  perfil!: string;
}
