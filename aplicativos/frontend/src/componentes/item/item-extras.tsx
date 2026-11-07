import type { CatalogExtras } from "../../lib/api";
import type { MediaType } from "../../lib/catalogo-api";
import { resolveProviderUrl } from "../../lib/provedores";
import { UiBadge } from "../ui-badge";

type ItemExtrasProps = {
  type: MediaType;
  title: string;
  extras: CatalogExtras | null;
};

export function ItemExtras({ type, title, extras }: ItemExtrasProps) {
  if (!extras || (extras.externalRatings.length === 0 && extras.watchProviders.length === 0)) {
    return null;
  }

  const verbWhere =
    type === "GAME" ? "Onde jogar" : type === "BOOK" ? "Onde ler" : "Onde assistir";

  return (
    <section className="content-panel item-extras-panel">
      {extras.externalRatings.length > 0 && (
        <div className="item-extras-block">
          <span className="eyebrow">Avaliações</span>
          <div className="status-chips">
            {extras.externalRatings.map((rating) => (
              <UiBadge key={rating.source} tone="primary">
                {rating.source}: {rating.value}
              </UiBadge>
            ))}
          </div>
        </div>
      )}

      {extras.watchProviders.length > 0 && (
        <div className="item-extras-block">
          <span className="eyebrow">{verbWhere}</span>
          <div className="status-chips">
            {extras.watchProviders.map((provider) => {
              const tag =
                provider.category === "RENT"
                  ? " (Aluguel)"
                  : provider.category === "BUY"
                    ? " (Compra)"
                    : "";
              const label = `${provider.name}${tag}`;
              const targetUrl = resolveProviderUrl(provider.name, title, provider.url);
              return (
                <a
                  key={`${provider.name}-${provider.category}`}
                  href={targetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="filter-chip"
                >
                  {label} ↗
                </a>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
