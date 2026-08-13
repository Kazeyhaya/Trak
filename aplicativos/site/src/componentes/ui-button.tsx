import Link from "next/link";

type UiButtonProps = {
  children: React.ReactNode;
  href?: string;
  variant?: "primary" | "secondary";
  className?: string;
};

export function UiButton({ children, href, variant = "primary", className }: UiButtonProps) {
  const buttonClassName = [
    variant === "primary" ? "primary-button" : "secondary-button",
    className
  ]
    .filter(Boolean)
    .join(" ");

  if (href) {
    return (
      <Link className={buttonClassName} href={href}>
        {children}
      </Link>
    );
  }

  return (
    <button className={buttonClassName} type="button">
      {children}
    </button>
  );
}