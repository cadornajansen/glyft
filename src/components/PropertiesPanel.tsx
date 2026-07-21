import { useEffect, useState, type ReactNode } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Copy,
  Eye,
  Italic,
  Layers,
  Layers3,
  Lock,
  Paintbrush,
  RotateCw,
  Sparkles,
  Trash2,
  Type,
  Underline,
} from "lucide-react";
import { useEditorStore, type ActiveProperties } from "../stores/editorStore";

const FONTS = [
  { name: "Inter", value: "Inter, sans-serif" },
  { name: "Space Grotesk", value: "Space Grotesk, sans-serif" },
  { name: "JetBrains Mono", value: "JetBrains Mono, monospace" },
  { name: "Playfair Display", value: "Playfair Display, serif" },
  { name: "Plus Jakarta Sans", value: "Plus Jakarta Sans, sans-serif" },
];

const WEIGHTS = [
  { name: "Light", value: "300" },
  { name: "Regular", value: "400" },
  { name: "Medium", value: "500" },
  { name: "SemiBold", value: "600" },
  { name: "Bold", value: "700" },
  { name: "Black", value: "900" },
];

const PRESET_COLORS = [
  "#ffffff",
  "#000000",
  "#f1f5f9",
  "#3b82f6",
  "#10b981",
  "#ef4444",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
];

const fieldClass =
  "h-8 w-full rounded-md border border-transparent bg-[#262626] px-2.5 text-[11px] font-medium text-[#f2f2f2] outline-none transition-colors hover:border-[#3a3a3a] focus:border-[#6b6b6b] focus:bg-[#2b2b2b]";

const iconButtonClass =
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-transparent bg-[#262626] text-[#a7a7a7] transition-colors hover:border-[#3a3a3a] hover:bg-[#303030] hover:text-white";

interface PropertiesPanelProps {
  onSetProperty: (key: keyof ActiveProperties, value: any) => void;
  onSetArtboardProperty: (key: "width" | "height" | "fill", value: any) => void;
  onDeleteSelected: () => void;
  onDuplicateSelected: () => void;
  onGroupSelected: () => void;
  onUngroupSelected: () => void;
  onLockSelected: () => void;
  onUnlockSelected: (id?: string) => void;
}

interface SectionProps {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

function Section({ title, action, children, className = "" }: SectionProps) {
  return (
    <section className={`border-b border-[#252525] px-3 py-3.5 ${className}`}>
      <div className="mb-3 flex h-5 items-center justify-between">
        <h3 className="text-[11px] font-semibold text-[#ededed]">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

interface InlineFieldProps {
  label: string;
  id: string;
  value: number | string;
  onChange: (value: string) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}

function InlineField({
  label,
  id,
  value,
  onChange,
  min,
  max,
  step,
  suffix,
}: InlineFieldProps) {
  return (
    <label
      htmlFor={id}
      className="group flex h-8 min-w-0 items-center rounded-md border border-transparent bg-[#262626] transition-colors hover:border-[#3a3a3a] focus-within:border-[#6b6b6b] focus-within:bg-[#2b2b2b]"
    >
      <span className="w-7 shrink-0 pl-2 text-[10px] font-semibold text-[#8d8d8d]">
        {label}
      </span>
      <input
        id={id}
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(event.target.value)}
        className="min-w-0 flex-1 bg-transparent pr-1 text-[11px] font-medium text-[#f2f2f2] outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      {suffix && (
        <span className="pr-2 text-[10px] font-medium text-[#777]">{suffix}</span>
      )}
    </label>
  );
}

interface ColorRowProps {
  id: string;
  color: string;
  fallback: string;
  placeholder?: string;
  onChange: (value: string) => void;
}

function ColorRow({
  id,
  color,
  fallback,
  placeholder,
  onChange,
}: ColorRowProps) {
  const safeColor = color?.startsWith("#") ? color : fallback;

  return (
    <div className="flex h-8 items-center overflow-hidden rounded-md border border-transparent bg-[#262626] transition-colors hover:border-[#3a3a3a] focus-within:border-[#6b6b6b]">
      <label className="relative ml-1.5 h-5 w-5 shrink-0 cursor-pointer overflow-hidden rounded border border-white/15">
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
        className="min-w-0 flex-1 bg-transparent px-2 font-mono text-[11px] font-medium uppercase text-[#ededed] outline-none placeholder:normal-case placeholder:text-[#6f6f6f]"
      />

      <div className="mr-1 flex h-6 items-center gap-1 rounded px-1.5 text-[10px] text-[#8c8c8c]">
        <span>100</span>
        <span>%</span>
      </div>

      <button
        type="button"
        className="mr-1 flex h-6 w-6 items-center justify-center rounded text-[#858585] hover:bg-white/5 hover:text-white"
        title="Visibility"
      >
        <Eye size={13} />
      </button>
    </div>
  );
}

export function PropertiesPanel({
  onSetProperty,
  onSetArtboardProperty,
  onDeleteSelected,
  onDuplicateSelected,
  onGroupSelected,
  onUngroupSelected,
  onLockSelected,
  onUnlockSelected,
}: PropertiesPanelProps) {
  const { activeProperties, selectedObjectCount, currentProject } =
    useEditorStore();

  const [localWidth, setLocalWidth] = useState(currentProject?.width || 1200);
  const [localHeight, setLocalHeight] = useState(currentProject?.height || 630);

  useEffect(() => {
    if (!currentProject) return;
    setLocalWidth(currentProject.width);
    setLocalHeight(currentProject.height);
  }, [currentProject?.width, currentProject?.height]);

  void onUnlockSelected;

  const handleArtboardWidthChange = (value: string) => {
    const next = parseInt(value, 10) || 0;
    setLocalWidth(next);
    onSetArtboardProperty("width", next);
  };

  const handleArtboardHeightChange = (value: string) => {
    const next = parseInt(value, 10) || 0;
    setLocalHeight(next);
    onSetArtboardProperty("height", next);
  };

  const selectedTypeLabel =
    activeProperties?.type === "itext"
      ? "Text"
      : activeProperties?.type === "rect"
        ? "Rectangle"
        : activeProperties?.type === "circle"
          ? "Ellipse"
          : activeProperties?.type === "group"
            ? "Group"
            : activeProperties?.type
              ? activeProperties.type[0].toUpperCase() +
                activeProperties.type.slice(1)
              : "Selection";

  return (
    <aside
      id="properties-sidebar"
      className="flex h-full w-full flex-col overflow-hidden bg-[#1e1e1e] text-white"
    >
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-[#2a2a2a] px-3">
        <div className="flex min-w-0 items-center gap-2">
          <Paintbrush size={14} className="shrink-0 text-[#8d8d8d]" />
          <span className="truncate text-[12px] font-semibold text-[#f2f2f2]">
            {selectedObjectCount > 0 ? selectedTypeLabel : "Properties"}
          </span>
        </div>

        {selectedObjectCount > 0 && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="flex h-7 w-7 items-center justify-center rounded text-[#8d8d8d] hover:bg-[#2b2b2b] hover:text-white"
              onClick={onDuplicateSelected}
              title="Duplicate"
            >
              <Copy size={13} />
            </button>
            <button
              type="button"
              className="flex h-7 w-7 items-center justify-center rounded text-[#8d8d8d] hover:bg-[#2b2b2b] hover:text-white"
              onClick={onLockSelected}
              title="Lock"
            >
              <Lock size={13} />
            </button>
            <button
              type="button"
              className="flex h-7 w-7 items-center justify-center rounded text-[#8d8d8d] hover:bg-red-500/10 hover:text-red-400"
              onClick={onDeleteSelected}
              title="Delete"
            >
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-none">
        {selectedObjectCount === 0 ? (
          <>
            <Section title="Artboard">
              <div className="grid grid-cols-2 gap-2">
                <InlineField
                  id="artboard-width"
                  label="W"
                  value={localWidth}
                  min={1}
                  onChange={handleArtboardWidthChange}
                />
                <InlineField
                  id="artboard-height"
                  label="H"
                  value={localHeight}
                  min={1}
                  onChange={handleArtboardHeightChange}
                />
              </div>
            </Section>

            <Section title="Fill">
              <ColorRow
                id="artboard-bg"
                color="#ffffff"
                fallback="#ffffff"
                onChange={(value) => onSetArtboardProperty("fill", value)}
              />
              <div className="mt-2 grid grid-cols-10 gap-1">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    title={color}
                    onClick={() => onSetArtboardProperty("fill", color)}
                    className="aspect-square rounded-[3px] border border-white/10 transition-transform hover:scale-110"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </Section>

            <div className="m-3 rounded-lg border border-[#2d2d2d] bg-[#232323] px-4 py-6 text-center">
              <Sparkles className="mx-auto mb-2 text-[#777]" size={18} />
              <p className="text-[11px] leading-5 text-[#777]">
                Select an object to edit its position, dimensions, appearance,
                fill, stroke, typography, and effects.
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="flex gap-1.5 border-b border-[#252525] px-3 py-2.5">
              <button
                type="button"
                onClick={onDuplicateSelected}
                className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md bg-[#262626] text-[10px] font-medium text-[#b5b5b5] hover:bg-[#303030] hover:text-white"
              >
                <Copy size={12} />
                Duplicate
              </button>

              {selectedObjectCount > 1 ? (
                <button
                  type="button"
                  onClick={onGroupSelected}
                  className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md bg-[#262626] text-[10px] font-medium text-[#b5b5b5] hover:bg-[#303030] hover:text-white"
                >
                  <Layers size={12} />
                  Group
                </button>
              ) : activeProperties?.type === "group" ? (
                <button
                  type="button"
                  onClick={onUngroupSelected}
                  className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md bg-[#262626] text-[10px] font-medium text-[#b5b5b5] hover:bg-[#303030] hover:text-white"
                >
                  <Layers3 size={12} />
                  Ungroup
                </button>
              ) : null}
            </div>

            {selectedObjectCount === 1 && activeProperties && (
              <Section title="Position">
                <div className="grid grid-cols-2 gap-2">
                  <InlineField
                    id="prop-position-x"
                    label="X"
                    value={Math.round(activeProperties.left ?? 0)}
                    step={1}
                    onChange={(value) =>
                      onSetProperty("left", Number(value))
                    }
                  />
                  <InlineField
                    id="prop-position-y"
                    label="Y"
                    value={Math.round(activeProperties.top ?? 0)}
                    step={1}
                    onChange={(value) =>
                      onSetProperty("top", Number(value))
                    }
                  />
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2">
                  <InlineField
                    id="prop-angle"
                    label="↻"
                    value={Math.round(activeProperties.angle ?? 0)}
                    step={1}
                    suffix="°"
                    onChange={(value) =>
                      onSetProperty("angle", Number(value))
                    }
                  />
                  <div className="flex gap-1">
                    <button
                      type="button"
                      className={iconButtonClass}
                      title="Rotate -90°"
                      onClick={() =>
                        onSetProperty(
                          "angle",
                          (activeProperties.angle ?? 0) - 90,
                        )
                      }
                    >
                      <RotateCw size={13} className="-scale-x-100" />
                    </button>
                    <button
                      type="button"
                      className={iconButtonClass}
                      title="Reset rotation"
                      onClick={() => onSetProperty("angle", 0)}
                    >
                      <span className="text-[10px] font-semibold">0°</span>
                    </button>
                    <button
                      type="button"
                      className={iconButtonClass}
                      title="Rotate 90°"
                      onClick={() =>
                        onSetProperty(
                          "angle",
                          (activeProperties.angle ?? 0) + 90,
                        )
                      }
                    >
                      <RotateCw size={13} />
                    </button>
                  </div>
                </div>
              </Section>
            )}

            {selectedObjectCount === 1 && activeProperties && (
              <Section title="Layout">
                <div className="grid grid-cols-2 gap-2">
                  <InlineField
                    id="prop-width"
                    label="W"
                    value={Math.round(activeProperties.width ?? 1)}
                    min={1}
                    onChange={(value) =>
                      onSetProperty("width", Math.max(1, Number(value)))
                    }
                  />
                  <InlineField
                    id="prop-height"
                    label="H"
                    value={Math.round(activeProperties.height ?? 1)}
                    min={1}
                    onChange={(value) =>
                      onSetProperty("height", Math.max(1, Number(value)))
                    }
                  />
                </div>
              </Section>
            )}

            <Section title="Appearance">
              <div className="grid grid-cols-2 gap-2">
                <InlineField
                  id="prop-opacity"
                  label="◩"
                  value={Math.round((activeProperties?.opacity ?? 1) * 100)}
                  min={0}
                  max={100}
                  suffix="%"
                  onChange={(value) =>
                    onSetProperty(
                      "opacity",
                      Math.min(100, Math.max(0, Number(value))) / 100,
                    )
                  }
                />

                {activeProperties?.type === "rect" ? (
                  <InlineField
                    id="prop-corner-radius"
                    label="⌜"
                    value={activeProperties.rx || 0}
                    min={0}
                    max={100}
                    onChange={(value) => {
                      const radius = Math.max(0, Number(value));
                      onSetProperty("rx", radius);
                      onSetProperty("ry", radius);
                    }}
                  />
                ) : (
                  <div />
                )}
              </div>
            </Section>

            {activeProperties?.type === "itext" && (
              <Section title="Typography" action={<Type size={13} className="text-[#777]" />}>
                <select
                  id="prop-font-family"
                  value={activeProperties.fontFamily}
                  onChange={(event) =>
                    onSetProperty("fontFamily", event.target.value)
                  }
                  className={fieldClass}
                >
                  {FONTS.map((font) => (
                    <option key={font.name} value={font.value}>
                      {font.name}
                    </option>
                  ))}
                </select>

                <div className="mt-2 grid grid-cols-2 gap-2">
                  <InlineField
                    id="prop-font-size"
                    label="S"
                    value={activeProperties.fontSize || 24}
                    min={1}
                    onChange={(value) =>
                      onSetProperty("fontSize", parseInt(value, 10) || 12)
                    }
                  />
                  <select
                    id="prop-font-weight"
                    value={activeProperties.fontWeight}
                    onChange={(event) =>
                      onSetProperty("fontWeight", event.target.value)
                    }
                    className={fieldClass}
                  >
                    {WEIGHTS.map((weight) => (
                      <option key={weight.name} value={weight.value}>
                        {weight.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2">
                  <InlineField
                    id="prop-letter-spacing"
                    label="LS"
                    value={activeProperties.charSpacing || 0}
                    onChange={(value) =>
                      onSetProperty("charSpacing", parseInt(value, 10) || 0)
                    }
                  />
                  <InlineField
                    id="prop-line-height"
                    label="LH"
                    value={activeProperties.lineHeight || 1.15}
                    min={0.1}
                    step={0.05}
                    onChange={(value) =>
                      onSetProperty("lineHeight", parseFloat(value) || 1.15)
                    }
                  />
                </div>

                <div className="mt-2 grid grid-cols-5 gap-1 rounded-md bg-[#262626] p-1">
                  {[
                    {
                      title: "Align left",
                      active: activeProperties.textAlign === "left",
                      icon: <AlignLeft size={13} />,
                      action: () => onSetProperty("textAlign", "left"),
                    },
                    {
                      title: "Align center",
                      active: activeProperties.textAlign === "center",
                      icon: <AlignCenter size={13} />,
                      action: () => onSetProperty("textAlign", "center"),
                    },
                    {
                      title: "Align right",
                      active: activeProperties.textAlign === "right",
                      icon: <AlignRight size={13} />,
                      action: () => onSetProperty("textAlign", "right"),
                    },
                    {
                      title: "Italic",
                      active: activeProperties.fontStyle === "italic",
                      icon: <Italic size={13} />,
                      action: () =>
                        onSetProperty(
                          "fontStyle",
                          activeProperties.fontStyle === "italic"
                            ? "normal"
                            : "italic",
                        ),
                    },
                    {
                      title: "Underline",
                      active: Boolean(activeProperties.underline),
                      icon: <Underline size={13} />,
                      action: () =>
                        onSetProperty(
                          "underline",
                          !activeProperties.underline,
                        ),
                    },
                  ].map((control) => (
                    <button
                      key={control.title}
                      type="button"
                      title={control.title}
                      onClick={control.action}
                      className={`flex h-7 items-center justify-center rounded transition-colors ${
                        control.active
                          ? "bg-[#3a3a3a] text-white"
                          : "text-[#858585] hover:bg-[#303030] hover:text-white"
                      }`}
                    >
                      {control.icon}
                    </button>
                  ))}
                </div>
              </Section>
            )}

            {activeProperties?.type !== "line" &&
              activeProperties?.type !== "path" && (
                <Section title="Fill">
                  <ColorRow
                    id="prop-fill"
                    color={activeProperties?.fill || ""}
                    fallback="#3b82f6"
                    onChange={(value) => onSetProperty("fill", value)}
                  />
                  <div className="mt-2 grid grid-cols-10 gap-1">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        title={color}
                        onClick={() => onSetProperty("fill", color)}
                        className="aspect-square rounded-[3px] border border-white/10 transition-transform hover:scale-110"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </Section>
              )}

            <Section title="Stroke">
              <ColorRow
                id="prop-stroke"
                color={activeProperties?.stroke || ""}
                fallback="#000000"
                placeholder="None"
                onChange={(value) => onSetProperty("stroke", value)}
              />

              <div className="mt-2 grid grid-cols-2 gap-2">
                <InlineField
                  id="prop-stroke-width"
                  label="W"
                  value={activeProperties?.strokeWidth || 0}
                  min={0}
                  max={50}
                  onChange={(value) =>
                    onSetProperty("strokeWidth", parseInt(value, 10) || 0)
                  }
                />
                <div className="flex h-8 items-center rounded-md bg-[#262626] px-2.5 text-[10px] text-[#868686]">
                  Inside
                </div>
              </div>
            </Section>

            <Section title="Effects" className="border-b-0">
              <ColorRow
                id="prop-shadow-color"
                color={activeProperties?.shadowColor || ""}
                fallback="#000000"
                placeholder="Shadow color"
                onChange={(value) => onSetProperty("shadowColor", value)}
              />

              <div className="mt-2 grid grid-cols-3 gap-2">
                <InlineField
                  id="prop-shadow-blur"
                  label="B"
                  value={activeProperties?.shadowBlur || 0}
                  min={0}
                  onChange={(value) =>
                    onSetProperty("shadowBlur", parseInt(value, 10) || 0)
                  }
                />
                <InlineField
                  id="prop-shadow-offset-x"
                  label="X"
                  value={activeProperties?.shadowOffsetX || 0}
                  onChange={(value) =>
                    onSetProperty("shadowOffsetX", parseInt(value, 10) || 0)
                  }
                />
                <InlineField
                  id="prop-shadow-offset-y"
                  label="Y"
                  value={activeProperties?.shadowOffsetY || 0}
                  onChange={(value) =>
                    onSetProperty("shadowOffsetY", parseInt(value, 10) || 0)
                  }
                />
              </div>
            </Section>
          </>
        )}
      </div>
    </aside>
  );
}
