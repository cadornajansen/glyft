import { IText, Rect, Shadow, type FabricObject } from "fabric";
import type { ActiveProperties } from "../stores/editorStore";

export interface CanvasSelectionSnapshot {
  selectedObjectCount: number;
  activeProperties: ActiveProperties | null;
}

/**
 * Converts Fabric selection state into the serializable inspector state used
 * by the React properties panel. It does not mutate the canvas or Zustand.
 */
export class CanvasSelectionService {
  public createSnapshot(activeObjects: FabricObject[]): CanvasSelectionSnapshot {
    if (activeObjects.length !== 1) {
      return {
        selectedObjectCount: activeObjects.length,
        activeProperties: null,
      };
    }

    const object = activeObjects[0];
    const shadow = object.shadow as Shadow | null;

    return {
      selectedObjectCount: 1,
      activeProperties: {
        id: (object as any).id,
        type: object.type,
        fill: typeof object.fill === "string" ? object.fill : "#000000",
        stroke: typeof object.stroke === "string" ? object.stroke : "",
        strokeWidth: object.strokeWidth ?? 0,
        opacity: object.opacity ?? 1,
        rx: (object as Rect).rx ?? 0,
        shadowColor: shadow?.color ?? "",
        shadowBlur: shadow?.blur ?? 0,
        shadowOffsetX: shadow?.offsetX ?? 0,
        shadowOffsetY: shadow?.offsetY ?? 0,
        left: Math.round(object.left ?? 0),
        top: Math.round(object.top ?? 0),
        width: Math.round((object.width ?? 0) * (object.scaleX ?? 1)),
        height: Math.round((object.height ?? 0) * (object.scaleY ?? 1)),
        angle: Math.round(object.angle ?? 0),
        flipX: Boolean(object.flipX),
        flipY: Boolean(object.flipY),
        fontFamily: (object as IText).fontFamily ?? "Inter",
        fontSize: (object as IText).fontSize ?? 24,
        fontWeight: (object as IText).fontWeight ?? "normal",
        textAlign: (object as IText).textAlign ?? "left",
        lineHeight: (object as IText).lineHeight ?? 1.16,
        charSpacing: (object as IText).charSpacing ?? 0,
      },
    };
  }
}
