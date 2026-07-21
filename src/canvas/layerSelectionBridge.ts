import { ActiveSelection, type FabricObject } from "fabric";
import { CanvasController } from "./CanvasController";
import { useEditorStore } from "../stores/editorStore";

const MULTI_SELECTION_PREFIX = "__glyft_layer_selection__:";
const installedFlag = Symbol.for("glyft.layerSelectionBridge.installed");

export function encodeLayerSelection(ids: string[]) {
  return `${MULTI_SELECTION_PREFIX}${JSON.stringify(ids)}`;
}

function readSelectionIds(controller: CanvasController) {
  return (controller.canvas?.getActiveObjects() ?? [])
    .map((object) => (object as FabricObject & { id?: string }).id)
    .filter((id): id is string => Boolean(id));
}

export function installLayerSelectionBridge() {
  const prototype = CanvasController.prototype as CanvasController & {
    [installedFlag]?: boolean;
    updateZundandUI: () => void;
    selectObjectById: (id: string) => void;
  };

  if (prototype[installedFlag]) return;
  prototype[installedFlag] = true;

  const originalUpdateUI = prototype.updateZundandUI;
  const originalSelectObjectById = prototype.selectObjectById;

  prototype.updateZundandUI = function updateZustandWithSelectionIds() {
    originalUpdateUI.call(this);
    useEditorStore.getState().setSelectedObjectIds(readSelectionIds(this));
  };

  prototype.selectObjectById = function selectLayerObjects(selectionKey: string) {
    if (!selectionKey.startsWith(MULTI_SELECTION_PREFIX)) {
      originalSelectObjectById.call(this, selectionKey);
      return;
    }

    if (!this.canvas) return;

    let ids: string[] = [];

    try {
      const parsed = JSON.parse(selectionKey.slice(MULTI_SELECTION_PREFIX.length));
      if (Array.isArray(parsed)) {
        ids = parsed.filter((id): id is string => typeof id === "string");
      }
    } catch {
      return;
    }

    const idSet = new Set(ids);
    const objects = this.canvas
      .getObjects()
      .filter((object) => !(object as FabricObject & { isArtboard?: boolean }).isArtboard)
      .filter((object) => {
        const id = (object as FabricObject & { id?: string }).id;
        return Boolean(id && idSet.has(id));
      });

    this.canvas.discardActiveObject();

    if (objects.length === 1) {
      this.canvas.setActiveObject(objects[0]);
    } else if (objects.length > 1) {
      this.canvas.setActiveObject(
        new ActiveSelection(objects, {
          canvas: this.canvas,
        }),
      );
    }

    this.canvas.requestRenderAll();
    this.updateZundandUI();
  };
}