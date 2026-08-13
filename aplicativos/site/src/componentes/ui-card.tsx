type UiCardProps = {
  children: React.ReactNode;
  className?: string;
  as?: "article" | "div";
};

export function UiCard({ children, className, as = "article" }: UiCardProps) {
  const Component = as;

  return <Component className={["ui-card", className].filter(Boolean).join(" ")}>{children}</Component>;
}