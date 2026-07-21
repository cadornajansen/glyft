import { create } from "zustand";
import { type Project, type ToolType } from "../types";

export interface ActiveProperties {
  id?: string;
  type?: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  rx?: number;
  ry?: number;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  angle?: number;
  flipX?: boolean;
  flipY?: boolean;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string | number;
  charSpacing?: number;
  lineHeight?: number;
  textAlign?: string;
  fontStyle?: string;
  underline?: boolean;
}

export interface EditorLayer {
  id: string;
  name: string;
  type: string;
  visible: boolean;
  locked: boolean;
}

interface EditorUIState {
  currentProjectId: string | null;
  currentProject: Project | null;
  activeTool: ToolType;
  zoom: number;
  showGrid: boolean;
  gridSize: number;
  selectedObjectCount: number;
  selectedObjectIds: string[];
  activeProperties: ActiveProperties | null;
  layers: EditorLayer[];
  canUndo: boolean;
  canRedo: boolean;
  isLeftSidebarOpen: boolean;
  activeTab: "projects" | "assets" | "export";
  isRightSidebarOpen: boolean;
  isPanning: boolean;

  setCurrentProjectId: (id: string | null) => void;
  setCurrentProject: (project: Project | null) => void;
  setActiveTool: (tool: ToolType) => void;
  setZoom: (zoom: number) => void;
  setShowGrid: (show: boolean) => void;
  setGridSize: (size: number) => void;
  setSelectedObjectCount: (count: number) => void;
  setSelectedObjectIds: (ids: string[]) => void;
  setActiveProperties: (props: ActiveProperties | null) => void;
  setLayers: (layers: EditorLayer[]) => void;
  setHistoryState: (canUndo: boolean, canRedo: boolean) => void;
  setLeftSidebarOpen: (open: boolean) => void;
  setActiveTab: (tab: "projects" | "assets" | "export") => void;
  setRightSidebarOpen: (open: boolean) => void;
  setIsPanning: (panning: boolean) => void;
  resetEditorSession: () => void;
}

export const useEditorStore = create<EditorUIState>((set) => ({
  currentProjectId: null,
  currentProject: null,
  activeTool: "select",
  zoom: 1,
  showGrid: false,
  gridSize: 20,
  selectedObjectCount: 0,
  selectedObjectIds: [],
  activeProperties: null,
  layers: [],
  canUndo: false,
  canRedo: false,
  isLeftSidebarOpen: true,
  activeTab: "projects",
  isRightSidebarOpen: true,
  isPanning: false,

  setCurrentProjectId: (id) => set({ currentProjectId: id }),
  setCurrentProject: (project) => set({ currentProject: project }),
  setActiveTool: (tool) => set({ activeTool: tool }),
  setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(10, zoom)) }),
  setShowGrid: (show) => set({ showGrid: show }),
  setGridSize: (size) => set({ gridSize: size }),
  setSelectedObjectCount: (count) => set({ selectedObjectCount: count }),
  setSelectedObjectIds: (ids) => set({ selectedObjectIds: ids }),
  setActiveProperties: (props) => set({ activeProperties: props }),
  setLayers: (layers) => set({ layers }),
  setHistoryState: (canUndo, canRedo) => set({ canUndo, canRedo }),
  setLeftSidebarOpen: (open) => set({ isLeftSidebarOpen: open }),
  setActiveTab: (tab) => set({ activeTab: tab, isLeftSidebarOpen: true }),
  setRightSidebarOpen: (open) => set({ isRightSidebarOpen: open }),
  setIsPanning: (panning) => set({ isPanning: panning }),
  resetEditorSession: () =>
    set({
      selectedObjectCount: 0,
      selectedObjectIds: [],
      activeProperties: null,
      layers: [],
      canUndo: false,
      canRedo: false,
      isPanning: false,
    }),
}));