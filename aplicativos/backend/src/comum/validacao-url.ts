import { registerDecorator, ValidationOptions } from "class-validator";

export interface OpcoesUrlImagem {
  permitirDataUri?: boolean;
}

// Aceita apenas formatos raster seguros (PNG, JPEG, WebP, GIF, AVIF).
// SVG é intencionalmente excluído de data:image/ por riscos de XSS embutido.
const DATA_IMAGE_REGEX = /^data:image\/(?:png|jpeg|jpg|webp|gif|avif);base64,[A-Za-z0-9+/=]+$/i;

export function ehUrlDeImagemValida(valor: unknown, opcoes?: OpcoesUrlImagem): boolean {
  if (valor === null || valor === undefined) {
    return true;
  }
  if (typeof valor !== "string") {
    return false;
  }
  const limpo = valor.trim();
  if (limpo === "") {
    return true;
  }

  if (opcoes?.permitirDataUri && limpo.toLowerCase().startsWith("data:image/")) {
    return DATA_IMAGE_REGEX.test(limpo);
  }

  try {
    const parsed = new URL(limpo);
    if (parsed.protocol !== "https:") {
      return false;
    }
    return Boolean(parsed.hostname);
  } catch {
    return false;
  }
}

export function EhUrlDeImagem(opcoes?: OpcoesUrlImagem, validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: "ehUrlDeImagem",
      target: object.constructor,
      propertyName,
      options: {
        message: `${propertyName} deve ser uma URL HTTPS válida${opcoes?.permitirDataUri ? " ou uma imagem em formato Data URI segura (data:image/...)" : ""}.`,
        ...validationOptions
      },
      validator: {
        validate(value: unknown) {
          return ehUrlDeImagemValida(value, opcoes);
        }
      }
    });
  };
}
