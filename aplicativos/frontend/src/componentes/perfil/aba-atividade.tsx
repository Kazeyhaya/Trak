import type { Activity } from "../../lib/api";
import { ActivityList } from "../activity-list";
import { SectionHeading } from "../section-heading";

type AbaAtividadeProps = {
  activity: Activity[];
};

export function AbaAtividade({ activity }: AbaAtividadeProps) {
  return (
    <section className="content-panel">
      <SectionHeading title="Histórico de atividades" />
      {activity.length > 0 ? (
        <ActivityList items={activity} showAuthor={false} />
      ) : (
        <p className="panel-note">Nenhuma atividade ainda.</p>
      )}
    </section>
  );
}
