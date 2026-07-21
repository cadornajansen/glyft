import type { Canvas as FabricCanvas, FabricObject, Rect } from "fabric";

export interface AlignmentGuides {
  vertical: boolean;
  horizontal: boolean;
}

export interface CanvasSnappingServiceOptions {
  canvas: FabricCanvas;
  artboard: Rect;
  snapThreshold?: number;
  releaseThreshold?: number;
  guideColor?: string;
}

/**
 * Owns document-center snapping state and temporary guide rendering.
 *
 * Fabric object positions remain in document coordinates. Viewport transforms
 * are used only while drawing guides on the canvas context.
 */
export class CanvasSnappingService {
  private readonly snapThreshold: number;
  private readonly releaseThreshold: number;
  private readonly guideColor: string;

  private readonly guides: AlignmentGuides = {
    vertical: false,
    horizontal: false,
  };

  private readonly locks: AlignmentGuides = {
    vertical: false,
    horizontal: false,
  };

  public constructor(private readonly options: CanvasSnappingServiceOptions) {
    this.snapThreshold = options.snapThreshold ?? 8;
    this.releaseThreshold = options.releaseThreshold ?? 14;
    this.guideColor = options.guideColor ?? "#ec4899";
  }

  public snapToDocumentCenter(target: FabricObject): AlignmentGuides {
    const artboardWidth = this.options.artboard.width ?? 0;
    const artboardHeight = this.options.artboard.height ?? 0;
    const documentCenterX = artboardWidth / 2;
    const documentCenterY = artboardHeight / 2;

    // Fabric returns the object's center in canvas/document coordinates.
    const targetCenter = target.getCenterPoint();
    const deltaX = documentCenterX - targetCenter.x;
    const deltaY = documentCenterY - targetCenter.y;

    const verticalThreshold = this.locks.vertical
      ? this.releaseThreshold
      : this.snapThreshold;
    const horizontalThreshold = this.locks.horizontal
      ? this.releaseThreshold
      : this.snapThreshold;

    const snapVertical = Math.abs(deltaX) <= verticalThreshold;
    const snapHorizontal = Math.abs(deltaY) <= horizontalThreshold;

    if (snapVertical) {
      if (!this.locks.vertical) {
        target.set({ left: (target.left ?? 0) + deltaX });
      }
      this.locks.vertical = true;
      this.guides.vertical = true;
    } else {
      this.locks.vertical = false;
      this.guides.vertical = false;
    }

    if (snapHorizontal) {
      if (!this.locks.horizontal) {
        target.set({ top: (target.top ?? 0) + deltaY });
      }
      this.locks.horizontal = true;
      this.guides.horizontal = true;
    } else {
      this.locks.horizontal = false;
      this.guides.horizontal = false;
    }

    target.setCoords();
    return this.getGuides();
  }

  public drawGuides(context: CanvasRenderingContext2D): void {
    const viewport = this.options.canvas.viewportTransform;
    if (!viewport) return;

    const zoom = this.options.canvas.getZoom();
    const canvasWidth = this.options.canvas.getWidth();
    const canvasHeight = this.options.canvas.getHeight();
    const documentCenterX = (this.options.artboard.width ?? 0) / 2;
    const documentCenterY = (this.options.artboard.height ?? 0) / 2;

    context.save();
    context.strokeStyle = this.guideColor;
    context.lineWidth = 1;
    context.setLineDash([4, 4]);

    if (this.guides.vertical) {
      const viewportX = documentCenterX * zoom + viewport[4];
      context.beginPath();
      context.moveTo(viewportX, 0);
      context.lineTo(viewportX, canvasHeight);
      context.stroke();
    }

    if (this.guides.horizontal) {
      const viewportY = documentCenterY * zoom + viewport[5];
      context.beginPath();
      context.moveTo(0, viewportY);
      context.lineTo(canvasWidth, viewportY);
      context.stroke();
    }

    context.restore();
  }

  public reset(): void {
    this.guides.vertical = false;
    this.guides.horizontal = false;
    this.locks.vertical = false;
    this.locks.horizontal = false;
  }

  public getGuides(): AlignmentGuides {
    return { ...this.guides };
  }
}
