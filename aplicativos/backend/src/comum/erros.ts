import { InternalServerErrorException } from "@nestjs/common";

export function falha(error: { message: string } | null): void {
  if (error) {
    throw new InternalServerErrorException(error.message);
  }
}
