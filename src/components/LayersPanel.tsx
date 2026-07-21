import React, { useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Circle as CircleIcon,
  Edit2,
  Eye,
  EyeOff,
  GripVertical,
  Image as ImageIcon,
  Layers,
  Lock,
  Minus,
  Square,
  Type,
  Unlock,
} from "lucide-react";
import { useEditorStore } from "../stores/editorStore";
import {
  encodeLayerSelection,
  installLayerSelectionBridge,
} from "../canvas/layerSelectionBridge";

installLayerSelectionBridge();

interface LayersPanelProps {
  onReorderLayer: (id: string, dir: "up" | "down") => void;
  onRenameLayer: (id: string, name: string) => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onDragReorder?: (sourceIndex: number, targetIndex: number) => void;
  onSelectLayer?: (id: string) => void;
}

export function LayersPanel({
  onReorderLayer,
  onRenameLayer,
  onToggleVisibility,
  onToggleLock,
  onDragReorder,
  onSelectLayer,
}: LayersPanelProps) {
  const { layers, selectedObjectIds } = useEditorStore();
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [tempName, setTempName] = useState("");
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const selectionAnchorId = useRef<string | null>(null);

  const selectedIds = new Set(selectedObjectIds);

  const getLayerIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "rect":
        return <Square size={12} className="text-blue-400" />;
      case "circle":
        return <CircleIcon size={12} className="text-emerald-400" />;
      case "line":
        return <Minus size={12} className="text-red-400" />;
      case "path":
        return <Minus size={12} className="rotate-45 text-amber-400" />;
      case "itext":
        return <Type size={12} className="text-purple-400" />;
      case "image":
        return <ImageIcon size={12} className="text-pink-400" />;
      default:
        return <Layers size={12} className="text-zinc-400" />;
    }
  };

  const applySelection = (ids: string[]) => {
    onSelectLayer?.(encodeLayerSelection(ids));
  };

  const handleLayerClick = (
    event: React.MouseEvent<HTMLDivElement>,
    id: string,
    index: number,
  ) => {
    const toggleSelection = event.metaKey || event.ctrlKey;

    if (event.shiftKey) {
      const anchorIndex = selectionAnchorId.current
        ? layers.findIndex((layer) => layer.id === selectionAnchorId.current)
        : -1;

      const rangeStart = anchorIndex === -1 ? index : Math.min(anchorIndex, index);
      const rangeEnd = anchorIndex === -1 ? index : Math.max(anchorIndex, index);
      const rangeIds = layers
        .slice(rangeStart, rangeEnd + 1)
        .map((layer) => layer.id);

      const nextIds = toggleSelection
        ? Array.from(new Set([...selectedObjectIds, ...rangeIds]))
        : rangeIds;

      applySelection(nextIds);
      return;
    }

    selectionAnchorId.current = id;

    if (toggleSelection) {
      const nextIds = selectedIds.has(id)
        ? selectedObjectIds.filter((selectedId) => selectedId !== id)
        : [...selectedObjectIds, id];

      applySelection(nextIds);
      return;
    }

    applySelection([id]);
  };

  const handleStartRename = (
    id: string,
    currentName: string,
    event: React.MouseEvent,
  ) => {
    event.stopPropagation();
    setRenamingId(id);
    setTempName(currentName);
  };

  const handleFinishRename = (id: string) => {
    if (tempName.trim()) onRenameLayer(id, tempName.trim());
    setRenamingId(null);
  };

  const handleDragStart = (event: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(index));
  };

  const handleDragOver = (event: React.DragEvent, index: number) => {
    event.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (event: React.DragEvent, index: number) => {
    event.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      onDragReorder?.(draggedIndex, index);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div
      id="layers-sidebar"
      className="flex h-full w-full flex-col overflow-hidden bg-[#0a0a0a]"
    >
      <div className="flex items-center gap-2 border-b border-[#222] bg-[#0a0a0a] px-4 py-2.5">
        <Layers size={13} className="text-[#707070]" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#a1a1a1]">
          Layers
        </span>
        <span className="ml-auto rounded border border-[#333] bg-[#1a1a1a] px-1.5 py-0.5 font-mono text-[9px] text-[#707070]">
          {selectedObjectIds.length > 1
            ? `${selectedObjectIds.length} selected`
            : `${layers.length} total`}
        </span>
      </div>

      <div
        className="flex-1 space-y-1 overflow-y-auto p-2 scrollbar-none"
        onClick={(event) => {
          if (event.target !== event.currentTarget) return;
          selectionAnchorId.current = null;
          applySelection([]);
        }}
      >
        {layers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-[#555]">
            <Layers size={20} className="mb-2 text-[#222]" />
            <p className="text-[10px] font-semibold uppercase tracking-wider">
              No objects on the canvas
            </p>
          </div>
        ) : (
          layers.map((layer, index) => {
            const isSelected = selectedIds.has(layer.id);
            const isAnchor = selectionAnchorId.current === layer.id;

            return (
              <div
                key={layer.id}
                id={`layer-row-${layer.id}`}
                draggable
                onDragStart={(event) => handleDragStart(event, index)}
                onDragOver={(event) => handleDragOver(event, index)}
                onDrop={(event) => handleDrop(event, index)}
                onDragEnd={handleDragEnd}
                onClick={(event) => handleLayerClick(event, layer.id, index)}
                className={[
                  "group flex cursor-grab items-center gap-1 rounded border px-2 py-1.5 transition-colors active:cursor-grabbing",
                  isSelected
                    ? "border-blue-500/25 bg-blue-500/10 text-white"
                    : "border-transparent text-[#888] hover:bg-[#151515] hover:text-white",
                  isAnchor && isSelected ? "ring-1 ring-inset ring-blue-400/35" : "",
                  draggedIndex === index ? "bg-[#222] opacity-30" : "",
                  dragOverIndex === index
                    ? "border-t-2 border-t-white/50 bg-[#1a1a1a]"
                    : "",
                ].join(" ")}
              >
                <div className="mr-0.5 cursor-grab text-[#444] group-hover:text-[#707070] active:cursor-grabbing">
                  <GripVertical size={11} />
                </div>

                <div className="flex h-5 w-5 items-center justify-center rounded border border-[#333]/30 bg-[#141414]">
                  {getLayerIcon(layer.type)}
                </div>

                <div className="ml-1 min-w-0 flex-1">
                  {renamingId === layer.id ? (
                    <input
                      id={`layer-rename-${layer.id}`}
                      type="text"
                      value={tempName}
                      onChange={(event) => setTempName(event.target.value)}
                      onBlur={() => handleFinishRename(layer.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") handleFinishRename(layer.id);
                        if (event.key === "Escape") setRenamingId(null);
                      }}
                      onClick={(event) => event.stopPropagation()}
                      autoFocus
                      className="w-full rounded border border-[#333] bg-[#18181b] px-1.5 py-0.5 text-xs text-white focus:outline-none"
                    />
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span
                        onDoubleClick={(event) =>
                          handleStartRename(layer.id, layer.name, event)
                        }
                        className="cursor-pointer select-none truncate text-xs font-medium"
                      >
                        {layer.name}
                      </span>
                      <button
                        type="button"
                        onClick={(event) =>
                          handleStartRename(layer.id, layer.name, event)
                        }
                        className="cursor-pointer p-0.5 text-[#555] opacity-0 transition-opacity hover:text-[#a1a1a1] group-hover:opacity-100"
                        title="Rename layer"
                      >
                        <Edit2 size={9} />
                      </button>
                    </div>
                  )}
                </div>

                <div
                  className="flex items-center gap-0.5 opacity-40 transition-opacity group-hover:opacity-100"
                  onClick={(event) => event.stopPropagation()}
                >
                  <button
                    type="button"
                    id={`layer-up-${layer.id}`}
                    onClick={() => onReorderLayer(layer.id, "up")}
                    disabled={index === 0}
                    className={`rounded p-1 text-[#707070] hover:bg-[#1a1a1a] hover:text-white ${
                      index === 0 ? "cursor-not-allowed opacity-20" : "cursor-pointer"
                    }`}
                    title="Move layer up"
                  >
                    <ChevronUp size={11} />
                  </button>
                  <button
                    type="button"
                    id={`layer-down-${layer.id}`}
                    onClick={() => onReorderLayer(layer.id, "down")}
                    disabled={index === layers.length - 1}
                    className={`rounded p-1 text-[#707070] hover:bg-[#1a1a1a] hover:text-white ${
                      index === layers.length - 1
                        ? "cursor-not-allowed opacity-20"
                        : "cursor-pointer"
                    }`}
                    title="Move layer down"
                  >
                    <ChevronDown size={11} />
                  </button>
                  <button
                    type="button"
                    id={`layer-vis-${layer.id}`}
                    onClick={() => onToggleVisibility(layer.id)}
                    className="cursor-pointer rounded p-1 text-[#707070] hover:bg-[#1a1a1a] hover:text-white"
                    title="Toggle layer visibility"
                  >
                    {layer.visible ? (
                      <Eye size={11} />
                    ) : (
                      <EyeOff size={11} className="text-[#555]" />
                    )}
                  </button>
                  <button
                    type="button"
                    id={`layer-lock-${layer.id}`}
                    onClick={() => onToggleLock(layer.id)}
                    className="cursor-pointer rounded p-1 text-[#707070] hover:bg-[#1a1a1a] hover:text-white"
                    title="Toggle layer lock"
                  >
                    {layer.locked ? (
                      <Lock size={11} className="text-amber-500" />
                    ) : (
                      <Unlock size={11} />
                    )}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}