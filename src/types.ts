export const CANVAS_DOCUMENT_VERSION = 3;

export interface CanvasObjectData extends Record<string, unknown> {
  id?: string;
  name?: string;
  type?: string;
  left?: number;
  top?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  objects?: CanvasObjectData[];
}

export interface CanvasDocument {
  version: number;
  templateVersion?: number;
  background?: string;
  artboardLeft?: number;
  artboardTop?: number;
  objects: CanvasObjectData[];
}

export interface Project {
  id: string;
  name: string;
  width: number;
  height: number;
  createdAt: number;
  updatedAt: number;
  thumbnail?: string; // base64 image representation
  canvasData: string; // JSON string of a versioned canvas document
}

export type ToolType =
  | "select"
  | "rectangle"
  | "circle"
  | "line"
  | "arrow"
  | "text"
  | "image"
  | "pan";

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
