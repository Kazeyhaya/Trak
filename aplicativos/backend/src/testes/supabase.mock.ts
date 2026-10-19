// Mock encadeavel do cliente Supabase para testes de servico.
// Cada consulta e registrada em `chamadas` e respondida por `responder`.

export type Operacao = {
  table: string;
  action: "select" | "insert" | "update" | "upsert" | "delete";
  payload?: unknown;
  options?: unknown;
  filtros: Array<[string, ...unknown[]]>;
  single: boolean;
};

export type Resposta = {
  data?: unknown;
  error?: { message: string; code?: string } | null;
  count?: number | null;
};

export function criarSupabaseMock(responder: (op: Operacao) => Resposta = () => ({ data: null })) {
  const chamadas: Operacao[] = [];

  function builder(table: string) {
    const op: Operacao = { table, action: "select", filtros: [], single: false };
    let acaoDefinida = false;

    const definir = (action: Operacao["action"], payload?: unknown, options?: unknown) => {
      if (!acaoDefinida) {
        op.action = action;
        op.payload = payload;
        op.options = options;
        acaoDefinida = true;
      }
      return proxy;
    };

    const executar = () => {
      chamadas.push(op);
      const resposta = responder(op);
      return { data: resposta.data ?? null, error: resposta.error ?? null, count: resposta.count ?? null };
    };

    const proxy: Record<string, unknown> = {
      select: (_campos?: string, options?: unknown) => (acaoDefinida ? proxy : definir("select", undefined, options)),
      insert: (payload: unknown) => definir("insert", payload),
      update: (payload: unknown) => definir("update", payload),
      upsert: (payload: unknown, options?: unknown) => definir("upsert", payload, options),
      delete: () => definir("delete"),
      single: () => {
        op.single = true;
        return proxy;
      },
      maybeSingle: () => {
        op.single = true;
        return proxy;
      },
      then: (resolve: (valor: unknown) => unknown, reject?: (erro: unknown) => unknown) =>
        Promise.resolve().then(executar).then(resolve, reject)
    };

    for (const filtro of ["eq", "in", "ilike", "order", "limit"]) {
      proxy[filtro] = (...args: unknown[]) => {
        op.filtros.push([filtro, ...args]);
        return proxy;
      };
    }

    return proxy;
  }

  const client = {
    from: (table: string) => builder(table),
    auth: { getUser: jest.fn() }
  };

  return { client, chamadas };
}

// SupabaseService falso: resolverUserId devolve o proprio id.
export function criarSupabaseServiceMock(responder?: (op: Operacao) => Resposta) {
  const mock = criarSupabaseMock(responder);
  return {
    ...mock,
    service: {
      getClient: () => mock.client,
      resolverUserId: jest.fn(async (id: string) => id)
    }
  };
}

// Filtro eq aplicado a uma operacao (ex.: valorDoFiltro(op, "userId")).
export function valorDoFiltro(op: Operacao, coluna: string) {
  return op.filtros.find(([metodo, nome]) => metodo === "eq" && nome === coluna)?.[2];
}
