import type { Canvas as FabricCanvas, Rect } from "fabric";
import { useEditorStore } from "../stores/editorStore";
import { CanvasDocumentSerializer } from "./CanvasDocumentSerializer";
import { CanvasHistoryManager } from "./CanvasHistoryManager";
import { CanvasImageService } from "./CanvasImageService";
import { CanvasLayerService } from "./CanvasLayerService";
import { CanvasObjectFactory } from "./CanvasObjectFactory";
import { CanvasSelectionService } from "./CanvasSelectionService";
import { CanvasSnappingService } from "./CanvasSnappingService";
import { CanvasViewportController } from "./CanvasViewportController";

export interface CanvasServicesOptions {
  canvas: FabricCanvas;
  artboard: Rect;
  isDisposed: () => boolean;
  restoreHistorySnapshot: (snapshot: string) => Promise<void> | void;
}

/**
 * Central composition root for CanvasController collaborators.
 *
 * CanvasController remains responsible for orchestration while focused
 * services own document parsing, object creation, viewport behavior, image
 * import, snapping, selection projection, layers, and history transitions.
 */
export class CanvasServices {
  public readonly documents = new CanvasDocumentSerializer();
  public readonly objects = new CanvasObjectFactory();
  public readonly selection = new CanvasSelectionService();

  public readonly viewport: CanvasViewportController;
  public readonly images: CanvasImageService;
  public readonly snapping: CanvasSnappingService;
  public readonly layers: CanvasLayerService;
  public readonly history: CanvasHistoryManager;

  public constructor({
    canvas,
    artboard,
    isDisposed,
    restoreHistorySnapshot,
  }: CanvasServicesOptions) {
    const getDocumentSize = () => ({
      width: artboard.width ?? 0,
      height: artboard.height ?? 0,
    });

    this.viewport = new CanvasViewportController({
      canvas,
      getDocumentSize,
      onZoomChange: (zoom) => useEditorStore.getState().setZoom(zoom),
    });

    this.images = new CanvasImageService({
      canvas,
      getDocumentSize,
      isDisposed,
    });

    this.snapping = new CanvasSnappingService({
      canvas,
      artboard,
    });

    this.layers = new CanvasLayerService({
      canvas,
      isArtboard: (object) => Boolean((object as any).isArtboard),
    });

    this.history = new CanvasHistoryManager({
      restore: restoreHistorySnapshot,
      onStateChange: ({ canUndo, canRedo }) => {
        useEditorStore.getState().setHistoryState(canUndo, canRedo);
      },
    });
  }
}
