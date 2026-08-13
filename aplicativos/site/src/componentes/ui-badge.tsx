type UiBadgeProps = {
  children: React.ReactNode;
  tone?: "primary" | "secondary" | "neutral";
  className?: string;
};

export function UiBadge({ children, tone = "neutral", className }: UiBadgeProps) {
  const toneClassName =
    tone === "primary" ? "ui-badge--primary" : tone === "secondary" ? "ui-badge--secondary" : "ui-badge--neutral";

  return <span className={["ui-badge", toneClassName, className].filter(Boolean).join(" ")}>{children}</span>;
}