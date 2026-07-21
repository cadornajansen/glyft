import type { ReactNode } from "react";

interface InlineFieldProps {
  id: string;
  label: ReactNode;
  value: number | string;
  onChange: (value: string) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  format?: "number" | "degrees";
}

export function InlineField({
  id,
  label,
  value,
  onChange,
  min,
  max,
  step,
  disabled = false,
  format = "number",
}: InlineFieldProps) {
  const isDegrees = format === "degrees";

  const handleChange = (rawValue: string) => {
    if (!isDegrees) {
      onChange(rawValue);
      return;
    }

    const numericValue = rawValue.replace("°", "").replace(/[^\d.-]/g, "");

    onChange(numericValue);
  };

  return (
    <label
      htmlFor={id}
      className={[
        "flex h-8 min-w-0 items-center overflow-hidden rounded-md",
        "border border-transparent bg-[#262626] transition-colors",
        "hover:border-[#3a3a3a]",
        "focus-within:border-[#6b6b6b] focus-within:bg-[#2b2b2b]",
        disabled ? "cursor-not-allowed opacity-50" : "",
      ].join(" ")}
    >
      <span className="flex w-7 shrink-0 items-center justify-center text-[10px] font-semibold text-[#8d8d8d]">
        {label}
      </span>

      <input
        id={id}
        type={isDegrees ? "text" : "number"}
        inputMode={isDegrees ? "decimal" : undefined}
        value={isDegrees ? `${value}°` : value}
        min={isDegrees ? undefined : min}
        max={isDegrees ? undefined : max}
        step={isDegrees ? undefined : step}
        disabled={disabled}
        onChange={(event) => handleChange(event.target.value)}
        onFocus={(event) => {
          if (!isDegrees) return;

          const degreeIndex = event.currentTarget.value.indexOf("°");

          requestAnimationFrame(() => {
            event.currentTarget.setSelectionRange(degreeIndex, degreeIndex);
          });
        }}
        className={[
          "h-full min-w-0 flex-1 bg-transparent px-2",
          "text-[11px] font-medium text-[#8d8d8d] outline-none",
          "[appearance:textfield]",
          "[&::-webkit-inner-spin-button]:appearance-none",
          "[&::-webkit-outer-spin-button]:appearance-none",
        ].join(" ")}
      />
    </label>
  );
}
