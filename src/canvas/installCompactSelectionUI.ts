import { Canvas as FabricCanvas, FabricObject } from "fabric";
import { CanvasController } from "./CanvasController";

const INSTALLED_FLAG = "__glyftCompactSelectionUIInstalled";
const ADD_PATCH_FLAG = "__glyftCompactSelectionAddPatched";

const selectionStyle = {
  borderColor: "#73a7ff",
  cornerColor: "#ffffff",
  cornerStrokeColor: "#73a7ff",
  cornerStyle: "rect" as const,
  cornerSize: 6,
  touchCornerSize: 14,
  transparentCorners: false,
  borderScaleFactor: 1,
  padding: 2,
  borderOpacityWhenMoving: 0.65,
};

function applyObjectStyle(object: FabricObject) {
  if ((object as FabricObject & { isArtboard?: boolean }).isArtboard) return;
  object.set(selectionStyle);
}

function applyPrototypeStyle() {
  Object.assign(FabricObject.prototype, selectionStyle);

  const rotationControl = FabricObject.prototype.controls?.mtr;
  if (rotationControl) {
    rotationControl.offsetY = -22;
    rotationControl.sizeX = 6;
    rotationControl.sizeY = 6;
  }
}

function applyCanvasStyle(controller: CanvasController) {
  const canvas = controller.canvas;
  if (!canvas) return;

  canvas.set({
    selectionColor: "rgba(115, 167, 255, 0.08)",
    selectionBorderColor: "#73a7ff",
    selectionLineWidth: 1,
  });

  canvas.getObjects().forEach(applyObjectStyle);
  canvas.requestRenderAll();
}

export function installCompactSelectionUI() {
  const prototype = CanvasController.prototype as unknown as {
    [INSTALLED_FLAG]?: boolean;
    updateZundandUI: (this: CanvasController) => void;
  };

  if (prototype[INSTALLED_FLAG]) return;
  prototype[INSTALLED_FLAG] = true;

  applyPrototypeStyle();

  const canvasPrototype = FabricCanvas.prototype as unknown as {
    [ADD_PATCH_FLAG]?: boolean;
    add: (...objects: FabricObject[]) => number;
  };

  if (!canvasPrototype[ADD_PATCH_FLAG]) {
    canvasPrototype[ADD_PATCH_FLAG] = true;
    const originalAdd = canvasPrototype.add;

    canvasPrototype.add = function compactStyledAdd(
      this: FabricCanvas,
      ...objects: FabricObject[]
    ) {
      applyPrototypeStyle();
      objects.forEach(applyObjectStyle);
      return originalAdd.apply(this, objects);
    };
  }

  const originalUpdateUI = prototype.updateZundandUI;

  prototype.updateZundandUI = function compactSelectionUpdateUI() {
    applyPrototypeStyle();
    applyCanvasStyle(this);
    originalUpdateUI.call(this);
  };
}
