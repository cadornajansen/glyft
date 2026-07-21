import { Eye } from "lucide-react";

interface ColorRowProps {
  id: string;
  color: string;
  fallback: string;
  placeholder?: string;
  opacity?: number;
  visible?: boolean;
  onChange: (value: string) => void;
  onOpacityChange?: (opacity: number) => void;
  onVisibilityChange?: (visible: boolean) => void;
}

function getSafeColor(color: string, fallback: string) {
  return color?.startsWith("#") ? color : fallback;
}

export function ColorRow({
  id,
  color,
  fallback,
  placeholder,
  opacity = 1,
  visible = true,
  onChange,
  onOpacityChange,
  onVisibilityChange,
}: ColorRowProps) {
  const safeColor = getSafeColor(color, fallback);
  const opacityPercent = Math.round(opacity * 100);

  return (
    <div
      className={[
        "flex h-8 items-center overflow-hidden rounded-md",
        "border border-transparent bg-[#262626] transition-colors",
        "hover:border-[#3a3a3a] focus-within:border-[#6b6b6b]",
      ].join(" ")}
    >
      <label
        htmlFor={`${id}-picker`}
        className="relative ml-1.5 h-5 w-5 shrink-0 cursor-pointer overflow-hidden rounded border border-white/15"
      >
        <span
          className="absolute inset-0"
          style={{ backgroundColor: safeColor }}
        />

        <input
          id={`${id}-picker`}
          type="color"
          value={safeColor}
          onChange={(event) => onChange(event.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>

      <input
        id={`${id}-text`}
        type="text"
        value={color || ""}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={[
          "min-w-0 flex-1 bg-transparent px-2",
          "font-mono text-[11px] font-medium uppercase text-[#ededed]",
          "outline-none placeholder:normal-case placeholder:text-[#6f6f6f]",
        ].join(" ")}
      />

      <label className="flex h-6 w-12 shrink-0 items-center text-[10px] text-[#8c8c8c]">
        <input
          type="number"
          min={0}
          max={100}
          value={opacityPercent}
          disabled={!onOpacityChange}
          onChange={(event) => {
            const next = Math.min(100, Math.max(0, Number(event.target.value)));

            onOpacityChange?.(next / 100);
          }}
          className={[
            "w-7 bg-transparent text-right outline-none",
            "[appearance:textfield]",
            "[&::-webkit-inner-spin-button]:appearance-none",
            "[&::-webkit-outer-spin-button]:appearance-none",
            !onOpacityChange ? "cursor-default" : "",
          ].join(" ")}
        />

        <span className="ml-0.5">%</span>
      </label>

      <button
        type="button"
        className={[
          "mr-1 flex h-6 w-6 items-center justify-center rounded",
          visible
            ? "text-[#858585] hover:bg-white/5 hover:text-white"
            : "text-[#555] hover:bg-white/5",
        ].join(" ")}
        title={visible ? "Hide" : "Show"}
        onClick={() => onVisibilityChange?.(!visible)}
      >
        <Eye size={13} />
      </button>
    </div>
  );
}
