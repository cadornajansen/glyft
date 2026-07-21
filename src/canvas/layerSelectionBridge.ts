import {
  ActiveSelection,
  Group,
  type FabricObject,
} from "fabric";
import { CanvasController } from "./CanvasController";
import { useEditorStore } from "../stores/editorStore";

const MULTI_SELECTION_PREFIX = "__glyft_layer_selection__:";
const INSTALLED_FLAG = "__glyftLayerSelectionBridgeInstalled";

type LayerObject = FabricObject & {
  id?: string;
  isArtboard?: boolean;
};

interface RuntimeController {
  canvas: CanvasController["canvas"];
  updateZundandUI: () => void;
}

type PatchedPrototype = {
  [INSTALLED_FLAG]?: boolean;
  updateZundandUI: (this: RuntimeController) => void;
  selectObjectById: (this: RuntimeController, id: string) => void;
};

export function encodeLayerSelection(ids: string[]) {
  return `${MULTI_SELECTION_PREFIX}${JSON.stringify(ids)}`;
}

function readSelectionIds(controller: RuntimeController) {
  return (controller.canvas?.getActiveObjects() ?? [])
    .map((object) => (object as LayerObject).id)
    .filter((id): id is string => Boolean(id));
}

function findNestedObject(object: FabricObject, id: string): FabricObject | undefined {
  if ((object as LayerObject).id === id) return object;

  if (object instanceof Group) {
    for (const child of object.getObjects()) {
      const found = findNestedObject(child, id);
      if (found) return found;
    }
  }

  return undefined;
}

function findObjectsByIds(controller: RuntimeController, ids: string[]) {
  if (!controller.canvas) return [];

  const remainingIds = new Set(ids);
  const foundObjects: FabricObject[] = [];

  for (const object of controller.canvas.getObjects()) {
    if ((object as LayerObject).isArtboard) continue;

    for (const id of Array.from(remainingIds)) {
      const found = findNestedObject(object, id);
      if (!found) continue;

      foundObjects.push(found);
      remainingIds.delete(id);
    }

    if (remainingIds.size === 0) break;
  }

  return foundObjects;
}

export function installLayerSelectionBridge() {
  const prototype = CanvasController.prototype as unknown as PatchedPrototype;

  if (prototype[INSTALLED_FLAG]) return;
  prototype[INSTALLED_FLAG] = true;

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

    const objects = findObjectsByIds(this, ids);
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
