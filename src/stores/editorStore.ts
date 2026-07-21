import { create } from 'zustand';
import { type Project, type ToolType } from '../types';

export interface ActiveProperties {
  id?: string;
  type?: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  rx?: number; // rounded corners for rectangle
  ry?: number;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  // Text specific
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string | number;
  charSpacing?: number;
  lineHeight?: number;
  textAlign?: string;
  fontStyle?: string;
  underline?: boolean;
}

interface EditorUIState {
  currentProjectId: string | null;
  currentProject: Project | null;
  activeTool: ToolType;
  zoom: number;
  showGrid: boolean;
  gridSize: number;
  selectedObjectCount: number;
  activeProperties: ActiveProperties | null;
  layers: { id: string; name: string; type: string; visible: boolean; locked: boolean }[];
  canUndo: boolean;
  canRedo: boolean;
  isLeftSidebarOpen: boolean;
  activeTab: 'projects' | 'assets' | 'export';
  isRightSidebarOpen: boolean;
  isPanning: boolean;
  
  // Actions
  setCurrentProjectId: (id: string | null) => void;
  setCurrentProject: (project: Project | null) => void;
  setActiveTool: (tool: ToolType) => void;
  setZoom: (zoom: number) => void;
  setShowGrid: (show: boolean) => void;
  setGridSize: (size: number) => void;
  setSelectedObjectCount: (count: number) => void;
  setActiveProperties: (props: ActiveProperties | null) => void;
  setLayers: (layers: { id: string; name: string; type: string; visible: boolean; locked: boolean }[]) => void;
  setHistoryState: (canUndo: boolean, canRedo: boolean) => void;
  setLeftSidebarOpen: (open: boolean) => void;
  setActiveTab: (tab: 'projects' | 'assets' | 'export') => void;
  setRightSidebarOpen: (open: boolean) => void;
  setIsPanning: (panning: boolean) => void;
}

export const useEditorStore = create<EditorUIState>((set) => ({
  currentProjectId: null,
  currentProject: null,
  activeTool: 'select',
  zoom: 1.0,
  showGrid: true,
  gridSize: 20,
  selectedObjectCount: 0,
  activeProperties: null,
  layers: [],
  canUndo: false,
  canRedo: false,
  isLeftSidebarOpen: true,
  activeTab: 'projects',
  isRightSidebarOpen: true,
  isPanning: false,

  setCurrentProjectId: (id) => set({ currentProjectId: id }),
  setCurrentProject: (project) => set({ currentProject: project }),
  setActiveTool: (tool) => set({ activeTool: tool }),
  setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(10, zoom)) }),
  setShowGrid: (show) => set({ showGrid: show }),
  setGridSize: (size) => set({ gridSize: size }),
  setSelectedObjectCount: (count) => set({ selectedObjectCount: count }),
  setActiveProperties: (props) => set({ activeProperties: props }),
  setLayers: (layers) => set({ layers }),
  setHistoryState: (canUndo, canRedo) => set({ canUndo, canRedo }),
  setLeftSidebarOpen: (open) => set({ isLeftSidebarOpen: open }),
  setActiveTab: (tab) => set({ activeTab: tab, isLeftSidebarOpen: true }),
  setRightSidebarOpen: (open) => set({ isRightSidebarOpen: open }),
  setIsPanning: (panning) => set({ isPanning: panning }),
}));
