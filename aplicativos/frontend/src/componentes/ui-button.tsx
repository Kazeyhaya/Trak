import Link from "next/link";

type UiButtonProps = {
  children: React.ReactNode;
  href?: string;
  variant?: "primary" | "secondary";
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
  pressed?: boolean;
  onClick?: () => void;
};

export function UiButton({
  children,
  href,
  variant = "primary",
  className,
  type = "button",
  disabled = false,
  pressed,
  onClick
}: UiButtonProps) {
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
    <button
      className={buttonClassName}
      type={type}
      disabled={disabled}
      aria-pressed={pressed}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
