import type { ReactNode } from "react";

interface PropertySectionProps {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function PropertySection({
  title,
  action,
  children,
  className = "",
}: PropertySectionProps) {
  return (
    <section
      className={`border-b border-[#292929] px-3 py-3.5 ${className}`}
    >
      <div className="mb-3 flex h-5 items-center justify-between">
        <h3 className="text-[11px] font-semibold text-[#ededed]">
          {title}
        </h3>

        {action}
      </div>

      {children}
    </section>
  );
}   