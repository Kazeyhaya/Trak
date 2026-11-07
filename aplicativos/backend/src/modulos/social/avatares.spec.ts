import { SupabaseClient } from "@supabase/supabase-js";

import { SupabaseService } from "../../comum/supabase/supabase.service";
import { criarSupabaseServiceMock } from "../../testes/supabase.mock";
import { CatalogoService } from "../catalogo/catalogo.service";
import { ArmazemAvatares } from "./avatares";
import { SocialService } from "./social.service";

const JPEG_PEQUENO = `data:image/jpeg;base64,${Buffer.from("foto de teste").toString("base64")}`;
const LINK = (caminho: string) => `https://projeto.supabase.co/storage/v1/object/public/avatars/${caminho}`;

function armazem() {
  const mock = criarSupabaseServiceMock();
  return { avatares: new ArmazemAvatares(() => mock.client as unknown as SupabaseClient), storage: mock.storage };
}

describe("ArmazemAvatares", () => {
  it("grava a foto em avatars/<userId>/<hash>.jpg e devolve o link publico", async () => {
    const { avatares, storage } = armazem();
    const link = await avatares.salvar("u1", JPEG_PEQUENO);

    const [caminho, bytes, opcoes] = storage.upload.mock.calls[0];
    expect(caminho).toMatch(/^u1\/[0-9a-f]{20}\.jpg$/);
    expect(Buffer.isBuffer(bytes) && bytes.toString()).toBe("foto de teste");
    expect(opcoes).toMatchObject({ contentType: "image/jpeg", upsert: true });
    expect(link).toBe(LINK(caminho));
  });

  it("recusa SVG e fotos acima de 200 KB", async () => {
    const { avatares, storage } = armazem();
    await expect(avatares.salvar("u1", "data:image/svg+xml;base64,PHN2Zz4=")).rejects.toMatchObject({ status: 400 });
    const grande = `data:image/png;base64,${Buffer.alloc(210 * 1024).toString("base64")}`;
    await expect(avatares.salvar("u1", grande)).rejects.toMatchObject({ status: 400 });
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it("sem o bucket (migracao nao aplicada), mantem o base64 em vez de falhar", async () => {
    const { avatares, storage } = armazem();
    storage.upload.mockResolvedValueOnce({ data: {}, error: { message: "Bucket not found" } });
    expect(await avatares.salvar("u1", JPEG_PEQUENO)).toBe(JPEG_PEQUENO);
  });

  it("so apaga arquivos do proprio bucket", async () => {
    const { avatares, storage } = armazem();
    await avatares.remover("https://outro-site.com/foto.jpg");
    await avatares.remover(JPEG_PEQUENO);
    expect(storage.remove).not.toHaveBeenCalled();

    await avatares.remover(LINK("u1/abc.jpg"));
    expect(storage.remove).toHaveBeenCalledWith(["u1/abc.jpg"]);
  });

  it("apaga todas as fotos da pessoa", async () => {
    const { avatares, storage } = armazem();
    storage.list.mockResolvedValueOnce({ data: [{ name: "a.jpg" }, { name: "b.png" }], error: null });
    await avatares.removerTodas("u1");
    expect(storage.remove).toHaveBeenCalledWith(["u1/a.jpg", "u1/b.png"]);
  });
});

describe("SocialService.salvarPerfil com foto", () => {
  it("guarda so o link e apaga a foto anterior", async () => {
    const mock = criarSupabaseServiceMock((op) => {
      if (op.table === "User" && op.action === "select") {
        return { data: { avatarUrl: LINK("u1/antiga.jpg") } };
      }
      if (op.table === "User" && op.action === "update") {
        return { data: { id: "u1", username: "ana", ...(op.payload as object) } };
      }
      return { data: null };
    });
    const service = new SocialService(
      mock.service as unknown as SupabaseService,
      { buscarSalvos: jest.fn(), duracoes: jest.fn() } as unknown as CatalogoService
    );

    await service.salvarPerfil("u1", { avatarUrl: JPEG_PEQUENO });

    const gravado = mock.chamadas.find((c) => c.table === "User" && c.action === "update")?.payload as {
      avatarUrl: string;
    };
    expect(gravado.avatarUrl).toMatch(/^https:\/\/projeto\.supabase\.co\/storage\/v1\/object\/public\/avatars\/u1\//);
    expect(mock.storage.remove).toHaveBeenCalledWith(["u1/antiga.jpg"]);
  });
});
