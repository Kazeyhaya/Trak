// Cache em memoria com validade e limite de entradas (sai a mais antiga).
// Pedidos iguais feitos ao mesmo tempo compartilham uma unica carga, e falhas
// (null/undefined) nao sao guardadas, para a proxima chamada tentar de novo.
export class CacheEmMemoria {
  private readonly itens = new Map<string, { expiraEm: number; valor: unknown }>();
  private readonly emAndamento = new Map<string, Promise<unknown>>();

  constructor(
    private readonly validadeMs: number,
    private readonly maxItens: number
  ) {}

  obter<T>(chave: string, carregar: () => Promise<T>): Promise<T> {
    const atual = this.itens.get(chave);
    if (atual && atual.expiraEm > Date.now()) {
      return Promise.resolve(atual.valor as T);
    }

    const pendente = this.emAndamento.get(chave);
    if (pendente) {
      return pendente as Promise<T>;
    }

    const promessa = carregar()
      .then((valor) => {
        if (valor !== null && valor !== undefined) {
          if (this.itens.size >= this.maxItens) {
            this.itens.delete(this.itens.keys().next().value as string);
          }
          this.itens.set(chave, { expiraEm: Date.now() + this.validadeMs, valor });
        }
        return valor;
      })
      .finally(() => this.emAndamento.delete(chave));
    this.emAndamento.set(chave, promessa);
    return promessa;
  }
}
