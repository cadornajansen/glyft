import React, { useRef } from "react";
import {
  Circle as CircleIcon,
  Grid,
  Hand,
  Image as ImageIcon,
  Maximize2,
  Minus,
  MousePointer,
  Redo2,
  Square,
  TrendingUp,
  Type,
  Undo2,
} from "lucide-react";
import { useEditorStore } from "../stores/editorStore";
import { ExportDropdown, type ExportFormat } from "./ExportDropdown";

interface ToolbarProps {
  onAddRectangle: () => void;
  onAddCircle: () => void;
  onAddLine: () => void;
  onAddArrow: () => void;
  onAddText: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onZoomToFit: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onExport: (format: ExportFormat) => void | Promise<void>;
  onAddImage: (url: string) => void;
}

export function Toolbar({
  onAddRectangle,
  onAddCircle,
  onAddLine,
  onAddArrow,
  onAddText,
  onUndo,
  onRedo,
  onZoomToFit,
  onZoomIn,
  onZoomOut,
  onExport,
  onAddImage,
}: ToolbarProps) {
  const {
    activeTool,
    setActiveTool,
    zoom,
    showGrid,
    setShowGrid,
    canUndo,
    canRedo,
    currentProject,
  } = useEditorStore();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const tools = [
    {
      id: "select",
      name: "Select",
      icon: MousePointer,
      shortcut: "V",
      action: () => setActiveTool("select"),
    },
    {
      id: "pan",
      name: "Pan / Hand",
      icon: Hand,
      shortcut: "H",
      action: () => setActiveTool("pan"),
    },
    {
      id: "rectangle",
      name: "Rectangle",
      icon: Square,
      shortcut: "R",
      action: onAddRectangle,
    },
    {
      id: "circle",
      name: "Circle",
      icon: CircleIcon,
      shortcut: "C",
      action: onAddCircle,
    },
    {
      id: "line",
      name: "Line",
      icon: Minus,
      shortcut: "L",
      action: onAddLine,
    },
    {
      id: "arrow",
      name: "Arrow",
      icon: TrendingUp,
      shortcut: "A",
      action: onAddArrow,
    },
    {
      id: "text",
      name: "Text",
      icon: Type,
      shortcut: "T",
      action: onAddText,
    },
  ];

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const dataUrl = loadEvent.target?.result;
      if (typeof dataUrl === "string") onAddImage(dataUrl);
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  return (
    <div
      id="top-toolbar"
      className="z-20 flex h-12 w-full items-center justify-between border-b border-[#222] bg-[#0a0a0a] px-4"
    >
      <div className="flex items-center gap-6">
        <span className="text-sm font-semibold tracking-tight text-white">
          Glyft
        </span>

        {currentProject ? (
          <nav className="flex items-center gap-3 text-xs font-medium">
            <span className="text-[#707070]">Projects</span>
            <span className="text-[#707070]">/</span>
            <span id="header-project-name" className="text-white">
              {currentProject.name}
            </span>
            <span className="rounded border border-[#333] bg-[#1a1a1a] px-1.5 py-0.5 font-mono text-[10px] text-[#707070]">
              {currentProject.width}×{currentProject.height}px
            </span>
          </nav>
        ) : (
          <nav className="flex items-center gap-3 text-xs font-medium text-[#707070]">
            <span>Projects</span>
            <span>/</span>
            <span>No open project</span>
          </nav>
        )}
      </div>

      {currentProject && (
        <div className="flex items-center gap-1.5 rounded border border-[#333] bg-[#1a1a1a] px-2 py-1">
          {tools.map((tool) => {
            const Icon = tool.icon;
            const isActive = activeTool === tool.id;

            return (
              <button
                key={tool.id}
                id={`tool-${tool.id}`}
                type="button"
                onClick={tool.action}
                title={`${tool.name} (${tool.shortcut})`}
                className={`group relative flex h-7 w-9 cursor-pointer items-center justify-center rounded transition-colors ${
                  isActive
                    ? "bg-white font-bold text-black"
                    : "text-[#707070] hover:bg-[#222] hover:text-white"
                }`}
              >
                <Icon size={14} className="stroke-[2]" />
                <span className="pointer-events-none absolute -bottom-8 left-1/2 z-30 -translate-x-1/2 scale-0 whitespace-nowrap rounded border border-[#222] bg-[#0a0a0a] px-1.5 py-0.5 text-[9px] font-semibold text-[#a1a1a1] shadow-xl transition-transform duration-150 group-hover:scale-100">
                  {tool.name}{" "}
                  <span className="font-mono text-[#555]">({tool.shortcut})</span>
                </span>
              </button>
            );
          })}

          <button
            id="tool-image"
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Import Image (I)"
            className="group relative flex h-7 w-9 cursor-pointer items-center justify-center rounded text-[#707070] transition-colors hover:bg-[#222] hover:text-white"
          >
            <ImageIcon size={14} className="stroke-[2]" />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/png, image/jpeg, image/webp, image/svg+xml"
            className="hidden"
          />
        </div>
      )}

      <div className="flex items-center gap-3">
        {currentProject && (
          <>
            <div className="flex items-center gap-1 border-r border-[#222] pr-3">
              <button
                id="btn-undo"
                type="button"
                onClick={onUndo}
                disabled={!canUndo}
                title="Undo (Cmd/Ctrl + Z)"
                className={`rounded p-1 transition-colors ${
                  canUndo
                    ? "cursor-pointer text-white hover:bg-[#1a1a1a]"
                    : "cursor-not-allowed text-[#333]"
                }`}
              >
                <Undo2 size={14} />
              </button>
              <button
                id="btn-redo"
                type="button"
                onClick={onRedo}
                disabled={!canRedo}
                title="Redo (Cmd/Ctrl + Shift + Z)"
                className={`rounded p-1 transition-colors ${
                  canRedo
                    ? "cursor-pointer text-white hover:bg-[#1a1a1a]"
                    : "cursor-not-allowed text-[#333]"
                }`}
              >
                <Redo2 size={14} />
              </button>
            </div>

            <div className="flex items-center border-r border-[#222] pr-3">
              <button
                id="btn-toggle-grid"
                type="button"
                onClick={() => setShowGrid(!showGrid)}
                title="Toggle workspace grid"
                className={`cursor-pointer rounded border p-1 transition-colors ${
                  showGrid
                    ? "border-white/10 bg-[#1a1a1a] text-white"
                    : "border-transparent text-[#707070] hover:bg-[#1a1a1a] hover:text-white"
                }`}
              >
                <Grid size={14} />
              </button>
              <button
                id="btn-zoom-fit"
                type="button"
                onClick={onZoomToFit}
                title="Zoom to fit"
                className="ml-1 cursor-pointer rounded border border-transparent p-1 text-[#707070] transition-colors hover:bg-[#1a1a1a] hover:text-white"
              >
                <Maximize2 size={14} />
              </button>
            </div>

            <div className="flex items-center gap-3 rounded border border-[#333] bg-[#1a1a1a] px-2 py-1 font-mono text-[10px]">
              <span className="text-[#a1a1a1]">{Math.round(zoom * 100)}%</span>
              <div className="h-3 w-px bg-[#333]" />
              <div className="flex select-none gap-2">
                <button
                  type="button"
                  onClick={onZoomOut}
                  className="cursor-pointer px-1 font-bold text-white hover:text-indigo-400"
                >
                  −
                </button>
                <button
                  type="button"
                  onClick={onZoomIn}
                  className="cursor-pointer px-1 font-bold text-white hover:text-indigo-400"
                >
                  +
                </button>
              </div>
            </div>

            <ExportDropdown onExport={onExport} />
          </>
        )}
      </div>
    </div>
  );
}
