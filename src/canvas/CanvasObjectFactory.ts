import {
  Circle,
  FabricObject,
  Image as FabricImage,
  IText,
  Line,
  Path,
  Rect,
  type TOptions,
} from "fabric";
import type { CanvasObjectData } from "../types";

export type ImageElementLoader = (source: string) => Promise<HTMLImageElement>;

/**
 * Creates Fabric objects from Glyft's persisted object data.
 *
 * This class intentionally does not add objects to a canvas, update editor
 * state, or trigger persistence. It only owns object construction and shared
 * document-coordinate defaults.
 */
export class CanvasObjectFactory {
  public constructor(
    private readonly loadImageElement: ImageElementLoader =
      CanvasObjectFactory.loadImageElement,
  ) {}

  public async create(objectData: CanvasObjectData): Promise<FabricObject | null> {
    const options = this.createOptions(objectData);

    let object: FabricObject | null = null;

    switch (objectData.type?.toLowerCase()) {
      case "rect":
        object = new Rect(options);
        break;

      case "circle":
        object = new Circle(options);
        break;

      case "line":
        object = new Line(
          [
            this.readCoordinate(objectData.x1),
            this.readCoordinate(objectData.y1),
            this.readCoordinate(objectData.x2),
            this.readCoordinate(objectData.y2),
          ],
          options,
        );
        break;

      case "path":
        object = new Path(objectData.path as string | any, options);
        break;

      case "itext":
        object = new IText(
          typeof objectData.text === "string" ? objectData.text : "Text",
          options,
        );
        break;

      case "image": {
        if (typeof objectData.src !== "string" || objectData.src.length === 0) {
          return null;
        }

        const imageElement = await this.loadImageElement(objectData.src);
        object = new FabricImage(imageElement, options);
        break;
      }

      default:
        return null;
    }

    this.applyMetadata(object, objectData);
    return object;
  }

  private createOptions(objectData: CanvasObjectData): TOptions<any> {
    const options: TOptions<any> = {
      ...objectData,
      originX: "left",
      originY: "top",
    };

    delete (options as any).type;
    delete (options as any).id;
    delete (options as any).name;

    return options;
  }

  private applyMetadata(
    object: FabricObject,
    objectData: CanvasObjectData,
  ): void {
    (object as any).id = objectData.id || crypto.randomUUID();
    (object as any).name =
      objectData.name || `${objectData.type?.toUpperCase() || "OBJECT"} Item`;

    object.set({
      originX: "left",
      originY: "top",
    });
    object.setCoords();
  }

  private readCoordinate(value: unknown): number {
    return typeof value === "number" && Number.isFinite(value) ? value : 0;
  }

  private static loadImageElement(source: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Image failed to load"));
      image.src = source;
    });
  }
}
