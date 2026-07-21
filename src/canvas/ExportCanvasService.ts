import {
  Canvas as FabricCanvas,
  StaticCanvas,
  type FabricObject,
} from "fabric";

export interface ExportCanvasOptions {
  sourceCanvas: FabricCanvas;
  documentWidth: number;
  documentHeight: number;
  documentBackground: string;
  documentOriginX: number;
  documentOriginY: number;
}

const DEFAULT_RASTER_SCALE = 2;
const MAX_EXPORT_PIXELS = 48_000_000;

export class ExportCanvasService {
  constructor(private readonly options: ExportCanvasOptions) {}

  public async exportRaster(
    format: "png" | "jpeg" | "webp",
    scale = DEFAULT_RASTER_SCALE,
  ): Promise<string> {
    const width = Math.round(this.options.documentWidth);
    const height = Math.round(this.options.documentHeight);

    if (width <= 0 || height <= 0) return "";

    const safeScale = this.getSafeRasterScale(width, height, scale);
    const exportCanvas = await this.createExportCanvas();
    if (!exportCanvas) return "";

    try {
      return exportCanvas.toDataURL({
        format,
        quality: format === "png" ? 1 : 0.96,
        multiplier: safeScale,
        left: 0,
        top: 0,
        width,
        height,
        enableRetinaScaling: false,
      });
    } finally {
      exportCanvas.dispose();
    }
  }

  public async exportSvg(): Promise<string> {
    const exportCanvas = await this.createExportCanvas();
    if (!exportCanvas) return "";

    try {
      const width = Math.round(this.options.documentWidth);
      const height = Math.round(this.options.documentHeight);

      return exportCanvas.toSVG({
        width: String(width),
        height: String(height),
        viewBox: {
          x: 0,
          y: 0,
          width,
          height,
        },
      });
    } finally {
      exportCanvas.dispose();
    }
  }

  public async createThumbnail(maxWidth = 320): Promise<string> {
    const width = Math.round(this.options.documentWidth);
    const height = Math.round(this.options.documentHeight);

    if (width <= 0 || height <= 0) return "";

    const scale = Math.min(1, maxWidth / width);
    return this.exportRaster("png", scale);
  }

  private async createExportCanvas(): Promise<StaticCanvas | null> {
    const width = Math.round(this.options.documentWidth);
    const height = Math.round(this.options.documentHeight);

    if (width <= 0 || height <= 0) return null;

    const element = document.createElement("canvas");
    const context = element.getContext("2d");

    if (context) {
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
    }

    const exportCanvas = new StaticCanvas(element, {
      width,
      height,
      backgroundColor: this.options.documentBackground || "#ffffff",
      renderOnAddRemove: false,
      enableRetinaScaling: false,
    });

    try {
      const sourceObjects = this.options.sourceCanvas
        .getObjects()
        .filter(
          (object) => object.visible !== false && !(object as any).isArtboard,
        );

      const clones = await Promise.all(
        sourceObjects.map(async (sourceObject) => {
          const clone = await sourceObject.clone();
          this.normalizeClone(clone);
          return clone;
        }),
      );

      exportCanvas.add(...clones);
      exportCanvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
      exportCanvas.renderAll();

      return exportCanvas;
    } catch (error) {
      exportCanvas.dispose();
      throw error;
    }
  }

  private normalizeClone(clone: FabricObject) {
    clone.set({
      left: (clone.left ?? 0) - this.options.documentOriginX,
      top: (clone.top ?? 0) - this.options.documentOriginY,
    });
    clone.setCoords();
  }

  private getSafeRasterScale(width: number, height: number, scale: number) {
    const requestedScale = Number.isFinite(scale) ? Math.max(0.1, scale) : 1;
    const requestedPixels = width * height * requestedScale * requestedScale;

    if (requestedPixels <= MAX_EXPORT_PIXELS) return requestedScale;

    return Math.sqrt(MAX_EXPORT_PIXELS / (width * height));
  }
}
