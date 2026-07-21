import { Point, type Canvas as FabricCanvas, type TMat2D } from "fabric";

export interface DocumentPoint {
  x: number;
  y: number;
}

export interface CanvasViewportControllerOptions {
  canvas: FabricCanvas;
  getDocumentSize: () => { width: number; height: number };
  onZoomChange?: (zoom: number) => void;
}

/**
 * Owns viewport-only behavior such as zoom, pan, resize, fit-to-document,
 * and conversion between screen and document coordinates.
 *
 * Viewport state is intentionally kept separate from persisted object data.
 */
export class CanvasViewportController {
  private readonly canvas: FabricCanvas;
  private readonly getDocumentSize: () => { width: number; height: number };
  private readonly onZoomChange?: (zoom: number) => void;

  public constructor({
    canvas,
    getDocumentSize,
    onZoomChange,
  }: CanvasViewportControllerOptions) {
    this.canvas = canvas;
    this.getDocumentSize = getDocumentSize;
    this.onZoomChange = onZoomChange;
  }

  public zoomToFit(padding = 60): number {
    const canvasWidth = this.canvas.getWidth();
    const canvasHeight = this.canvas.getHeight();
    const { width: documentWidth, height: documentHeight } =
      this.getDocumentSize();

    if (documentWidth <= 0 || documentHeight <= 0) {
      return this.canvas.getZoom();
    }

    const availableWidth = Math.max(1, canvasWidth - padding * 2);
    const availableHeight = Math.max(1, canvasHeight - padding * 2);
    const zoom = Math.min(
      availableWidth / documentWidth,
      availableHeight / documentHeight,
    );

    const translateX = (canvasWidth - documentWidth * zoom) / 2;
    const translateY = (canvasHeight - documentHeight * zoom) / 2;
    const viewportTransform = [
      zoom,
      0,
      0,
      zoom,
      translateX,
      translateY,
    ] as TMat2D;

    this.canvas.setViewportTransform(viewportTransform);
    this.canvas.requestRenderAll();
    this.onZoomChange?.(zoom);

    return zoom;
  }

  public setZoom(zoomValue: number): number {
    const zoom = this.clampZoom(zoomValue);
    const center = new Point(
      this.canvas.getWidth() / 2,
      this.canvas.getHeight() / 2,
    );

    this.canvas.zoomToPoint(center, zoom);
    this.canvas.requestRenderAll();
    this.onZoomChange?.(zoom);

    return zoom;
  }

  public zoomIn(step = 0.1): number {
    return this.setZoom(this.canvas.getZoom() + step);
  }

  public zoomOut(step = 0.1): number {
    return this.setZoom(this.canvas.getZoom() - step);
  }

  public zoomTo100(): number {
    return this.setZoom(1);
  }

  public resize(width: number, height: number): void {
    this.canvas.setDimensions({ width, height });
    this.canvas.requestRenderAll();
  }

  public panBy(deltaX: number, deltaY: number): void {
    const viewportTransform = this.getViewportTransform();
    viewportTransform[4] += deltaX;
    viewportTransform[5] += deltaY;

    this.canvas.setViewportTransform(viewportTransform);
    this.canvas.requestRenderAll();
  }

  public viewportToDocumentPoint(
    viewportX: number,
    viewportY: number,
  ): DocumentPoint {
    const viewportTransform = this.canvas.viewportTransform;

    if (!viewportTransform) {
      return { x: viewportX, y: viewportY };
    }

    const scaleX = viewportTransform[0] || 1;
    const scaleY = viewportTransform[3] || 1;

    return {
      x: (viewportX - viewportTransform[4]) / scaleX,
      y: (viewportY - viewportTransform[5]) / scaleY,
    };
  }

  public documentToViewportPoint(
    documentX: number,
    documentY: number,
  ): DocumentPoint {
    const viewportTransform = this.canvas.viewportTransform;

    if (!viewportTransform) {
      return { x: documentX, y: documentY };
    }

    return {
      x: documentX * viewportTransform[0] + viewportTransform[4],
      y: documentY * viewportTransform[3] + viewportTransform[5],
    };
  }

  private getViewportTransform(): TMat2D {
    return this.canvas.viewportTransform
      ? ([...this.canvas.viewportTransform] as TMat2D)
      : ([1, 0, 0, 1, 0, 0] as TMat2D);
  }

  private clampZoom(value: number): number {
    return Math.max(0.05, Math.min(20, value));
  }
}
