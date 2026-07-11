import Link from "next/link";

type Variant = "primary" | "secondary";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex cursor-pointer items-center justify-center font-semibold transition-transform hover:scale-105";

const variants: Record<Variant, string> = {
  primary: "rounded-full bg-orange-400 text-zinc-950 hover:bg-orange-500",
  secondary:
    "text-orange-500 underline decoration-2 underline-offset-4 hover:text-orange-600",
};

const paddingBySize: Record<Size, string> = {
  sm: "px-5 py-2",
  md: "px-7 py-3",
  lg: "px-8 py-4",
};

const textBySize: Record<Size, string> = {
  sm: "text-sm",
  md: "text-sm",
  lg: "text-base",
};

type ButtonProps = {
  children: React.ReactNode;
  variant?: Variant;
  size?: Size;
  href?: string;
  className?: string;
  pageTransition?: boolean;
  target?: string;
  rel?: string;
  onClick?: () => void;
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  href,
  className = "",
  pageTransition = false,
  target,
  rel,
  onClick,
}: ButtonProps) {
  const padding = variant === "primary" ? paddingBySize[size] : "";
  const classes = `${base} ${variants[variant]} ${padding} ${textBySize[size]} ${className}`;

  if (href) {
    return (
      <Link
        href={href}
        className={classes}
        target={target}
        rel={rel}
        data-page-transition={pageTransition ? "true" : undefined}
        onClick={onClick}
      >
        {children}
      </Link>
    );
  }

  return (
    <button type="button" className={classes} onClick={onClick}>
      {children}
    </button>
  );
}
