import { useEffect, useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Copy,
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
  RotateCcw,
} from "lucide-react";

import {
  useEditorStore,
  type ActiveProperties,
} from "../stores/editorStore";

import { ColorRow } from "./properties/ColorRow";
import { IconButton } from "./properties/IconButton";
import { InlineField } from "./properties/InlineField";
import { PropertySection } from "./properties/PropertySection";
import { SliderField } from "./properties/SliderField";

import {
  FONTS,
  FONT_WEIGHTS,
  PRESET_COLORS,
  propertyInputClass,
} from "./properties/constants";

interface PropertiesPanelProps {
  onSetProperty: (key: keyof ActiveProperties, value: unknown) => void;

  onSetArtboardProperty: (
    key: "width" | "height" | "fill",
    value: unknown,
  ) => void;

  onDeleteSelected: () => void;
  onDuplicateSelected: () => void;
  onGroupSelected: () => void;
  onUngroupSelected: () => void;
  onLockSelected: () => void;
  onUnlockSelected: (id?: string) => void;
}

function getSelectionLabel(type?: string) {
  switch (type) {
    case "itext":
      return "Text";
    case "rect":
      return "Rectangle";
    case "circle":
      return "Ellipse";
    case "group":
      return "Group";
    case "image":
      return "Image";
    case "line":
      return "Line";
    case "path":
      return "Path";
    default:
      return type
        ? `${type.charAt(0).toUpperCase()}${type.slice(1)}`
        : "Selection";
  }
}

function ColorPresets({ onSelect }: { onSelect: (color: string) => void }) {
  return (
    <div className="mt-2 grid grid-cols-10 gap-1">
      {PRESET_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          title={color}
          onClick={() => onSelect(color)}
          className={[
            "aspect-square rounded-[3px] border border-white/10",
            "transition-transform hover:scale-110",
          ].join(" ")}
          style={{ backgroundColor: color }}
        />
      ))}
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

  const [localWidth, setLocalWidth] = useState(currentProject?.width ?? 1200);

  const [localHeight, setLocalHeight] = useState(currentProject?.height ?? 630);

  useEffect(() => {
    if (!currentProject) return;

    setLocalWidth(currentProject.width);
    setLocalHeight(currentProject.height);
  }, [currentProject?.width, currentProject?.height]);

  // Keep the existing public API until unlock UI is added.
  void onUnlockSelected;

  const setNumberProperty = (
    key: keyof ActiveProperties,
    value: string,
    fallback = 0,
  ) => {
    const parsed = Number(value);
    onSetProperty(key, Number.isFinite(parsed) ? parsed : fallback);
  };

  const selectedLabel = getSelectionLabel(activeProperties?.type);

  return (
    <aside
      id="properties-sidebar"
      className="flex h-full w-full flex-col overflow-hidden bg-[#1e1e1e] text-white"
    >
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-[#2a2a2a] px-3">
        <div className="flex min-w-0 items-center gap-2">
          <Paintbrush size={14} className="shrink-0 text-[#8d8d8d]" />

          <span className="truncate text-[12px] font-semibold text-[#f2f2f2]">
            {selectedObjectCount > 0 ? selectedLabel : "Properties"}
          </span>
        </div>

        {selectedObjectCount > 0 && (
          <div className="flex items-center gap-1">
            <IconButton title="Duplicate" onClick={onDuplicateSelected}>
              <Copy size={13} />
            </IconButton>

            <IconButton title="Lock" onClick={onLockSelected}>
              <Lock size={13} />
            </IconButton>

            <IconButton danger title="Delete" onClick={onDeleteSelected}>
              <Trash2 size={13} />
            </IconButton>
          </div>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-none">
        {selectedObjectCount === 0 ? (
          <>
            <PropertySection title="Artboard">
              <div className="grid grid-cols-2 gap-2">
                <InlineField
                  id="artboard-width"
                  label="W"
                  value={localWidth}
                  min={1}
                  onChange={(value) => {
                    const next = Math.max(1, parseInt(value, 10) || 1);

                    setLocalWidth(next);
                    onSetArtboardProperty("width", next);
                  }}
                />

                <InlineField
                  id="artboard-height"
                  label="H"
                  value={localHeight}
                  min={1}
                  onChange={(value) => {
                    const next = Math.max(1, parseInt(value, 10) || 1);

                    setLocalHeight(next);
                    onSetArtboardProperty("height", next);
                  }}
                />
              </div>
            </PropertySection>

            <PropertySection title="Fill">
              <ColorRow
                id="artboard-fill"
                color="#ffffff"
                fallback="#ffffff"
                onChange={(value) => onSetArtboardProperty("fill", value)}
              />

              <ColorPresets
                onSelect={(color) => onSetArtboardProperty("fill", color)}
              />
            </PropertySection>

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
            <div className="flex gap-1.5 border-b border-[#292929] px-3 py-2.5">
              <button
                type="button"
                onClick={onDuplicateSelected}
                className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md bg-[#262626] text-[10px] font-medium text-[#b5b5b5] hover:bg-[#303030] hover:text-white"
              >
                <Copy size={12} />
                Duplicate
              </button>

              {selectedObjectCount > 1 && (
                <button
                  type="button"
                  onClick={onGroupSelected}
                  className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md bg-[#262626] text-[10px] font-medium text-[#b5b5b5] hover:bg-[#303030] hover:text-white"
                >
                  <Layers size={12} />
                  Group
                </button>
              )}

              {selectedObjectCount === 1 &&
                activeProperties?.type === "group" && (
                  <button
                    type="button"
                    onClick={onUngroupSelected}
                    className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md bg-[#262626] text-[10px] font-medium text-[#b5b5b5] hover:bg-[#303030] hover:text-white"
                  >
                    <Layers3 size={12} />
                    Ungroup
                  </button>
                )}
            </div>

            {selectedObjectCount === 1 && activeProperties && (
              <>
                <PropertySection title="Position">
                  <div className="grid grid-cols-2 gap-2">
                    <InlineField
                      id="prop-position-x"
                      label="X"
                      value={Math.round(activeProperties.left ?? 0)}
                      onChange={(value) => setNumberProperty("left", value)}
                    />

                    <InlineField
                      id="prop-position-y"
                      label="Y"
                      value={Math.round(activeProperties.top ?? 0)}
                      onChange={(value) => setNumberProperty("top", value)}
                    />
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <InlineField
                      id="prop-angle"
                      label={<RotateCw size={12} />}
                      value={Math.round(activeProperties.angle ?? 0)}
                      format="degrees"
                      onChange={(value) => {
                        if (value === "" || value === "-") return;

                        const angle = Number(value);

                        if (Number.isFinite(angle)) {
                          onSetProperty("angle", angle);
                        }
                      }}
                    />

                    <div className="flex justify-end gap-1">
                      <IconButton
                        title="Rotate -90°"
                        onClick={() =>
                          onSetProperty(
                            "angle",
                            (activeProperties.angle ?? 0) - 90,
                          )
                        }
                      >
                        <RotateCw size={13} className="-scale-x-100" />
                      </IconButton>

                      <IconButton
                        title="Reset rotation"
                        onClick={() => onSetProperty("angle", 0)}
                      >
                        <span className="text-[10px] font-semibold">0°</span>
                      </IconButton>

                      <IconButton
                        title="Rotate 90°"
                        onClick={() =>
                          onSetProperty(
                            "angle",
                            (activeProperties.angle ?? 0) + 90,
                          )
                        }
                      >
                        <RotateCw size={13} />
                      </IconButton>
                    </div>
                  </div>
                </PropertySection>

                <PropertySection title="Layout">
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
                </PropertySection>
              </>
            )}

            <PropertySection title="Appearance">
              <div className="grid grid-cols-5 gap-2">
                <div className="col-span-4">
                  <SliderField
                    id="prop-opacity"
                    value={Math.round((activeProperties?.opacity ?? 1) * 100)}
                    min={0}
                    max={100}
                    step={1}
                    suffix="%"
                    onChange={(value) => onSetProperty("opacity", value / 100)}
                  />
                </div>

                {activeProperties?.type === "rect" ? (
                  <div className="col-span-1">
                    <InlineField
                      id="prop-corner-radius"
                      label="⌜"
                      value={activeProperties.rx ?? 0}
                      min={0}
                      onChange={(value) => {
                        const radius = Math.max(0, Number(value));

                        onSetProperty("rx", radius);
                        onSetProperty("ry", radius);
                      }}
                    />
                  </div>
                ) : (
                  <div className="col-span-1" />
                )}
              </div>
            </PropertySection>

            {activeProperties?.type === "itext" && (
              <PropertySection
                title="Typography"
                action={<Type size={13} className="text-[#777]" />}
              >
                <select
                  value={activeProperties.fontFamily}
                  onChange={(event) =>
                    onSetProperty("fontFamily", event.target.value)
                  }
                  className={propertyInputClass}
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
                    value={activeProperties.fontSize ?? 24}
                    min={1}
                    onChange={(value) =>
                      onSetProperty("fontSize", parseInt(value, 10) || 12)
                    }
                  />

                  <select
                    value={activeProperties.fontWeight}
                    onChange={(event) =>
                      onSetProperty("fontWeight", event.target.value)
                    }
                    className={propertyInputClass}
                  >
                    {FONT_WEIGHTS.map((weight) => (
                      <option key={weight.value} value={weight.value}>
                        {weight.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2">
                  <InlineField
                    id="prop-letter-spacing"
                    label="LS"
                    value={activeProperties.charSpacing ?? 0}
                    onChange={(value) =>
                      setNumberProperty("charSpacing", value)
                    }
                  />

                  <InlineField
                    id="prop-line-height"
                    label="LH"
                    value={activeProperties.lineHeight ?? 1.15}
                    min={0.1}
                    step={0.05}
                    onChange={(value) =>
                      onSetProperty("lineHeight", parseFloat(value) || 1.15)
                    }
                  />
                </div>

                <div className="mt-2 grid grid-cols-5 gap-1 rounded-md bg-[#262626] p-1">
                  <IconButton
                    title="Align left"
                    active={activeProperties.textAlign === "left"}
                    onClick={() => onSetProperty("textAlign", "left")}
                  >
                    <AlignLeft size={13} />
                  </IconButton>

                  <IconButton
                    title="Align center"
                    active={activeProperties.textAlign === "center"}
                    onClick={() => onSetProperty("textAlign", "center")}
                  >
                    <AlignCenter size={13} />
                  </IconButton>

                  <IconButton
                    title="Align right"
                    active={activeProperties.textAlign === "right"}
                    onClick={() => onSetProperty("textAlign", "right")}
                  >
                    <AlignRight size={13} />
                  </IconButton>

                  <IconButton
                    title="Italic"
                    active={activeProperties.fontStyle === "italic"}
                    onClick={() =>
                      onSetProperty(
                        "fontStyle",
                        activeProperties.fontStyle === "italic"
                          ? "normal"
                          : "italic",
                      )
                    }
                  >
                    <Italic size={13} />
                  </IconButton>

                  <IconButton
                    title="Underline"
                    active={Boolean(activeProperties.underline)}
                    onClick={() =>
                      onSetProperty("underline", !activeProperties.underline)
                    }
                  >
                    <Underline size={13} />
                  </IconButton>
                </div>
              </PropertySection>
            )}

            {activeProperties?.type !== "line" &&
              activeProperties?.type !== "path" && (
                <PropertySection title="Fill">
                  <ColorRow
                    id="prop-fill"
                    color={activeProperties?.fill ?? ""}
                    fallback="#3b82f6"
                    opacity={activeProperties?.opacity ?? 1}
                    onChange={(value) => onSetProperty("fill", value)}
                    onOpacityChange={(value) => onSetProperty("opacity", value)}
                  />

                  <ColorPresets
                    onSelect={(color) => onSetProperty("fill", color)}
                  />
                </PropertySection>
              )}

            <PropertySection title="Stroke">
              <ColorRow
                id="prop-stroke"
                color={activeProperties?.stroke ?? ""}
                fallback="#000000"
                placeholder="None"
                onChange={(value) => onSetProperty("stroke", value)}
              />

              <div className="mt-2 grid grid-cols-2 gap-2">
                <InlineField
                  id="prop-stroke-width"
                  label="W"
                  value={activeProperties?.strokeWidth ?? 0}
                  min={0}
                  max={50}
                  onChange={(value) =>
                    onSetProperty("strokeWidth", parseInt(value, 10) || 0)
                  }
                />

                <div className="flex h-8 items-center rounded-md bg-[#262626] px-2.5 text-[10px] text-[#868686]">
                  Center
                </div>
              </div>
            </PropertySection>

            <PropertySection title="Effects" className="border-b-0">
              <ColorRow
                id="prop-shadow-color"
                color={activeProperties?.shadowColor ?? ""}
                fallback="#000000"
                placeholder="Shadow color"
                onChange={(value) => onSetProperty("shadowColor", value)}
              />

              <div className="mt-2 grid grid-cols-3 gap-2">
                <InlineField
                  id="prop-shadow-blur"
                  label="B"
                  value={activeProperties?.shadowBlur ?? 0}
                  min={0}
                  onChange={(value) => setNumberProperty("shadowBlur", value)}
                />

                <InlineField
                  id="prop-shadow-offset-x"
                  label="X"
                  value={activeProperties?.shadowOffsetX ?? 0}
                  onChange={(value) =>
                    setNumberProperty("shadowOffsetX", value)
                  }
                />

                <InlineField
                  id="prop-shadow-offset-y"
                  label="Y"
                  value={activeProperties?.shadowOffsetY ?? 0}
                  onChange={(value) =>
                    setNumberProperty("shadowOffsetY", value)
                  }
                />
              </div>
            </PropertySection>
          </>
        )}
      </div>
    </aside>
  );
}
