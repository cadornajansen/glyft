interface SliderFieldProps {
  id: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  suffix?: string;
  disabled?: boolean;
}

export function SliderField({
  id,
  value,
  min,
  max,
  step = 1,
  onChange,
  suffix,
  disabled = false,
}: SliderFieldProps) {
  const clamp = (nextValue: number) => Math.min(max, Math.max(min, nextValue));

  const handleChange = (nextValue: number) => {
    if (!Number.isFinite(nextValue)) return;
    onChange(clamp(nextValue));
  };

  return (
    <div
      className={[
        "flex h-8 min-w-0 items-center gap-2 rounded-md",
        "border border-transparent bg-[#262626] px-2",
        "transition-colors hover:border-[#3a3a3a]",
        "focus-within:border-[#6b6b6b] focus-within:bg-[#2b2b2b]",
        disabled ? "cursor-not-allowed opacity-50" : "",
      ].join(" ")}
    >
      <input
        id={`${id}-slider`}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => handleChange(Number(event.target.value))}
        className={[
          "h-1 min-w-0 flex-1 appearance-none rounded-full",
          "bg-[#444] accent-white",
          disabled ? "cursor-not-allowed" : "cursor-pointer",
        ].join(" ")}
      />

      <div className="flex h-6 w-16 shrink-0 items-center rounded bg-[#1f1f1f] px-1.5">
        <input
          id={`${id}-input`}
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(event) => handleChange(Number(event.target.value))}
          className={[
            "min-w-0 flex-1 bg-transparent text-right",
            "text-[11px] font-medium text-[#f2f2f2] outline-none",
            "[appearance:textfield]",
            "[&::-webkit-inner-spin-button]:appearance-none",
            "[&::-webkit-outer-spin-button]:appearance-none",
          ].join(" ")}
        />

        {suffix && (
          <span className="ml-0.5 shrink-0 text-[10px] text-[#777]">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}
