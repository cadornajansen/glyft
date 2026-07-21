import React, { useRef } from 'react';
import { 
  MousePointer, 
  Square, 
  Circle as CircleIcon, 
  Minus, 
  TrendingUp, 
  Type, 
  Image as ImageIcon,
  Undo2,
  Redo2,
  Grid,
  Grid3X3,
  Maximize2,
  Download,
  Plus,
  Compass,
  FileDown,
  Hand
} from 'lucide-react';
import { useEditorStore } from '../stores/editorStore';
import { type ToolType } from '../types';

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
  onExport: (format: 'png' | 'jpeg' | 'svg' | 'webp') => void;
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
    setZoom,
    showGrid, 
    setShowGrid,
    canUndo,
    canRedo,
    currentProject
  } = useEditorStore();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const tools = [
    { id: 'select', name: 'Select', icon: MousePointer, shortcut: 'V', action: () => setActiveTool('select') },
    { id: 'pan', name: 'Pan / Hand', icon: Hand, shortcut: 'H', action: () => setActiveTool('pan') },
    { id: 'rectangle', name: 'Rectangle', icon: Square, shortcut: 'R', action: onAddRectangle },
    { id: 'circle', name: 'Circle', icon: CircleIcon, shortcut: 'C', action: onAddCircle },
    { id: 'line', name: 'Line', icon: Minus, shortcut: 'L', action: onAddLine },
    { id: 'arrow', name: 'Arrow', icon: TrendingUp, shortcut: 'A', action: onAddArrow },
    { id: 'text', name: 'Text', icon: Type, shortcut: 'T', action: onAddText },
  ];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        onAddImage(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleExportClick = (format: 'png' | 'jpeg' | 'svg' | 'webp') => {
    onExport(format);
  };

  return (
    <div 
      id="top-toolbar"
      className="z-20 flex h-12 w-full items-center justify-between border-b border-[#222] bg-[#0a0a0a] px-4"
    >
      {/* Title & Preset Indicator / Path */}
      <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-white font-semibold text-sm tracking-tight">Glyft</span>
          </div>
        
        {currentProject ? (
          <nav className="flex items-center gap-3 text-xs font-medium">
            <span className="text-[#707070]">Projects</span>
            <span className="text-[#707070]">/</span>
            <span id="header-project-name" className="text-white">
              {currentProject.name}
            </span>
            <span className="text-[10px] bg-[#1a1a1a] border border-[#333] text-[#707070] rounded px-1.5 py-0.5 font-mono">
              {currentProject.width}×{currentProject.height}px
            </span>
          </nav>
        ) : (
          <nav className="flex items-center gap-3 text-xs font-medium">
            <span className="text-[#707070]">Projects</span>
            <span className="text-[#707070]">/</span>
            <span className="text-[#707070]">No open project</span>
          </nav>
        )}
      </div>

      {/* Main Drawing Tools */}
      {currentProject && (
        <div className="flex items-center gap-1.5 bg-[#1a1a1a] border border-[#333] rounded px-2 py-1">
          {tools.map((t) => {
            const Icon = t.icon;
            const isActive = activeTool === t.id;
            return (
              <button
                key={t.id}
                id={`tool-${t.id}`}
                onClick={t.action}
                title={`${t.name} (${t.shortcut})`}
                className={`group relative flex h-7 w-9 items-center justify-center rounded transition-all cursor-pointer ${
                  isActive
                    ? 'bg-white text-black font-bold'
                    : 'text-[#707070] hover:text-white hover:bg-[#222]'
                }`}
              >
                <Icon size={14} className="stroke-[2]" />
                <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 transition-all duration-150 rounded bg-[#0a0a0a] border border-[#222] px-1.5 py-0.5 text-[9px] font-semibold text-[#a1a1a1] pointer-events-none whitespace-nowrap shadow-xl z-30">
                  {t.name} <span className="text-[#555] font-mono">({t.shortcut})</span>
                </span>
              </button>
            );
          })}

          <button
            id="tool-image"
            onClick={() => fileInputRef.current?.click()}
            title="Import Image (I)"
            className="group relative flex h-7 w-9 items-center justify-center rounded text-[#707070] hover:text-white hover:bg-[#222] transition-all cursor-pointer"
          >
            <ImageIcon size={14} className="stroke-[2]" />
            <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 transition-all duration-150 rounded bg-[#0a0a0a] border border-[#222] px-1.5 py-0.5 text-[9px] font-semibold text-[#a1a1a1] pointer-events-none whitespace-nowrap shadow-xl z-30">
              Import Image <span className="text-[#555] font-mono">(I)</span>
            </span>
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

      {/* Editor & View Operations */}
      <div className="flex items-center gap-3">
        {currentProject && (
          <>
            {/* Undo/Redo */}
            <div className="flex items-center border-r border-[#222] pr-3 gap-1">
              <button
                id="btn-undo"
                onClick={onUndo}
                disabled={!canUndo}
                title="Undo (Cmd/Ctrl + Z)"
                className={`p-1 rounded transition-colors cursor-pointer ${
                  canUndo ? 'text-white hover:bg-[#1a1a1a]' : 'text-[#333] cursor-not-allowed'
                }`}
              >
                <Undo2 size={14} />
              </button>
              <button
                id="btn-redo"
                onClick={onRedo}
                disabled={!canRedo}
                title="Redo (Cmd/Ctrl + Shift + Z)"
                className={`p-1 rounded transition-colors cursor-pointer ${
                  canRedo ? 'text-white hover:bg-[#1a1a1a]' : 'text-[#333] cursor-not-allowed'
                }`}
              >
                <Redo2 size={14} />
              </button>
            </div>

            {/* Grid Toggle */}
            <div className="flex items-center border-r border-[#222] pr-3">
              <button
                id="btn-toggle-grid"
                onClick={() => setShowGrid(!showGrid)}
                title="Toggle Workspace Grid"
                className={`p-1 rounded transition-colors cursor-pointer ${
                  showGrid ? 'text-white bg-[#1a1a1a] border border-white/10' : 'text-[#707070] hover:bg-[#1a1a1a] hover:text-white border border-transparent'
                }`}
              >
                <Grid size={14} />
              </button>
              <button
                id="btn-zoom-fit"
                onClick={onZoomToFit}
                title="Zoom to Fit"
                className="p-1 ml-1 rounded text-[#707070] hover:bg-[#1a1a1a] hover:text-white transition-colors border border-transparent cursor-pointer"
              >
                <Maximize2 size={14} />
              </button>
            </div>

            {/* Zoom Indicator Box exactly like the Design HTML */}
            <div className="flex items-center bg-[#1a1a1a] rounded px-2 py-1 gap-3 text-[10px] font-mono border border-[#333]">
              <span className="text-[#a1a1a1]">{Math.round(zoom * 100)}%</span>
              <div className="w-[1px] h-3 bg-[#333]"></div>
              <div className="flex gap-2 select-none">
                <span 
                  className="text-white cursor-pointer hover:text-indigo-400 font-bold px-1"
                  onClick={onZoomOut}
                >
                  -
                </span>
                <span 
                  className="text-white cursor-pointer hover:text-indigo-400 font-bold px-1"
                  onClick={onZoomIn}
                >
                  +
                </span>
              </div>
            </div>

            {/* Export Dropdown in style of the Design HTML */}
            <div className="relative group">
              <button
                id="btn-export-dropdown"
                className="bg-white text-black px-3 py-1.5 rounded text-xs font-bold hover:bg-[#e0e0e0] flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Download size={12} />
                Export
              </button>
              
              <div className="absolute right-0 top-full mt-1.5 w-36 origin-top-right rounded border border-[#222] bg-[#0a0a0a] p-1 shadow-2xl scale-0 group-hover:scale-100 transition-all duration-150 ease-out z-30">
                <button
                  id="export-png"
                  onClick={() => handleExportClick('png')}
                  className="flex w-full items-center justify-between rounded py-1.5 px-2 text-left text-xs text-[#a1a1a1] hover:bg-[#1a1a1a] hover:text-white cursor-pointer"
                >
                  <span>Crisp PNG (2x)</span>
                  <span className="text-[9px] font-semibold text-[#555] font-mono">PNG</span>
                </button>
                <button
                  id="export-webp"
                  onClick={() => handleExportClick('webp')}
                  className="flex w-full items-center justify-between rounded py-1.5 px-2 text-left text-xs text-[#a1a1a1] hover:bg-[#1a1a1a] hover:text-white cursor-pointer"
                >
                  <span>Modern WebP</span>
                  <span className="text-[9px] font-semibold text-[#555] font-mono">WebP</span>
                </button>
                <button
                  id="export-jpeg"
                  onClick={() => handleExportClick('jpeg')}
                  className="flex w-full items-center justify-between rounded py-1.5 px-2 text-left text-xs text-[#a1a1a1] hover:bg-[#1a1a1a] hover:text-white cursor-pointer"
                >
                  <span>Standard JPG</span>
                  <span className="text-[9px] font-semibold text-[#555] font-mono">JPG</span>
                </button>
                <button
                  id="export-svg"
                  onClick={() => handleExportClick('svg')}
                  className="flex w-full items-center justify-between rounded py-1.5 px-2 text-left text-xs text-[#a1a1a1] hover:bg-[#1a1a1a] hover:text-white cursor-pointer"
                >
                  <span>Vector SVG</span>
                  <span className="text-[9px] font-semibold text-[#555] font-mono">SVG</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
