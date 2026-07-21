export interface Project {
  id: string;
  name: string;
  width: number;
  height: number;
  createdAt: number;
  updatedAt: number;
  thumbnail?: string; // base64 image representation
  canvasData: string; // JSON string of fabric canvas
}

export type ToolType = 'select' | 'rectangle' | 'circle' | 'line' | 'arrow' | 'text' | 'image' | 'pan';

export interface EditorState {
  currentProject: Project | null;
  activeTool: ToolType;
  zoom: number;
  panX: number;
  panY: number;
  selectedIds: string[];
  isLocked: boolean;
  showGrid: boolean;
  gridSize: number;
}
