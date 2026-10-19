import { IsBoolean, IsIn, IsOptional } from "class-validator";

export const STATUS_DENUNCIA = ["OPEN", "REVIEWING", "RESOLVED", "DISMISSED"] as const;

export type StatusDenuncia = (typeof STATUS_DENUNCIA)[number];

export class ModerarDenunciaDto {
  @IsIn(STATUS_DENUNCIA)
  status!: StatusDenuncia;

  // Remove (ou oculta) o comentario denunciado.
  @IsOptional()
  @IsBoolean()
  removerComentario?: boolean;
}
