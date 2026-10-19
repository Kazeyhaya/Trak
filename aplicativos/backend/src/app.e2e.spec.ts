import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { SupabaseService } from "./comum/supabase/supabase.service";

// Sobe a API de verdade (sem Supabase) e testa pela rede.
describe("API (e2e)", () => {
  let app: INestApplication;
  let base: string;

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(SupabaseService)
      .useValue({
        getClient: () => ({
          auth: { getUser: async () => ({ data: { user: null }, error: { message: "invalido" } }) }
        }),
        resolverUserId: async (id: string) => id
      })
      .compile();

    app = modulo.createNestApplication();
    app.use(helmet());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.setGlobalPrefix("api");
    await app.listen(0);
    base = `${await app.getUrl()}/api`.replace("[::1]", "localhost");
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /health responde com headers do helmet", async () => {
    const response = await fetch(`${base}/health`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok", service: "trak-api" });
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("x-powered-by")).toBeNull();
  });

  it.each(["/tracking", "/feed", "/recomendacoes", "/alertas", "/perfis/eu", "/moderacao/denuncias"])(
    "GET %s exige login",
    async (rota) => {
      expect((await fetch(`${base}${rota}`)).status).toBe(401);
    }
  );

  it("token invalido e recusado", async () => {
    const response = await fetch(`${base}/tracking`, { headers: { Authorization: "Bearer falso" } });
    expect(response.status).toBe(401);
  });

  it("listar comentarios e publico, mas valida a query", async () => {
    expect((await fetch(`${base}/comentarios`)).status).toBe(400);
  });

  it("item com id invalido da 404", async () => {
    expect((await fetch(`${base}/catalogo/nao-existe`)).status).toBe(404);
  });

  it("temporada nao numerica da 400", async () => {
    expect((await fetch(`${base}/catalogo/tmdb_series_1/temporadas/abc`)).status).toBe(400);
  });

  it("importacao tem limite de taxa (3 a cada 10 minutos)", async () => {
    const status: number[] = [];
    for (let i = 0; i < 4; i++) {
      status.push((await fetch(`${base}/importacao/steam`, { method: "POST" })).status);
    }
    expect(status).toEqual([401, 401, 401, 429]);
  });
});
