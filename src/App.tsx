import React, { useEffect, useRef, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Toolbar } from './components/Toolbar';
import { PropertiesPanel } from './components/PropertiesPanel';
import { LayersPanel } from './components/LayersPanel';
import { StatusBar } from './components/StatusBar';
import { AppErrorBoundary } from "./components/AppErrorBoundary";
import { DocumentRecoveryDialog } from "./components/DocumentRecoveryDialog";
import { CanvasController } from "./canvas/CanvasController";
import { useEditorStore, type ActiveProperties } from "./stores/editorStore";
import { getAllProjects, saveProject, deleteProject, db } from "./db/projectDb";
import { saveProjectCanvasState } from "./db/saveProjectCanvasState";
import { updateProjectDimensions } from "./db/updateProjectMetadata";
import { type Project } from "./types";
import {
  createDefaultOgTemplateProject,
  DEFAULT_OG_TEMPLATE_PROJECT_ID,
  DEFAULT_OG_TEMPLATE_VERSION,
} from "./templates/defaultOgTemplate";
import {
  Copy,
  Clipboard,
  Trash2,
  FlipHorizontal,
  FlipVertical,
  ChevronUp,
  ChevronDown,
  Info,
} from "lucide-react";

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
    activeProperties,
    canvasLoadError,
    setCanvasLoadError,
  } = useEditorStore();

  const [isSaving, setIsSaving] = useState(false);
  const canvasControllerRef = useRef<CanvasController | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const controllerGenerationRef = useRef(0);

  // States for interactive UI features
  const [layersPanelHeight, setLayersPanelHeight] = useState(240);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const isResizingRef = useRef(false);

  // 1. Initial Database Seeding
  useEffect(() => {
    async function initDb() {
      const seedTemplateProject = createDefaultOgTemplateProject();
      let projects = await getAllProjects();

      const seedProject = projects.find(
        (project) => project.id === DEFAULT_OG_TEMPLATE_PROJECT_ID,
      );

      if (seedProject) {
        let savedTemplateVersion = 0;

        try {
          const parsedCanvasData = JSON.parse(seedProject.canvasData) as {
            templateVersion?: unknown;
          };
          savedTemplateVersion =
            typeof parsedCanvasData.templateVersion === "number"
              ? parsedCanvasData.templateVersion
              : 0;
        } catch {
          savedTemplateVersion = 0;
        }

        if (savedTemplateVersion < DEFAULT_OG_TEMPLATE_VERSION) {
          const repairedSeedProject: Project = {
            ...seedProject,
            width: seedTemplateProject.width,
            height: seedTemplateProject.height,
            canvasData: seedTemplateProject.canvasData,
            updatedAt: Date.now(),
          };

          await saveProject(repairedSeedProject);
          projects = await getAllProjects();
        }
      }

      if (projects.length === 0) {
        await saveProject(seedTemplateProject);
        setCurrentProjectId(seedTemplateProject.id);
        setCurrentProject(seedTemplateProject);
        await loadProjectIntoCanvas(seedTemplateProject);
      } else {
        // Load the last updated project
        const lastProj = projects[0];
        setCurrentProjectId(lastProj.id);
        setCurrentProject(lastProj);
        await loadProjectIntoCanvas(lastProj);
      }
    }
    initDb();
  }, []);

  // 2. Load Project into Fabric Canvas
  const clearPendingSave = () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
  };

  const disposeCurrentController = () => {
    controllerGenerationRef.current += 1;
    clearPendingSave();
    canvasControllerRef.current?.dispose();
    canvasControllerRef.current = null;
    setIsSaving(false);
    useEditorStore.getState().resetEditorSession();
  };

  const loadProjectIntoCanvas = async (project: Project) => {
    disposeCurrentController();
    // Clear any stale document error from the previous project
    useEditorStore.getState().setCanvasLoadError(null);

    const container = document.getElementById("canvas-container");
    const width = container?.clientWidth || 900;
    const height = container?.clientHeight || 600;
    const generation = ++controllerGenerationRef.current;
    const projectId = project.id;

    const controller = new CanvasController(
      "fabric-canvas",
      width,
      height,
      project,
      (thumbnail, canvasData) => {
        if (generation !== controllerGenerationRef.current) return;
        if (projectId !== useEditorStore.getState().currentProjectId) return;

        // Autosave callback from fabric events
        setIsSaving(true);
        clearPendingSave();

        saveTimeoutRef.current = setTimeout(async () => {
          if (generation !== controllerGenerationRef.current) {
            setIsSaving(false);
            return;
          }

          const storeStateBefore = useEditorStore.getState();
          if (
            storeStateBefore.currentProjectId !== projectId ||
            !storeStateBefore.currentProject ||
            storeStateBefore.currentProject.id !== projectId
          ) {
            setIsSaving(false);
            return;
          }

          const updatedProj = await saveProjectCanvasState(
            projectId,
            canvasData,
            thumbnail,
            Date.now(),
          );

          if (!updatedProj) {
            setIsSaving(false);
            return;
          }

          if (generation !== controllerGenerationRef.current) {
            setIsSaving(false);
            return;
          }

          const storeStateAfter = useEditorStore.getState();
          if (storeStateAfter.currentProjectId === projectId) {
            setCurrentProject(updatedProj);
          }
          // Signal sidebar to re-query the project list so thumbnails/timestamps refresh
          useEditorStore.getState().notifyAutosaved(Date.now());
          setIsSaving(false);
        }, 1200); // Debounce database saves
      },
      (err) => {
        // onLoadError: canvas document failed to parse
        useEditorStore.getState().setCanvasLoadError(
          err instanceof Error ? err.message : "Unknown document error"
        );
      },
    );

    canvasControllerRef.current = controller;

    // Zoom to fit centered after objects are fully loaded
    controller.readyPromise.then(() => {
      if (
        generation !== controllerGenerationRef.current ||
        canvasControllerRef.current !== controller
      ) {
        return;
      }

      controller.zoomToFit();
    });
  };

  const handleLoadProject = async (id: string) => {
    try {
      const proj = await db.projects.get(id);
      if (proj) {
        setCurrentProjectId(proj.id);
        setCurrentProject(proj);
        await loadProjectIntoCanvas(proj);
      }
    } catch (error) {
      console.error("Failed to load project", error);
    }
  };

  const handleResetToProjects = () => {
    disposeCurrentController();
    setCurrentProjectId(null);
    setCurrentProject(null);
    setIsSaving(false);
  };

  const handleDeleteProject = async (projectId: string) => {
    const isActive = currentProjectId === projectId;

    if (!isActive) {
      try {
        await deleteProject(projectId);
      } catch (error) {
        console.error("Failed to delete project", error);
      }
      return;
    }

    const activeProjectSnapshot = currentProject;
    controllerGenerationRef.current += 1;
    clearPendingSave();
    setIsSaving(false);
    canvasControllerRef.current?.dispose();
    canvasControllerRef.current = null;
    useEditorStore.getState().resetEditorSession();

    try {
      await deleteProject(projectId);

      const remainingProjects = await getAllProjects();
      const nextProject = remainingProjects[0] ?? null;

      if (nextProject) {
        setCurrentProjectId(nextProject.id);
        setCurrentProject(nextProject);
        await loadProjectIntoCanvas(nextProject);
      } else {
        setCurrentProjectId(null);
        setCurrentProject(null);
      }
    } catch (error) {
      console.error("Failed to delete project", error);
      setIsSaving(false);

      if (activeProjectSnapshot) {
        setCurrentProjectId(activeProjectSnapshot.id);
        setCurrentProject(activeProjectSnapshot);
        await loadProjectIntoCanvas(activeProjectSnapshot);
      }
    }
  };

  // 3. Responsive Resize Support
  useEffect(() => {
    const container = document.getElementById("canvas-container");
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
      if (
        active &&
        (active.tagName === "INPUT" ||
          active.tagName === "TEXTAREA" ||
          active.getAttribute("contenteditable") === "true")
      ) {
        return; // Ignore shortcuts in typing fields
      }

      const ctrlOrCmd = e.metaKey || e.ctrlKey;

      // Zoom Shortcuts
      if (ctrlOrCmd) {
        if (e.key === "0") {
          e.preventDefault();
          canvasControllerRef.current?.zoomToFit();
          return;
        }
        if (e.key === "1") {
          e.preventDefault();
          canvasControllerRef.current?.zoomTo100();
          return;
        }
        if (e.key === "=" || e.key === "+") {
          e.preventDefault();
          canvasControllerRef.current?.zoomIn();
          return;
        }
        if (e.key === "-") {
          e.preventDefault();
          canvasControllerRef.current?.zoomOut();
          return;
        }
      }

      // Copy
      if (ctrlOrCmd && e.key.toLowerCase() === "c") {
        e.preventDefault();
        canvasControllerRef.current?.copySelected();
      }

      // Paste
      if (ctrlOrCmd && e.key.toLowerCase() === "v") {
        e.preventDefault();
        canvasControllerRef.current?.pasteSelected();
      }

      // Undo
      if (ctrlOrCmd && e.key.toLowerCase() === "z") {
        if (e.shiftKey) {
          e.preventDefault();
          canvasControllerRef.current?.redo();
        } else {
          e.preventDefault();
          canvasControllerRef.current?.undo();
        }
      }

      // Redo (alternate)
      if (ctrlOrCmd && e.key.toLowerCase() === "y") {
        e.preventDefault();
        canvasControllerRef.current?.redo();
      }

      // Delete
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        canvasControllerRef.current?.deleteSelected();
      }

      // Duplicate
      if (ctrlOrCmd && e.key.toLowerCase() === "d") {
        e.preventDefault();
        canvasControllerRef.current?.duplicateSelected();
      }

      // Group
      if (ctrlOrCmd && e.key.toLowerCase() === "g") {
        e.preventDefault();
        canvasControllerRef.current?.groupSelected();
      }

      // Select tool
      if (e.key.toLowerCase() === "v" && !ctrlOrCmd) {
        e.preventDefault();
        useEditorStore.getState().setActiveTool("select");
      }

      // Pan tool
      if (e.key.toLowerCase() === "h" && !ctrlOrCmd) {
        e.preventDefault();
        useEditorStore.getState().setActiveTool("pan");
      }

      // Rectangle tool
      if (e.key.toLowerCase() === "r" && !ctrlOrCmd) {
        e.preventDefault();
        canvasControllerRef.current?.addRectangle();
      }

      // Circle tool
      if (e.key.toLowerCase() === "c" && !ctrlOrCmd) {
        e.preventDefault();
        canvasControllerRef.current?.addCircle();
      }

      // Text tool
      if (e.key.toLowerCase() === "t" && !ctrlOrCmd) {
        e.preventDefault();
        canvasControllerRef.current?.addText();
      }

      // Image / File upload triggers on 'I'
      if (e.key.toLowerCase() === "i" && !ctrlOrCmd) {
        e.preventDefault();
        const fileInput = document.querySelector(
          'input[type="file"]',
        ) as HTMLInputElement;
        fileInput?.click();
      }
    };

    window.addEventListener("keydown", handleGlobalShortcuts);
    return () => {
      window.removeEventListener("keydown", handleGlobalShortcuts);
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
  const handleAddImage = (url: string, position?: { x: number; y: number }) => {
    canvasControllerRef.current?.addImage(url, position);
  };
  const handleCanvasDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  };

  const handleCanvasDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();

    const file = event.dataTransfer.files?.[0];

    if (!file || !file.type.startsWith("image/")) return;

    const controller = canvasControllerRef.current;
    const container = document.getElementById("canvas-container");

    if (!controller || !container) return;

    const rect = container.getBoundingClientRect();

    const viewportX = event.clientX - rect.left;
    const viewportY = event.clientY - rect.top;

    const documentPoint = controller.viewportToDocumentPoint(
      viewportX,
      viewportY,
    );

    if (file.type === "image/svg+xml") {
      const reader = new FileReader();

      reader.onload = (loadEvent) => {
        const svg = loadEvent.target?.result;

        if (typeof svg === "string") {
          canvasControllerRef.current?.addSVG(svg, documentPoint);
        }
      };

      reader.readAsText(file);
      return;
    }

    const reader = new FileReader();

    reader.onload = (loadEvent) => {
      const dataUrl = loadEvent.target?.result;

      if (typeof dataUrl === "string") {
        canvasControllerRef.current?.addImage(dataUrl, documentPoint);
      }
    };

    reader.readAsDataURL(file);
  };

  const handleAddSVG = (svg: string) =>
    canvasControllerRef.current?.addSVG(svg);
  const handleSetProperty = (key: keyof ActiveProperties, value: any) => {
    canvasControllerRef.current?.setProperty(key, value);
  };

  const handleSetArtboardProperty = async (
    key: "width" | "height" | "fill",
    value: any,
  ) => {
    if (!canvasControllerRef.current) return;

    if (key === "width" || key === "height") {
      const store = useEditorStore.getState();
      const currentProj = store.currentProject;
      if (currentProj) {
        const newWidth = key === "width" ? (parseInt(value) || 100) : currentProj.width;
        const newHeight = key === "height" ? (parseInt(value) || 100) : currentProj.height;

        const updated = await updateProjectDimensions(
          currentProj.id,
          newWidth,
          newHeight,
        );
        if (updated && store.currentProjectId === currentProj.id) {
          store.setCurrentProject(updated);
        }
      }
    }

    canvasControllerRef.current.setArtboardProperty(key, value);
  };
  const handleExport = async (format: "png" | "jpeg" | "svg" | "webp") => {
    if (!canvasControllerRef.current) return;
    const url = await canvasControllerRef.current.exportToImage(format);
    if (url) {
      const a = document.createElement("a");
      a.href = url;
      a.download = `${currentProject?.name || "asset"}.${format === "jpeg" ? "jpg" : format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  // Close context menu on global click
  useEffect(() => {
    const handleGlobalClick = () => setContextMenu(null);
    window.addEventListener("click", handleGlobalClick);
    return () => window.removeEventListener("click", handleGlobalClick);
  }, []);

  // Intercept right-clicks for custom Context Menu
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const container = document.getElementById("canvas-container");
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
    document.addEventListener("mousemove", handleResizeMouseMove);
    document.addEventListener("mouseup", handleResizeMouseUp);
  };

  const handleResizeMouseMove = (e: MouseEvent) => {
    if (!isResizingRef.current) return;
    const windowHeight = window.innerHeight;
    const newHeight = windowHeight - e.clientY - 40; // 40px offsets for status bar and spacing
    setLayersPanelHeight(Math.max(120, Math.min(newHeight, 600)));
  };

  const handleResizeMouseUp = () => {
    isResizingRef.current = false;
    document.removeEventListener("mousemove", handleResizeMouseMove);
    document.removeEventListener("mouseup", handleResizeMouseUp);
  };

  // 7. Document recovery handlers
  const handleRecoveryKeepBlank = () => {
    setCanvasLoadError(null);
    // Trigger autosave with an empty canvas so the blank state is persisted
    if (canvasControllerRef.current) {
      canvasControllerRef.current.saveToHistory();
      void canvasControllerRef.current.triggerAutosave();
    }
  };

  const handleRecoveryDelete = async () => {
    setCanvasLoadError(null);
    if (currentProjectId) {
      await handleDeleteProject(currentProjectId);
    }
  };

  const appShell = (
    <div
      id="glyft-app-root"
      className="flex h-screen w-screen flex-col overflow-hidden bg-[#050505] font-sans text-zinc-200 antialiased selection:bg-white/10 select-none"
    >
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
          onDeleteProject={handleDeleteProject}
          onAddImage={handleAddImage}
          onAddSVG={handleAddSVG}
        />

        {/* Center Canvas Viewport */}
        <div
          id="canvas-container"
          className="relative flex-1 h-full w-full overflow-hidden bg-[#050505] flex items-center justify-center cursor-default"
          onContextMenu={handleContextMenu}
          onDragOver={handleCanvasDragOver}
          onDrop={handleCanvasDrop}
        >
          {currentProject ? (
            <canvas id="fabric-canvas" className="w-full h-full block" />
          ) : (
            <div className="flex flex-col items-center justify-center text-center text-[#707070] max-w-sm p-6 border border-[#222] bg-[#0a0a0a] rounded shadow-2xl">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                className="mb-4"
              >
                <path d="M12 3v18M3 12h18" strokeLinecap="round" />
              </svg>
              <h2 className="text-xs font-bold text-white mb-1.5 uppercase tracking-widest">
                No Open Document
              </h2>
              <p className="text-[11px] text-[#707070] leading-relaxed">
                Choose a beautiful design template from the left presets or
                create an asset from scratch to start designing.
              </p>
            </div>
          )}

          {/* Context Menu Popup */}
          {contextMenu && (
            <div
              className="absolute z-50 min-w-42.5 bg-[#0c0c0e]/95 border border-[#222] rounded-lg shadow-2xl p-1 text-xs select-none backdrop-blur-md"
              style={{ top: contextMenu.y, left: contextMenu.x }}
              onClick={(e) => e.stopPropagation()}
            >
              {selectedObjectCount > 0 ? (
                <>
                  <button
                    onClick={() => {
                      canvasControllerRef.current?.copySelected();
                      setContextMenu(null);
                    }}
                    className="flex w-full items-center gap-2 px-2.5 py-1.5 rounded hover:bg-[#161616] text-zinc-300 hover:text-white text-left font-medium cursor-pointer"
                  >
                    <Copy size={12} className="text-zinc-500" />
                    <span>Copy Object</span>
                    <span className="ml-auto text-[9px] text-zinc-600 font-mono">
                      ⌘C
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      canvasControllerRef.current?.duplicateSelected();
                      setContextMenu(null);
                    }}
                    className="flex w-full items-center gap-2 px-2.5 py-1.5 rounded hover:bg-[#161616] text-zinc-300 hover:text-white text-left font-medium cursor-pointer"
                  >
                    <Copy size={12} className="text-zinc-500" />
                    <span>Duplicate</span>
                    <span className="ml-auto text-[9px] text-zinc-600 font-mono">
                      ⌘D
                    </span>
                  </button>
                  <hr className="my-1 border-[#222]" />
                  <button
                    onClick={() => {
                      canvasControllerRef.current?.flipHorizontal();
                      setContextMenu(null);
                    }}
                    className="flex w-full items-center gap-2 px-2.5 py-1.5 rounded hover:bg-[#161616] text-zinc-300 hover:text-white text-left font-medium cursor-pointer"
                  >
                    <FlipHorizontal size={12} className="text-zinc-500" />
                    <span>Flip Horizontal</span>
                  </button>
                  <button
                    onClick={() => {
                      canvasControllerRef.current?.flipVertical();
                      setContextMenu(null);
                    }}
                    className="flex w-full items-center gap-2 px-2.5 py-1.5 rounded hover:bg-[#161616] text-zinc-300 hover:text-white text-left font-medium cursor-pointer"
                  >
                    <FlipVertical size={12} className="text-zinc-500" />
                    <span>Flip Vertical</span>
                  </button>
                  <hr className="my-1 border-[#222]" />
                  <button
                    onClick={() => {
                      canvasControllerRef.current?.bringToFront();
                      setContextMenu(null);
                    }}
                    className="flex w-full items-center gap-2 px-2.5 py-1.5 rounded hover:bg-[#161616] text-zinc-300 hover:text-white text-left font-medium cursor-pointer"
                  >
                    <ChevronUp size={12} className="text-zinc-500" />
                    <span>Bring to Front</span>
                  </button>
                  <button
                    onClick={() => {
                      canvasControllerRef.current?.sendToBack();
                      setContextMenu(null);
                    }}
                    className="flex w-full items-center gap-2 px-2.5 py-1.5 rounded hover:bg-[#161616] text-zinc-300 hover:text-white text-left font-medium cursor-pointer"
                  >
                    <ChevronDown size={12} className="text-zinc-500" />
                    <span>Send to Back</span>
                  </button>
                  <hr className="my-1 border-[#222]" />
                  <button
                    onClick={() => {
                      canvasControllerRef.current?.deleteSelected();
                      setContextMenu(null);
                    }}
                    className="flex w-full items-center gap-2 px-2.5 py-1.5 rounded hover:bg-red-500/10 text-red-400 hover:text-red-300 text-left font-semibold cursor-pointer"
                  >
                    <Trash2 size={12} className="text-red-500/60" />
                    <span>Delete</span>
                    <span className="ml-auto text-[9px] text-zinc-600 font-mono">
                      ⌫
                    </span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    disabled={!canvasControllerRef.current?.hasClipboard()}
                    onClick={() => {
                      canvasControllerRef.current?.pasteSelected();
                      setContextMenu(null);
                    }}
                    className={`flex w-full items-center gap-2 px-2.5 py-1.5 rounded text-left font-medium ${
                      canvasControllerRef.current?.hasClipboard()
                        ? "hover:bg-[#161616] text-zinc-300 hover:text-white cursor-pointer"
                        : "opacity-40 text-zinc-600 cursor-not-allowed"
                    }`}
                  >
                    <Clipboard size={12} className="text-zinc-500" />
                    <span>Paste Object</span>
                    <span className="ml-auto text-[9px] text-zinc-600 font-mono">
                      ⌘V
                    </span>
                  </button>
                  <hr className="my-1 border-[#222]" />
                  <div className="px-2.5 py-1 text-[10px] text-zinc-500 italic flex items-center gap-1.5 max-w-45">
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
          <div
            id="right-sidebars-container"
            className="flex flex-col h-full border-l border-[#222] bg-[#0a0a0a] w-80"
          >
            {/* Top Properties Style Inspector */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              <PropertiesPanel
                onSetProperty={handleSetProperty}
                onSetArtboardProperty={handleSetArtboardProperty}
                onDeleteSelected={() =>
                  canvasControllerRef.current?.deleteSelected()
                }
                onDuplicateSelected={() =>
                  canvasControllerRef.current?.duplicateSelected()
                }
                onGroupSelected={() =>
                  canvasControllerRef.current?.groupSelected()
                }
                onUngroupSelected={() =>
                  canvasControllerRef.current?.ungroupSelected()
                }
                onLockSelected={() =>
                  canvasControllerRef.current?.lockSelected()
                }
                onUnlockSelected={(id) =>
                  canvasControllerRef.current?.unlockSelected(id)
                }
              />
            </div>

            {/* Resize Slider Grip between Properties & Layers */}
            <div
              className="h-1 bg-[#161616] hover:bg-zinc-800 active:bg-zinc-700 cursor-row-resize transition-colors flex items-center justify-center border-t border-b border-[#222] shrink-0"
              onMouseDown={handleResizeMouseDown}
              title="Drag to resize panels"
            >
              <div className="w-8 h-0.5 rounded-full bg-[#333]" />
            </div>

            {/* Bottom Layers Listing Inspector with interactive height */}
            <div
              style={{ height: layersPanelHeight }}
              className="shrink-0 flex flex-col border-t border-[#222] bg-[#0a0a0a]"
            >
              <LayersPanel
                onReorderLayer={(id, dir) =>
                  canvasControllerRef.current?.reorderLayer(id, dir)
                }
                onRenameLayer={(id, name) =>
                  canvasControllerRef.current?.renameLayer(id, name)
                }
                onToggleVisibility={(id) =>
                  canvasControllerRef.current?.toggleLayerVisibility(id)
                }
                onToggleLock={(id) =>
                  canvasControllerRef.current?.toggleLayerLock(id)
                }
                onDragReorder={(srcIdx, dstIdx) =>
                  canvasControllerRef.current?.reorderLayersByIndex(
                    srcIdx,
                    dstIdx,
                  )
                }
                onSelectLayer={(id) =>
                  canvasControllerRef.current?.selectObjectById(id)
                }
              />
            </div>
          </div>
        )}
      </div>

      {/* Bottom Status bar */}
      <StatusBar isSaving={isSaving} />

      {/* Document recovery overlay */}
      {canvasLoadError && currentProject && (
        <DocumentRecoveryDialog
          projectName={currentProject.name}
          errorMessage={canvasLoadError}
          onKeepBlank={handleRecoveryKeepBlank}
          onDeleteProject={handleRecoveryDelete}
          onDismiss={() => setCanvasLoadError(null)}
        />
      )}
    </div>
  );

  return (
    <AppErrorBoundary onReset={handleResetToProjects}>
      {appShell}
    </AppErrorBoundary>
  );
}
