import { IsInt, Max, Min } from "class-validator";

// Quantas vezes o episodio foi assistido (1 = so a primeira vez). Valor absoluto, nao
// incremento: repetir a mesma requisicao nao conta duas vezes.
export class DefinirVezesEpisodioDto {
  @IsInt()
  @Min(0)
  @Max(200)
  season!: number;

  @IsInt()
  @Min(1)
  @Max(5000)
  episode!: number;

  @IsInt()
  @Min(1)
  @Max(99)
  times!: number;
}
