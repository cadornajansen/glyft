import React, { useEffect, useRef, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Toolbar } from './components/Toolbar';
import { PropertiesPanel } from './components/PropertiesPanel';
import { LayersPanel } from './components/LayersPanel';
import { StatusBar } from './components/StatusBar';
import { CanvasController } from './canvas/CanvasController';
import { useEditorStore, type ActiveProperties } from './stores/editorStore';
import { getAllProjects, saveProject, db } from './db/projectDb';
import { type Project } from './types';
import { 
  Copy, 
  Clipboard, 
  Trash2, 
  FlipHorizontal, 
  FlipVertical, 
  ChevronUp, 
  ChevronDown, 
  Info 
} from 'lucide-react';

const SEED_PROJECT_ID = 'seed-og-template';

export default function App() {
  const { 
    currentProjectId, 
    setCurrentProjectId, 
    currentProject, 
    setCurrentProject,
    showGrid,
    isRightSidebarOpen,
    setRightSidebarOpen,
    selectedObjectCount,
    activeProperties
  } = useEditorStore();

  const [isSaving, setIsSaving] = useState(false);
  const canvasControllerRef = useRef<CanvasController | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // States for interactive UI features
  const [layersPanelHeight, setLayersPanelHeight] = useState(240);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const isResizingRef = useRef(false);

  // 1. Initial Database Seeding
  useEffect(() => {
    async function initDb() {
      const projects = await getAllProjects();
      if (projects.length === 0) {
        // Create an incredibly polished default onboarding project
        const seedProject: Project = {
          id: SEED_PROJECT_ID,
          name: 'Developer Social OG Banner',
          width: 1200,
          height: 630,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          canvasData: JSON.stringify({
            objects: [
              {
                type: 'rect',
                left: 100,
                top: 50,
                width: 1000,
                height: 530,
                fill: '#0a0a0c',
                rx: 24,
                ry: 24,
                name: 'Card Outline Base',
                stroke: '#1e1e24',
                strokeWidth: 4,
              },
              {
                type: 'circle',
                left: 750,
                top: 100,
                radius: 140,
                fill: '#4f46e5',
                opacity: 0.16,
                name: 'Indigo Ambient Glow',
              },
              {
                type: 'circle',
                left: 850,
                top: 180,
                radius: 90,
                fill: '#06b6d4',
                opacity: 0.12,
                name: 'Cyan Accent Glow',
              },
              {
                type: 'itext',
                left: 180,
                top: 180,
                text: 'glyft Graphics Editor',
                fontFamily: 'Space Grotesk, sans-serif',
                fontSize: 52,
                fill: '#fafafa',
                fontWeight: 'bold',
                name: 'Main Display Title',
              },
              {
                type: 'itext',
                left: 180,
                top: 260,
                text: 'Fast, code-focused developer web assets in seconds.',
                fontFamily: 'Inter, sans-serif',
                fontSize: 22,
                fill: '#a1a1aa',
                name: 'Helper Subtitle',
              },
              {
                type: 'itext',
                left: 180,
                top: 360,
                text: 'V : Select   |   R : Rect   |   C : Circle   |   T : Text   |   I : Image',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 14,
                fill: '#6366f1',
                fontWeight: 'bold',
                name: 'Shortcuts Visual Guide',
              },
              {
                type: 'rect',
                left: 180,
                top: 420,
                width: 130,
                height: 32,
                fill: '#18181b',
                rx: 6,
                ry: 6,
                name: 'Button Container',
                stroke: '#27272a',
                strokeWidth: 1,
              },
              {
                type: 'itext',
                left: 205,
                top: 426,
                text: 'Get Started ↗',
                fontFamily: 'Inter, sans-serif',
                fontSize: 12,
                fill: '#e4e4e7',
                fontWeight: 'bold',
                name: 'Button Text',
              }
            ],
          }),
        };

        await saveProject(seedProject);
        setCurrentProjectId(SEED_PROJECT_ID);
        setCurrentProject(seedProject);
        loadProjectIntoCanvas(seedProject);
      } else {
        // Load the last updated project
        const lastProj = projects[0];
        setCurrentProjectId(lastProj.id);
        setCurrentProject(lastProj);
        loadProjectIntoCanvas(lastProj);
      }
    }
    initDb();
  }, []);

  // 2. Load Project into Fabric Canvas
  const loadProjectIntoCanvas = (project: Project) => {
    // Clean up previous canvas if any
    if (canvasControllerRef.current) {
      canvasControllerRef.current.dispose();
    }

    const container = document.getElementById('canvas-container');
    const width = container?.clientWidth || 900;
    const height = container?.clientHeight || 600;

    const controller = new CanvasController(
      'fabric-canvas',
      width,
      height,
      project,
      (thumbnail, canvasData) => {
        // Autosave callback from fabric events
        setIsSaving(true);
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

        saveTimeoutRef.current = setTimeout(async () => {
          const updatedProj = {
            ...project,
            thumbnail,
            canvasData,
            updatedAt: Date.now(),
          };
          await saveProject(updatedProj);
          setCurrentProject(updatedProj);
          setIsSaving(false);
        }, 1200); // Debounce database saves
      }
    );

    canvasControllerRef.current = controller;

    // Zoom to fit centered
    setTimeout(() => {
      controller.zoomToFit();
    }, 100);
  };

  const handleLoadProject = async (id: string) => {
    const proj = await db.projects.get(id);
    if (proj) {
      setCurrentProjectId(proj.id);
      setCurrentProject(proj);
      loadProjectIntoCanvas(proj);
    }
  };

  // 3. Responsive Resize Support (Centers Viewport Transform automatically)
  useEffect(() => {
    const container = document.getElementById('canvas-container');
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (canvasControllerRef.current) {
          canvasControllerRef.current.resize(width, height);
        }
      }
    });

    observer.observe(container);
    return () => {
      observer.disconnect();
    };
  }, []);

  // 4. Grid visibility sync
  useEffect(() => {
    if (canvasControllerRef.current) {
      canvasControllerRef.current.toggleGrid(showGrid);
    }
  }, [showGrid]);

  // 4.5 Active Tool sync
  const activeTool = useEditorStore((state) => state.activeTool);
  useEffect(() => {
    if (canvasControllerRef.current) {
      canvasControllerRef.current.syncActiveTool(activeTool);
    }
  }, [activeTool]);

  // 5. Global Keyboard Shortcuts listener with Copy / Paste
  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      const active = document.activeElement;
      if (active && (
        active.tagName === 'INPUT' || 
        active.tagName === 'TEXTAREA' || 
        active.getAttribute('contenteditable') === 'true'
      )) {
        return; // Ignore shortcuts in typing fields
      }

      const ctrlOrCmd = e.metaKey || e.ctrlKey;

      // Zoom Shortcuts
      if (ctrlOrCmd) {
        if (e.key === '0') {
          e.preventDefault();
          canvasControllerRef.current?.zoomToFit();
          return;
        }
        if (e.key === '1') {
          e.preventDefault();
          canvasControllerRef.current?.zoomTo100();
          return;
        }
        if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          canvasControllerRef.current?.zoomIn();
          return;
        }
        if (e.key === '-') {
          e.preventDefault();
          canvasControllerRef.current?.zoomOut();
          return;
        }
      }

      // Copy
      if (ctrlOrCmd && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        canvasControllerRef.current?.copySelected();
      }

      // Paste
      if (ctrlOrCmd && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        canvasControllerRef.current?.pasteSelected();
      }

      // Undo
      if (ctrlOrCmd && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          canvasControllerRef.current?.redo();
        } else {
          e.preventDefault();
          canvasControllerRef.current?.undo();
        }
      }

      // Redo (alternate)
      if (ctrlOrCmd && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        canvasControllerRef.current?.redo();
      }

      // Delete
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        canvasControllerRef.current?.deleteSelected();
      }

      // Duplicate
      if (ctrlOrCmd && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        canvasControllerRef.current?.duplicateSelected();
      }

      // Group
      if (ctrlOrCmd && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        canvasControllerRef.current?.groupSelected();
      }

      // Select tool
      if (e.key.toLowerCase() === 'v' && !ctrlOrCmd) {
        e.preventDefault();
        useEditorStore.getState().setActiveTool('select');
      }

      // Pan tool
      if (e.key.toLowerCase() === 'h' && !ctrlOrCmd) {
        e.preventDefault();
        useEditorStore.getState().setActiveTool('pan');
      }

      // Rectangle tool
      if (e.key.toLowerCase() === 'r' && !ctrlOrCmd) {
        e.preventDefault();
        canvasControllerRef.current?.addRectangle();
      }

      // Circle tool
      if (e.key.toLowerCase() === 'c' && !ctrlOrCmd) {
        e.preventDefault();
        canvasControllerRef.current?.addCircle();
      }

      // Text tool
      if (e.key.toLowerCase() === 't' && !ctrlOrCmd) {
        e.preventDefault();
        canvasControllerRef.current?.addText();
      }

      // Image / File upload triggers on 'I'
      if (e.key.toLowerCase() === 'i' && !ctrlOrCmd) {
        e.preventDefault();
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        fileInput?.click();
      }
    };

    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => {
      window.removeEventListener('keydown', handleGlobalShortcuts);
    };
  }, []);

  // 6. Action handlers
  const handleAddRectangle = () => canvasControllerRef.current?.addRectangle();
  const handleAddCircle = () => canvasControllerRef.current?.addCircle();
  const handleAddLine = () => canvasControllerRef.current?.addLine();
  const handleAddArrow = () => canvasControllerRef.current?.addArrow();
  const handleAddText = () => canvasControllerRef.current?.addText();
  const handleUndo = () => canvasControllerRef.current?.undo();
  const handleRedo = () => canvasControllerRef.current?.redo();
  const handleZoomToFit = () => canvasControllerRef.current?.zoomToFit();
  const handleAddImage = (url: string) => canvasControllerRef.current?.addImage(url);
  const handleAddSVG = (svg: string) => canvasControllerRef.current?.addSVG(svg);
  
  const handleSetProperty = (key: keyof ActiveProperties, value: any) => {
    canvasControllerRef.current?.setProperty(key, value);
  };

  const handleSetArtboardProperty = (key: 'width' | 'height' | 'fill', value: any) => {
    canvasControllerRef.current?.setArtboardProperty(key, value);
  };

  const handleExport = async (format: 'png' | 'jpeg' | 'svg' | 'webp') => {
    if (!canvasControllerRef.current) return;
    const url = await canvasControllerRef.current.exportToImage(format);
    if (url) {
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentProject?.name || 'asset'}.${format === 'jpeg' ? 'jpg' : format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  // Close context menu on global click
  useEffect(() => {
    const handleGlobalClick = () => setContextMenu(null);
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  // Intercept right-clicks for custom Context Menu
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const container = document.getElementById('canvas-container');
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setContextMenu({ x, y });
  };

  // Resizable layout logic
  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;
    document.addEventListener('mousemove', handleResizeMouseMove);
    document.addEventListener('mouseup', handleResizeMouseUp);
  };

  const handleResizeMouseMove = (e: MouseEvent) => {
    if (!isResizingRef.current) return;
    const windowHeight = window.innerHeight;
    const newHeight = windowHeight - e.clientY - 40; // 40px offsets for status bar and spacing
    setLayersPanelHeight(Math.max(120, Math.min(newHeight, 600)));
  };

  const handleResizeMouseUp = () => {
    isResizingRef.current = false;
    document.removeEventListener('mousemove', handleResizeMouseMove);
    document.removeEventListener('mouseup', handleResizeMouseUp);
  };

  return (
    <div id="glyft-app-root" className="flex h-screen w-screen flex-col overflow-hidden bg-[#050505] font-sans text-zinc-200 antialiased selection:bg-white/10 select-none">
      {/* Top Header Panel */}
      <Toolbar
        onAddRectangle={handleAddRectangle}
        onAddCircle={handleAddCircle}
        onAddLine={handleAddLine}
        onAddArrow={handleAddArrow}
        onAddText={handleAddText}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onZoomToFit={handleZoomToFit}
        onZoomIn={() => canvasControllerRef.current?.zoomIn()}
        onZoomOut={() => canvasControllerRef.current?.zoomOut()}
        onExport={handleExport}
        onAddImage={handleAddImage}
      />

      <div className="flex flex-1 w-full overflow-hidden">
        {/* Left Side: Projects, Starter preset options, File Drag Import */}
        <Sidebar
          onLoadProject={handleLoadProject}
          onAddImage={handleAddImage}
          onAddSVG={handleAddSVG}
        />

        {/* Center Canvas Viewport */}
        <div 
          id="canvas-container" 
          className="relative flex-1 h-full w-full overflow-hidden bg-[#050505] flex items-center justify-center cursor-default"
          onContextMenu={handleContextMenu}
        >
          {currentProject ? (
            <canvas id="fabric-canvas" className="w-full h-full block" />
          ) : (
            <div className="flex flex-col items-center justify-center text-center text-[#707070] max-w-sm p-6 border border-[#222] bg-[#0a0a0a] rounded shadow-2xl">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" className="mb-4">
                <path d="M12 3v18M3 12h18" strokeLinecap="round"/>
              </svg>
              <h2 className="text-xs font-bold text-white mb-1.5 uppercase tracking-widest">No Open Document</h2>
              <p className="text-[11px] text-[#707070] leading-relaxed">
                Choose a beautiful design template from the left presets or create an asset from scratch to start designing.
              </p>
            </div>
          )}

          {/* Context Menu Popup */}
          {contextMenu && (
            <div 
              className="absolute z-50 min-w-[170px] bg-[#0c0c0e]/95 border border-[#222] rounded-lg shadow-2xl p-1 text-xs select-none backdrop-blur-md"
              style={{ top: contextMenu.y, left: contextMenu.x }}
              onClick={(e) => e.stopPropagation()}
            >
              {selectedObjectCount > 0 ? (
                <>
                  <button 
                    onClick={() => { canvasControllerRef.current?.copySelected(); setContextMenu(null); }}
                    className="flex w-full items-center gap-2 px-2.5 py-1.5 rounded hover:bg-[#161616] text-zinc-300 hover:text-white text-left font-medium cursor-pointer"
                  >
                    <Copy size={12} className="text-zinc-500" />
                    <span>Copy Object</span>
                    <span className="ml-auto text-[9px] text-zinc-600 font-mono">⌘C</span>
                  </button>
                  <button 
                    onClick={() => { canvasControllerRef.current?.duplicateSelected(); setContextMenu(null); }}
                    className="flex w-full items-center gap-2 px-2.5 py-1.5 rounded hover:bg-[#161616] text-zinc-300 hover:text-white text-left font-medium cursor-pointer"
                  >
                    <Copy size={12} className="text-zinc-500" />
                    <span>Duplicate</span>
                    <span className="ml-auto text-[9px] text-zinc-600 font-mono">⌘D</span>
                  </button>
                  <hr className="my-1 border-[#222]" />
                  <button 
                    onClick={() => { canvasControllerRef.current?.flipHorizontal(); setContextMenu(null); }}
                    className="flex w-full items-center gap-2 px-2.5 py-1.5 rounded hover:bg-[#161616] text-zinc-300 hover:text-white text-left font-medium cursor-pointer"
                  >
                    <FlipHorizontal size={12} className="text-zinc-500" />
                    <span>Flip Horizontal</span>
                  </button>
                  <button 
                    onClick={() => { canvasControllerRef.current?.flipVertical(); setContextMenu(null); }}
                    className="flex w-full items-center gap-2 px-2.5 py-1.5 rounded hover:bg-[#161616] text-zinc-300 hover:text-white text-left font-medium cursor-pointer"
                  >
                    <FlipVertical size={12} className="text-zinc-500" />
                    <span>Flip Vertical</span>
                  </button>
                  <hr className="my-1 border-[#222]" />
                  <button 
                    onClick={() => { canvasControllerRef.current?.bringToFront(); setContextMenu(null); }}
                    className="flex w-full items-center gap-2 px-2.5 py-1.5 rounded hover:bg-[#161616] text-zinc-300 hover:text-white text-left font-medium cursor-pointer"
                  >
                    <ChevronUp size={12} className="text-zinc-500" />
                    <span>Bring to Front</span>
                  </button>
                  <button 
                    onClick={() => { canvasControllerRef.current?.sendToBack(); setContextMenu(null); }}
                    className="flex w-full items-center gap-2 px-2.5 py-1.5 rounded hover:bg-[#161616] text-zinc-300 hover:text-white text-left font-medium cursor-pointer"
                  >
                    <ChevronDown size={12} className="text-zinc-500" />
                    <span>Send to Back</span>
                  </button>
                  <hr className="my-1 border-[#222]" />
                  <button 
                    onClick={() => { canvasControllerRef.current?.deleteSelected(); setContextMenu(null); }}
                    className="flex w-full items-center gap-2 px-2.5 py-1.5 rounded hover:bg-red-500/10 text-red-400 hover:text-red-300 text-left font-semibold cursor-pointer"
                  >
                    <Trash2 size={12} className="text-red-500/60" />
                    <span>Delete</span>
                    <span className="ml-auto text-[9px] text-zinc-600 font-mono">⌫</span>
                  </button>
                </>
              ) : (
                <>
                  <button 
                    disabled={!canvasControllerRef.current?.hasClipboard()}
                    onClick={() => { canvasControllerRef.current?.pasteSelected(); setContextMenu(null); }}
                    className={`flex w-full items-center gap-2 px-2.5 py-1.5 rounded text-left font-medium ${
                      canvasControllerRef.current?.hasClipboard() 
                        ? 'hover:bg-[#161616] text-zinc-300 hover:text-white cursor-pointer' 
                        : 'opacity-40 text-zinc-600 cursor-not-allowed'
                    }`}
                  >
                    <Clipboard size={12} className="text-zinc-500" />
                    <span>Paste Object</span>
                    <span className="ml-auto text-[9px] text-zinc-600 font-mono">⌘V</span>
                  </button>
                  <hr className="my-1 border-[#222]" />
                  <div className="px-2.5 py-1 text-[10px] text-zinc-500 italic flex items-center gap-1.5 max-w-[180px]">
                    <Info size={10} className="shrink-0 text-zinc-600" />
                    <span>Right-click object for full context options</span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Properties & Layer Inspect Panels */}
        {currentProject && isRightSidebarOpen && (
          <div id="right-sidebars-container" className="flex flex-col h-full border-l border-[#222] bg-[#0a0a0a] w-80">
            {/* Top Properties Style Inspector */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              <PropertiesPanel
                onSetProperty={handleSetProperty}
                onSetArtboardProperty={handleSetArtboardProperty}
                onDeleteSelected={() => canvasControllerRef.current?.deleteSelected()}
                onDuplicateSelected={() => canvasControllerRef.current?.duplicateSelected()}
                onGroupSelected={() => canvasControllerRef.current?.groupSelected()}
                onUngroupSelected={() => canvasControllerRef.current?.ungroupSelected()}
                onLockSelected={() => canvasControllerRef.current?.lockSelected()}
                onUnlockSelected={(id) => canvasControllerRef.current?.unlockSelected(id)}
              />
            </div>
            
            {/* Resize Slider Grip between Properties & Layers */}
            <div 
              className="h-1 bg-[#161616] hover:bg-zinc-800 active:bg-zinc-700 cursor-row-resize transition-colors flex items-center justify-center border-t border-b border-[#222] shrink-0"
              onMouseDown={handleResizeMouseDown}
              title="Drag to resize panels"
            >
              <div className="w-8 h-[2px] rounded-full bg-[#333]" />
            </div>

            {/* Bottom Layers Listing Inspector with interactive height */}
            <div style={{ height: layersPanelHeight }} className="shrink-0 flex flex-col border-t border-[#222] bg-[#0a0a0a]">
              <LayersPanel
                onReorderLayer={(id, dir) => canvasControllerRef.current?.reorderLayer(id, dir)}
                onRenameLayer={(id, name) => canvasControllerRef.current?.renameLayer(id, name)}
                onToggleVisibility={(id) => canvasControllerRef.current?.toggleLayerVisibility(id)}
                onToggleLock={(id) => canvasControllerRef.current?.toggleLayerLock(id)}
                onDragReorder={(srcIdx, dstIdx) => canvasControllerRef.current?.reorderLayersByIndex(srcIdx, dstIdx)}
                onSelectLayer={(id) => canvasControllerRef.current?.selectObjectById(id)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Bottom Status bar */}
      <StatusBar isSaving={isSaving} />
    </div>
  );
}
