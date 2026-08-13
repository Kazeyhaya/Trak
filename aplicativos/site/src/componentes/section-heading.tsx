import { UiBadge } from "./ui-badge";

type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function SectionHeading({ eyebrow, title, description }: SectionHeadingProps) {
  return (
    <div className="section-heading">
      <UiBadge tone="secondary">{eyebrow}</UiBadge>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}