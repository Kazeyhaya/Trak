import Image from "next/image";
import Link from "next/link";

import { UiCard } from "./ui-card";
import { Activity } from "../lib/api";
import { descreverAtividade, tempoRelativo } from "../lib/atividades";

type ActivityListProps = {
  items: Activity[];
  // No perfil o autor e sempre o mesmo, entao o nome e omitido.
  showAuthor?: boolean;
};

export function ActivityList({ items, showAuthor = true }: ActivityListProps) {
  return (
    <ol className="activity-list">
      {items.map((atividade) => (
        <li key={atividade.id}>
          <UiCard className="activity-item">
            {atividade.item?.coverUrl && (
              <Image className="timeline-cover" src={atividade.item.coverUrl} alt="" width={56} height={84} />
            )}
            <div>
              <p>
                {showAuthor && (
                  <>
                    {atividade.user ? (
                      <Link href={`/u/${atividade.user.username}`}>
                        {atividade.user.displayName || `@${atividade.user.username}`}
                      </Link>
                    ) : (
                      "Você"
                    )}{" "}
                  </>
                )}
                {descreverAtividade(atividade)}{" "}
                {atividade.mediaItemId && (
                  <Link href={`/itens/${atividade.mediaItemId}`}>{atividade.item?.title ?? "um item"}</Link>
                )}
              </p>
              <time dateTime={atividade.createdAt}>{tempoRelativo(atividade.createdAt)}</time>
            </div>
          </UiCard>
        </li>
      ))}
    </ol>
  );
}
