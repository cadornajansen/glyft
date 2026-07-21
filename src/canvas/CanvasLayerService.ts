import {
  Group,
  type Canvas as FabricCanvas,
  type FabricObject,
} from "fabric";

export interface CanvasLayer {
  id: string;
  name: string;
  type: string;
  visible: boolean;
  locked: boolean;
  parentId?: string;
  children?: CanvasLayer[];
}

export interface CanvasLayerServiceOptions {
  canvas: FabricCanvas;
  isArtboard?: (object: FabricObject) => boolean;
}

/**
 * Owns layer-list projection and basic layer state changes.
 * Persistence, history commits, and UI notifications remain in CanvasController.
 */
export class CanvasLayerService {
  public constructor(private readonly options: CanvasLayerServiceOptions) {}

  public list(): CanvasLayer[] {
    return this.getDocumentObjects()
      .slice()
      .reverse()
      .map((object) => this.toLayer(object));
  }

  public findById(id: string): FabricObject | undefined {
    for (const object of this.getDocumentObjects()) {
      const found = this.findInObject(object, id);
      if (found) return found;
    }

    return undefined;
  }

  public setVisibility(id: string, visible: boolean): boolean {
    const object = this.findById(id);
    if (!object) return false;

    object.set({ visible });
    object.setCoords();
    this.options.canvas.requestRenderAll();
    return true;
  }

  public setLocked(id: string, locked: boolean): boolean {
    const object = this.findById(id);
    if (!object) return false;

    (object as any).locked = locked;
    object.set({
      selectable: !locked,
      evented: !locked,
    });

    const activeObjects = this.options.canvas.getActiveObjects();
    if (locked && activeObjects.includes(object)) {
      this.options.canvas.discardActiveObject();
    }

    object.setCoords();
    this.options.canvas.requestRenderAll();
    return true;
  }

  public rename(id: string, name: string): boolean {
    const object = this.findById(id);
    const trimmedName = name.trim();

    if (!object || trimmedName.length === 0) return false;

    (object as any).name = trimmedName;
    return true;
  }

  public moveToIndex(id: string, layerIndex: number): boolean {
    const object = this.findById(id);
    if (!object || object.group) return false;

    const objects = this.getDocumentObjects();
    const clampedLayerIndex = Math.max(
      0,
      Math.min(objects.length - 1, layerIndex),
    );

    // Layer UI is top-first while Fabric stacking is bottom-first.
    const canvasIndex = objects.length - 1 - clampedLayerIndex;
    this.options.canvas.moveObjectTo(object, canvasIndex + 1);
    this.options.canvas.requestRenderAll();
    return true;
  }

  private toLayer(object: FabricObject, parentId?: string): CanvasLayer {
    const id = this.ensureObjectId(object);
    const layer: CanvasLayer = {
      id,
      name: String((object as any).name ?? object.type ?? "Object"),
      type: String(object.type ?? "object"),
      visible: object.visible !== false,
      locked: Boolean((object as any).locked),
      parentId,
    };

    if (object instanceof Group) {
      const children = object
        .getObjects()
        .slice()
        .reverse()
        .map((child) => this.toLayer(child, id));

      if (children.length > 0) layer.children = children;
    }

    return layer;
  }

  private findInObject(object: FabricObject, id: string): FabricObject | undefined {
    if (String((object as any).id ?? "") === id) return object;

    if (object instanceof Group) {
      for (const child of object.getObjects()) {
        const found = this.findInObject(child, id);
        if (found) return found;
      }
    }

    return undefined;
  }

  private ensureObjectId(object: FabricObject): string {
    const existingId = String((object as any).id ?? "");
    if (existingId) return existingId;

    const id = crypto.randomUUID();
    (object as any).id = id;
    return id;
  }

  private getDocumentObjects(): FabricObject[] {
    return this.options.canvas
      .getObjects()
      .filter((object) => !this.isArtboard(object));
  }

  private isArtboard(object: FabricObject): boolean {
    return this.options.isArtboard?.(object) ?? Boolean((object as any).isArtboard);
  }
}
