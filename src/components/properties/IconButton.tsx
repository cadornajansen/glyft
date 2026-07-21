import type { ButtonHTMLAttributes, ReactNode } from "react";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  danger?: boolean;
  active?: boolean;
}

export function IconButton({
  children,
  danger = false,
  active = false,
  className = "",
  type = "button",
  ...props
}: IconButtonProps) {
  const stateClass = danger
    ? "text-[#8d8d8d] hover:bg-red-500/10 hover:text-red-400"
    : active
      ? "bg-[#3a3a3a] text-white"
      : "text-[#8d8d8d] hover:bg-[#303030] hover:text-white";

  return (
    <button
      type={type}
      className={[
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
        "border border-transparent transition-colors",
        stateClass,
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}
