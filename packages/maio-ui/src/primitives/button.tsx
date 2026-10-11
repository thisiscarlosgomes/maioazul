import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "ink" | "light" | "white";
type Size = "default" | "small";

function classes(variant: Variant, size: Size, className?: string) {
  return ["maio-button", variant === "light" ? "maio-button-light" : "", variant === "white" ? "maio-button-white" : "", size === "small" ? "maio-button-small" : "", className ?? ""]
    .filter(Boolean)
    .join(" ");
}

type Shared = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
};

type AsLink = Shared & { href: string } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "className" | "children" | "href">;
type AsButton = Shared & { href?: undefined } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">;

export function Button(props: AsLink | AsButton) {
  const variant = props.variant ?? "ink";
  const size = props.size ?? "default";
  const className = classes(variant, size, props.className);
  if (props.href !== undefined) {
    const { variant: _variant, size: _size, className: _className, href, children, ...rest } = props;
    return (
      <a className={className} href={href} {...rest}>
        {children}
      </a>
    );
  }
  const { variant: _variant, size: _size, className: _className, children, ...rest } = props;
  return (
    <button className={className} {...rest}>
      {children}
    </button>
  );
}
