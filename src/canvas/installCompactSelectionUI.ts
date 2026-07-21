import { FabricObject } from "fabric";
import { CanvasController } from "./CanvasController";

const INSTALLED_FLAG = "__glyftCompactSelectionUIInstalled";

type PatchedController = CanvasController & {
  initCanvas: (...args: unknown[]) => Promise<void>;
};

type PatchedPrototype = {
  [INSTALLED_FLAG]?: boolean;
  initCanvas: (this: PatchedController, ...args: unknown[]) => Promise<void>;
};

function applyCompactSelectionStyle(controller: CanvasController) {
  FabricObject.prototype.borderColor = "#73a7ff";
  FabricObject.prototype.cornerColor = "#ffffff";
  FabricObject.prototype.cornerStrokeColor = "#73a7ff";
  FabricObject.prototype.cornerStyle = "rect";
  FabricObject.prototype.cornerSize = 6;
  FabricObject.prototype.touchCornerSize = 14;
  FabricObject.prototype.transparentCorners = false;
  FabricObject.prototype.borderScaleFactor = 1;
  FabricObject.prototype.padding = 2;
  FabricObject.prototype.borderOpacityWhenMoving = 0.65;

  const rotationControl = FabricObject.prototype.controls?.mtr;
  if (rotationControl) {
    rotationControl.offsetY = -22;
    rotationControl.sizeX = 6;
    rotationControl.sizeY = 6;
  }

  if (!controller.canvas) return;

  controller.canvas.set({
    selectionColor: "rgba(115, 167, 255, 0.08)",
    selectionBorderColor: "#73a7ff",
    selectionLineWidth: 1,
  });

  controller.canvas.getObjects().forEach((object) => {
    if ((object as FabricObject & { isArtboard?: boolean }).isArtboard) return;

    object.set({
      borderColor: "#73a7ff",
      cornerColor: "#ffffff",
      cornerStrokeColor: "#73a7ff",
      cornerStyle: "rect",
      cornerSize: 6,
      touchCornerSize: 14,
      transparentCorners: false,
      borderScaleFactor: 1,
      padding: 2,
      borderOpacityWhenMoving: 0.65,
    });
  });

  controller.canvas.requestRenderAll();
}

export function installCompactSelectionUI() {
  const prototype = CanvasController.prototype as unknown as PatchedPrototype;

  if (prototype[INSTALLED_FLAG]) return;
  prototype[INSTALLED_FLAG] = true;

  const originalInitCanvas = prototype.initCanvas;

  prototype.initCanvas = async function compactSelectionInit(...args) {
    await originalInitCanvas.apply(this, args);
    applyCompactSelectionStyle(this);
  };
}
