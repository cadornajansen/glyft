import {
  Canvas as FabricCanvas,
  Image as FabricImage,
  type TOptions,
} from "fabric";

export interface CanvasPoint {
  x: number;
  y: number;
}

export interface AddImageOptions {
  position?: CanvasPoint;
  maxWidth?: number;
  maxHeight?: number;
  name?: string;
}

export interface CanvasImageServiceOptions {
  canvas: FabricCanvas;
  getDocumentSize: () => { width: number; height: number };
  isDisposed?: () => boolean;
}

/**
 * Owns image decoding, proportional sizing, placement, and SVG image fallback.
 *
 * Canvas history, autosave, selection-state synchronization, and notifications
 * remain the responsibility of CanvasController.
 */
export class CanvasImageService {
  public constructor(private readonly options: CanvasImageServiceOptions) {}

  public async createImage(
    source: string,
    options: AddImageOptions = {},
  ): Promise<FabricImage | null> {
    if (this.isUnavailable()) return null;

    const imageElement = await this.loadImageElement(source);
    if (this.isUnavailable()) return null;

    const naturalWidth = imageElement.naturalWidth || imageElement.width;
    const naturalHeight = imageElement.naturalHeight || imageElement.height;

    if (naturalWidth <= 0 || naturalHeight <= 0) {
      throw new Error("Image has invalid intrinsic dimensions");
    }

    const documentSize = this.options.getDocumentSize();
    const maxWidth =
      options.maxWidth ?? Math.min(500, Math.max(1, documentSize.width * 0.6));
    const maxHeight =
      options.maxHeight ?? Math.min(500, Math.max(1, documentSize.height * 0.6));

    const scale = Math.min(
      1,
      maxWidth / naturalWidth,
      maxHeight / naturalHeight,
    );

    const displayedWidth = naturalWidth * scale;
    const displayedHeight = naturalHeight * scale;

    const left =
      options.position?.x ??
      Math.max(0, (documentSize.width - displayedWidth) / 2);
    const top =
      options.position?.y ??
      Math.max(0, (documentSize.height - displayedHeight) / 2);

    const fabricOptions: TOptions<any> = {
      left,
      top,
      originX: "left",
      originY: "top",
      width: naturalWidth,
      height: naturalHeight,
      scaleX: scale,
      scaleY: scale,
      opacity: 1,
    };

    const image = new FabricImage(imageElement, fabricOptions);
    (image as any).id = crypto.randomUUID();
    (image as any).name = options.name ?? "Image";
    image.setCoords();

    return image;
  }

  public async createSvgImage(
    svgString: string,
    options: AddImageOptions = {},
  ): Promise<FabricImage | null> {
    const blob = new Blob([svgString], { type: "image/svg+xml" });
    const objectUrl = URL.createObjectURL(blob);

    try {
      return await this.createImage(objectUrl, {
        ...options,
        name: options.name ?? "SVG Image",
      });
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  public addToCanvas(image: FabricImage): void {
    if (this.isUnavailable()) return;

    this.options.canvas.add(image);
    this.options.canvas.setActiveObject(image);
    this.options.canvas.requestRenderAll();
  }

  private isUnavailable(): boolean {
    return this.options.isDisposed?.() ?? false;
  }

  private loadImageElement(source: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Image failed to load"));
      image.src = source;
    });
  }
}
