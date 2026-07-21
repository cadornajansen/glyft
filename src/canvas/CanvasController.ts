import {
  Canvas as FabricCanvas,
  Rect,
  Circle,
  Line,
  IText,
  Shadow,
  Group,
  FabricObject,
  Point,
  Path,
  type TMat2D,
} from "fabric";
import { ExportCanvasService } from "./ExportCanvasService";
import { CanvasServices } from "./CanvasServices";
import { useEditorStore, type ActiveProperties } from "../stores/editorStore";
import { type CanvasObjectData, type Project } from "../types";

export class CanvasController {
  public canvas: FabricCanvas | null = null;
  public artboard: Rect | null = null;
  public readyPromise: Promise<void>;
  private disposed = false;
  private documentTemplateVersion: number | undefined;
  private services: CanvasServices | null = null;
  private spacePressed = false;
  private isDragging = false;
  private lastPosX = 0;
  private lastPosY = 0;
  private clipboard: any = null;
  private isExporting = false;
  private showGrid = false;
  private pendingDocumentMigration = false;
  private onProjectSaveCallback:
    | ((thumbnail: string, canvasData: string) => void)
    | null = null;
  private onLoadErrorCallback: ((err: Error) => void) | null = null;

  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.code === "Space") {
      // Prevent browser default scrolling
      const activeElem = document.activeElement;
      const isInput =
        activeElem &&
        (activeElem.tagName === "INPUT" ||
          activeElem.tagName === "TEXTAREA" ||
          activeElem.getAttribute("contenteditable") === "true");
      if (!isInput) {
        e.preventDefault();
        this.spacePressed = true;
        useEditorStore.getState().setIsPanning(true);
        if (this.canvas) this.canvas.defaultCursor = "grab";
      }
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    if (e.code === "Space") {
      this.spacePressed = false;
      useEditorStore.getState().setIsPanning(false);
      if (this.canvas) {
        this.canvas.defaultCursor = "default";
        this.canvas.selection = true;
      }
    }
  };

  constructor(
    canvasId: string,
    width: number,
    height: number,
    project: Project,
    onSave: (thumbnail: string, canvasData: string) => void,
    onLoadError?: (err: Error) => void,
  ) {
    this.onProjectSaveCallback = onSave;
    this.onLoadErrorCallback = onLoadError ?? null;
    this.readyPromise = this.initCanvas(canvasId, width, height, project);
  }

  private async initCanvas(
    canvasId: string,
    width: number,
    height: number,
    project: Project,
  ) {
    if (this.disposed) return;

    // 1. Setup Figma-style Selection Controls
    FabricObject.prototype.borderColor = "#3b82f6";
    FabricObject.prototype.cornerColor = "#ffffff";
    FabricObject.prototype.cornerStrokeColor = "#3b82f6";
    FabricObject.prototype.cornerStyle = "circle";
    FabricObject.prototype.cornerSize = 8;
    FabricObject.prototype.transparentCorners = false;
    FabricObject.prototype.borderScaleFactor = 1.2;
    FabricObject.prototype.padding = 6;

    // 2. Setup Canvas
    this.canvas = new FabricCanvas(canvasId, {
      width,
      height,
      backgroundColor: "#0e0e10", // gorgeous dark sleek workspace color
      selectionColor: "rgba(59, 130, 246, 0.15)",
      selectionBorderColor: "#3b82f6",
      selectionLineWidth: 1.5,
    });

    // 2. Setup the Artboard (Document surface)
    const artboardWidth = project.width;
    const artboardHeight = project.height;

    this.artboard = new Rect({
      left: 0,
      top: 0,
      width: artboardWidth,
      height: artboardHeight,
      fill: "#ffffff",
      selectable: false,
      hoverCursor: "default",
      rx: 0,
      ry: 0,
      shadow: new Shadow({
        color: "rgba(0, 0, 0, 0.25)",
        blur: 30,
        offsetX: 0,
        offsetY: 8,
      }),
    });
    // Set a custom property to identify the artboard
    (this.artboard as any).isArtboard = true;
    (this.artboard as any).id = "artboard_doc";

    this.canvas.add(this.artboard);
    this.canvas.sendObjectToBack(this.artboard);
    this.enforceDocumentOrigin();

    this.services = new CanvasServices({
      canvas: this.canvas,
      artboard: this.artboard,
      isDisposed: () => this.disposed,
      restoreHistorySnapshot: (snapshot) =>
        this.loadCanvasStateFromJSON(snapshot),
    });

    // 3. Load Canvas Data (objects) if any
    if (project.canvasData) {
      try {
        const parsedDocument = this.parseCanvasDocument(project.canvasData);
        this.documentTemplateVersion = parsedDocument.document.templateVersion;
        this.pendingDocumentMigration = parsedDocument.migrated;

        if (parsedDocument.document.background && this.artboard) {
          this.artboard.set({ fill: parsedDocument.document.background });
        }

        await this.loadObjects(parsedDocument.document.objects);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        console.error("Error parsing canvas data:", error);
        this.onLoadErrorCallback?.(error);
      }
    }

    if (this.disposed || !this.canvas) return;

    this.enforceDocumentOrigin();
    this.validateDocumentGeometry("initial load");
    this.canvas.renderAll();
    this.saveToHistory();

    // 4. Attach Events
    this.setupEvents();
    this.setupKeyboardEvents();
    this.updateZundandUI();

    if (this.pendingDocumentMigration) {
      this.pendingDocumentMigration = false;
      await this.triggerAutosave();
    }
  }

  private parseCanvasDocument(canvasData: string) {
    if (!this.services) {
      throw new Error("Canvas services are not initialized");
    }

    return this.services.documents.parse(canvasData);
  }

  private async loadObjects(objectsData: CanvasObjectData[]) {
    if (!this.canvas || !this.services || this.disposed) return;

    for (const objectData of objectsData) {
      if (!this.canvas || this.disposed) return;

      try {
        const object = await this.services.objects.create(objectData);
        if (object && this.canvas && !this.disposed) {
          this.canvas.add(object);
        }
      } catch (error) {
        console.error("Failed to load object:", error);
      }
    }

    this.canvas.requestRenderAll();
    this.updateLayersList();
  }
  private enforceDocumentOrigin() {
    if (!this.artboard) return;

    this.artboard.set({
      left: 0,
      top: 0,
      originX: "left",
      originY: "top",
    });
    this.artboard.setCoords();
  }

  private validateDocumentGeometry(context: string) {
    if (!this.canvas || !this.artboard || !import.meta.env.DEV) return;

    const artboardLeft = this.artboard.left ?? 0;
    const artboardTop = this.artboard.top ?? 0;

    if (artboardLeft !== 0 || artboardTop !== 0) {
      console.warn(`[glyft] Artboard drift detected during ${context}.`, {
        left: artboardLeft,
        top: artboardTop,
      });
    }

    const width = this.artboard.width ?? 0;
    const height = this.artboard.height ?? 0;
    const suspiciousObjects = this.canvas
      .getObjects()
      .filter((obj) => !(obj as any).isArtboard)
      .filter((obj) => {
        const left = obj.left ?? 0;
        const top = obj.top ?? 0;
        return (
          left < -100 || top < -100 || left > width + 100 || top > height + 100
        );
      })
      .map((obj) => ({
        id: (obj as any).id,
        name: (obj as any).name,
        type: obj.type,
        left: obj.left,
        top: obj.top,
      }));

    if (suspiciousObjects.length > 0) {
      console.warn(
        `[glyft] Suspicious document coordinates during ${context}.`,
        {
          count: suspiciousObjects.length,
          objects: suspiciousObjects.slice(0, 5),
        },
      );
    }
  }

  private applyArtboardCenterSnapping(target: FabricObject) {
    this.services?.snapping.snapToDocumentCenter(target);
  }
  private setupEvents() {
    if (!this.canvas) return;

    this.canvas.on("selection:created", () => {
      this.updateZundandUI();
    });

    this.canvas.on("selection:updated", () => {
      this.updateZundandUI();
    });

    this.canvas.on("selection:cleared", () => {
      this.services?.snapping.reset();

      this.updateZundandUI();
      this.canvas?.requestRenderAll();
    });

    // Keep transform properties updated while dragging/scaling/rotating
    this.canvas.on("object:moving", (event) => {
      const target = event.target;

      if (!target || (target as any).isArtboard) return;

      this.applyArtboardCenterSnapping(target);
      this.updateZundandUI();
      this.canvas?.requestRenderAll();
    });

    this.canvas.on("object:scaling", () => {
      this.updateZundandUI();
    });

    this.canvas.on("object:rotating", () => {
      this.updateZundandUI();
    });

    // Save only after the transform is finished
    this.canvas.on("object:modified", () => {
      this.services?.snapping.reset();

      this.updateZundandUI();
      this.saveToHistory();
      this.triggerAutosave();
      this.updateLayersList();
      this.canvas?.requestRenderAll();
    });

    this.canvas.on("object:added", (e) => {
      const target = e.target;
      if (target && !(target as any).isArtboard && !(target as any).id) {
        (target as any).id = crypto.randomUUID();
        (target as any).name =
          (target as any).name || `${target.type?.toUpperCase()} Object`;
      }
      this.updateLayersList();
    });

    this.canvas.on("object:removed", () => {
      this.updateLayersList();
    });

    // Mouse Wheel Zoom
    this.canvas.on("mouse:wheel", (opt) => {
      if (!this.canvas) return;
      const evt = opt.e;
      // Allow scroll zoom with Ctrl or Cmd
      if (evt.ctrlKey || evt.metaKey) {
        const delta = evt.deltaY;
        let zoom = this.canvas.getZoom();
        zoom *= 0.999 ** delta;
        if (zoom > 20) zoom = 20;
        if (zoom < 0.05) zoom = 0.05;
        this.canvas.zoomToPoint(new Point(evt.offsetX, evt.offsetY), zoom);
        useEditorStore.getState().setZoom(zoom);
        opt.e.preventDefault();
        opt.e.stopPropagation();
      }
    });

    // Spacebar + Drag Panning
    this.canvas.on("mouse:down", (opt) => {
      const evt = opt.e as any;
      const isMiddleClick = evt.button === 1;
      const isPanMode =
        this.spacePressed ||
        useEditorStore.getState().isPanning ||
        useEditorStore.getState().activeTool === "pan" ||
        isMiddleClick;

      if (isPanMode) {
        this.isDragging = true;
        this.canvas!.selection = false;
        this.canvas!.discardActiveObject();
        this.canvas!.renderAll();
        this.lastPosX =
          evt.clientX || (evt.touches && evt.touches[0]?.clientX) || 0;
        this.lastPosY =
          evt.clientY || (evt.touches && evt.touches[0]?.clientY) || 0;
      }
    });

    this.canvas.on("mouse:move", (opt) => {
      const e = opt.e as any;
      if (this.isDragging && this.canvas) {
        const clientX = e.clientX || (e.touches && e.touches[0]?.clientX) || 0;
        const clientY = e.clientY || (e.touches && e.touches[0]?.clientY) || 0;

        const vpt = this.canvas.viewportTransform
          ? ([...this.canvas.viewportTransform] as unknown as TMat2D)
          : ([1, 0, 0, 1, 0, 0] as TMat2D);
        vpt[4] += clientX - this.lastPosX;
        vpt[5] += clientY - this.lastPosY;
        this.canvas.setViewportTransform(vpt);
        this.canvas.requestRenderAll();
        this.lastPosX = clientX;
        this.lastPosY = clientY;
      }
    });

    this.canvas.on("mouse:up", () => {
      if (this.isDragging) {
        this.isDragging = false;
        if (this.canvas) {
          this.canvas.selection = true;
        }
      }
    });

    // Infinite Canvas Grid Rendering
    // Infinite canvas grid and alignment guides
    this.canvas.on("after:render", (opt) => {
      if (!this.canvas || this.isExporting) return;

      const ctx = opt.ctx;
      const vpt = this.canvas.viewportTransform;

      if (!vpt) return;

      const zoom = this.canvas.getZoom();
      const canvasWidth = this.canvas.getWidth();
      const canvasHeight = this.canvas.getHeight();

      // Draw workspace grid only when grid visibility is enabled
      if (this.showGrid) {
        const gridSpacing = 50;

        const left = -vpt[4] / zoom;
        const top = -vpt[5] / zoom;
        const right = (canvasWidth - vpt[4]) / zoom;
        const bottom = (canvasHeight - vpt[5]) / zoom;

        const startX = Math.floor(left / gridSpacing) * gridSpacing;
        const startY = Math.floor(top / gridSpacing) * gridSpacing;

        ctx.save();

        ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
        ctx.lineWidth = 1;

        ctx.beginPath();

        for (let x = startX; x <= right; x += gridSpacing) {
          const viewportX = x * zoom + vpt[4];

          ctx.moveTo(viewportX, 0);
          ctx.lineTo(viewportX, canvasHeight);
        }

        for (let y = startY; y <= bottom; y += gridSpacing) {
          const viewportY = y * zoom + vpt[5];

          ctx.moveTo(0, viewportY);
          ctx.lineTo(canvasWidth, viewportY);
        }

        ctx.stroke();

        // Major grid lines every 250 document pixels
        ctx.strokeStyle = "rgba(255, 255, 255, 0.09)";
        ctx.beginPath();

        for (
          let x = Math.floor(left / (gridSpacing * 5)) * (gridSpacing * 5);
          x <= right;
          x += gridSpacing * 5
        ) {
          const viewportX = x * zoom + vpt[4];

          ctx.moveTo(viewportX, 0);
          ctx.lineTo(viewportX, canvasHeight);
        }

        for (
          let y = Math.floor(top / (gridSpacing * 5)) * (gridSpacing * 5);
          y <= bottom;
          y += gridSpacing * 5
        ) {
          const viewportY = y * zoom + vpt[5];

          ctx.moveTo(0, viewportY);
          ctx.lineTo(canvasWidth, viewportY);
        }

        ctx.stroke();
        ctx.restore();
      }

      this.services?.snapping.drawGuides(ctx);
    });
  }

  private setupKeyboardEvents() {
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
  }

  public syncActiveTool(tool: any) {
    if (!this.canvas) return;

    if (tool === "pan") {
      this.canvas.defaultCursor = "grab";
      this.canvas.selection = false;
      this.canvas.discardActiveObject();
      this.canvas.renderAll();

      this.canvas.getObjects().forEach((obj) => {
        if (!(obj as any).isArtboard) {
          obj.selectable = false;
          obj.evented = false;
        }
      });
    } else {
      this.canvas.defaultCursor = "default";
      this.canvas.selection = true;

      this.canvas.getObjects().forEach((obj) => {
        if (!(obj as any).isArtboard) {
          const isLocked = !!(obj as any).locked;
          obj.selectable = !isLocked;
          obj.evented = !isLocked;
        }
      });
    }
    this.canvas.renderAll();
  }

  // Update Zustand state based on canvas selection
  private updateZundandUI() {
    if (!this.canvas || !this.services) return;

    const snapshot = this.services.selection.createSnapshot(
      this.canvas.getActiveObjects(),
    );
    const store = useEditorStore.getState();

    store.setSelectedObjectCount(snapshot.selectedObjectCount);
    store.setActiveProperties(snapshot.activeProperties);
    this.updateLayersList();
  }
  public updateLayersList() {
    if (!this.services) return;
    useEditorStore.getState().setLayers(this.services.layers.list());
  }
  public saveToHistory() {
    if (!this.canvas || !this.services) return;
    this.services.history.push(this.getCleanCanvasJSON());
  }
  public undo() {
    if (!this.canvas || !this.services) return;

    void this.services.history
      .undo(this.getCleanCanvasJSON())
      .then((changed) => {
        if (changed) void this.triggerAutosave();
      })
      .catch((error) => {
        console.error("Failed to undo canvas state:", error);
      });
  }
  public redo() {
    if (!this.canvas || !this.services) return;

    void this.services.history
      .redo(this.getCleanCanvasJSON())
      .then((changed) => {
        if (changed) void this.triggerAutosave();
      })
      .catch((error) => {
        console.error("Failed to redo canvas state:", error);
      });
  }
  private getCleanCanvasJSON(): string {
    if (!this.canvas || !this.services) return "";

    const objects = this.canvas
      .getObjects()
      .filter((object) => !(object as any).isArtboard)
      .map((object) =>
        object.toObject(["id", "name", "rx", "ry", "shadow"]),
      ) as CanvasObjectData[];

    return this.services.documents.serialize({
      background:
        typeof this.artboard?.fill === "string"
          ? this.artboard.fill
          : "#ffffff",
      objects,
      templateVersion: this.documentTemplateVersion,
    });
  }
  private async loadCanvasStateFromJSON(jsonString: string) {
    if (!this.canvas) return;

    // Snapshot non-artboard objects so we can roll back if restoration fails
    const preClearObjects = this.canvas
      .getObjects()
      .filter((obj) => !(obj as any).isArtboard);

    // Clear everything except artboard
    const allObjects = this.canvas.getObjects().slice();
    for (const obj of allObjects) {
      if (!(obj as any).isArtboard) {
        this.canvas.remove(obj);
      }
    }

    try {
      const parsed = this.parseCanvasDocument(jsonString);
      this.documentTemplateVersion = parsed.document.templateVersion;

      if (this.artboard && parsed.document.background) {
        this.artboard.set({ fill: parsed.document.background });
      }

      await this.loadObjects(parsed.document.objects);
    } catch (error) {
      // Restoration failed — put the pre-clear objects back so the canvas
      // is not left blank and history remains operable.
      console.error("Failed to load canvas state, rolling back:", error);
      for (const obj of preClearObjects) {
        this.canvas.add(obj);
      }
      this.canvas.renderAll();
      this.updateZundandUI();
      throw error;
    }

    this.canvas.renderAll();
    this.updateZundandUI();
  }

  // OBJECT GENERATION
  public addRectangle() {
    if (!this.canvas || !this.artboard) return;

    const rect = new Rect({
      left: 50,
      top: 50,
      originX: "left",
      originY: "top",
      width: 150,
      height: 100,
      fill: "#3b82f6",
      stroke: "",
      strokeWidth: 0,
      rx: 8,
      ry: 8,
      opacity: 1,
    });

    (rect as any).id = crypto.randomUUID();
    (rect as any).name = "Rectangle";

    this.canvas.add(rect);
    this.canvas.setActiveObject(rect);
    this.canvas.renderAll();
    this.saveToHistory();
    this.triggerAutosave();
  }

  public addCircle() {
    if (!this.canvas || !this.artboard) return;

    const circle = new Circle({
      left: 60,
      top: 60,
      originX: "left",
      originY: "top",
      radius: 60,
      fill: "#10b981",
      stroke: "",
      strokeWidth: 0,
      opacity: 1,
    });

    (circle as any).id = crypto.randomUUID();
    (circle as any).name = "Circle";

    this.canvas.add(circle);
    this.canvas.setActiveObject(circle);
    this.canvas.renderAll();
    this.saveToHistory();
    this.triggerAutosave();
  }

  public addLine() {
    if (!this.canvas || !this.artboard) return;

    const x1 = 40;
    const y1 = 40;
    const x2 = x1 + 150;
    const y2 = y1 + 100;

    const line = new Line([x1, y1, x2, y2], {
      stroke: "#ef4444",
      strokeWidth: 4,
      opacity: 1,
    });

    (line as any).id = crypto.randomUUID();
    (line as any).name = "Line";

    this.canvas.add(line);
    this.canvas.setActiveObject(line);
    this.canvas.renderAll();
    this.saveToHistory();
    this.triggerAutosave();
  }

  public addArrow() {
    if (!this.canvas || !this.artboard) return;

    const left = 40;
    const top = 40;

    // Render arrow as a custom path for rich editing
    const arrowPath = new Path(
      "M 0 10 L 100 10 M 100 10 L 80 0 M 100 10 L 80 20",
      {
        left,
        top,
        originX: "left",
        originY: "top",
        stroke: "#f59e0b",
        strokeWidth: 4,
        fill: "",
        opacity: 1,
      },
    );

    (arrowPath as any).id = crypto.randomUUID();
    (arrowPath as any).name = "Arrow";

    this.canvas.add(arrowPath);
    this.canvas.setActiveObject(arrowPath);
    this.canvas.renderAll();
    this.saveToHistory();
    this.triggerAutosave();
  }

  public addText() {
    if (!this.canvas || !this.artboard) return;

    const text = new IText("Double click to edit", {
      left: 50,
      top: 120,
      originX: "left",
      originY: "top",
      fontFamily: "Inter",
      fontSize: 28,
      fill: "#1e293b",
      fontWeight: "bold",
      opacity: 1,
    });

    (text as any).id = crypto.randomUUID();
    (text as any).name = "Text Block";

    this.canvas.add(text);
    this.canvas.setActiveObject(text);
    this.canvas.renderAll();
    this.saveToHistory();
    this.triggerAutosave();
  }

  public async addImage(url: string, position?: { x: number; y: number }) {
    if (!this.services || this.disposed) return;

    try {
      const image = await this.services.images.createImage(url, { position });
      if (!image || this.disposed) return;

      this.services.images.addToCanvas(image);
      this.updateZundandUI();
      this.saveToHistory();
      void this.triggerAutosave();
    } catch (error) {
      console.error("Failed to import image:", error);
    }
  }
  public async addSVG(svgString: string, position?: { x: number; y: number }) {
    if (!this.services || this.disposed) return;

    try {
      const image = await this.services.images.createSvgImage(svgString, {
        position,
      });
      if (!image || this.disposed) return;

      this.services.images.addToCanvas(image);
      this.updateZundandUI();
      this.saveToHistory();
      void this.triggerAutosave();
    } catch (error) {
      console.error("Failed to import SVG:", error);
    }
  }
  public deleteSelected() {
    if (!this.canvas) return;

    const activeObjects = this.canvas.getActiveObjects();
    if (activeObjects.length === 0) return;

    activeObjects.forEach((obj) => {
      if (!(obj as any).isArtboard) {
        this.canvas!.remove(obj);
      }
    });

    this.canvas.discardActiveObject();
    this.canvas.renderAll();
    this.saveToHistory();
    this.triggerAutosave();
    this.updateZundandUI();
  }

  public duplicateSelected() {
    if (!this.canvas) return;

    const activeObjects = this.canvas.getActiveObjects();
    if (activeObjects.length === 0) return;

    activeObjects.forEach((obj) => {
      if ((obj as any).isArtboard) return;

      // Duplicate in-place offset slightly
      obj.clone().then((cloned) => {
        if (!cloned || !this.canvas) return;
        cloned.set({
          left: cloned.left! + 20,
          top: cloned.top! + 20,
        });
        (cloned as any).id = crypto.randomUUID();
        (cloned as any).name = `${(obj as any).name} Copy`;

        this.canvas.add(cloned);
        this.canvas.setActiveObject(cloned);
        this.canvas.renderAll();
        this.saveToHistory();
        this.triggerAutosave();
      });
    });
  }

  public groupSelected() {
    if (!this.canvas) return;

    const activeObjects = this.canvas.getActiveObjects();
    if (activeObjects.length <= 1) return;

    // Filter out artboard
    const validObjects = activeObjects.filter(
      (obj) => !(obj as any).isArtboard,
    );
    if (validObjects.length <= 1) return;

    // Convert selection to a single group
    const group = new Group(validObjects, {
      subTargetCheck: true,
    });
    (group as any).id = crypto.randomUUID();
    (group as any).name = "Group";

    // Remove individual objects from canvas and add group
    validObjects.forEach((obj) => this.canvas!.remove(obj));
    this.canvas.add(group);

    this.canvas.setActiveObject(group);
    this.canvas.renderAll();
    this.saveToHistory();
    this.triggerAutosave();
    this.updateZundandUI();
  }

  public ungroupSelected() {
    if (!this.canvas) return;

    const activeObject = this.canvas.getActiveObject();
    if (!activeObject || activeObject.type !== "group") return;

    const group = activeObject as Group;
    const objects = group.getObjects();

    // Fabric v6+ ungroup releases objects in coordinate space
    if (typeof (group as any).destroy === "function") {
      (group as any).destroy();
    }
    this.canvas.remove(group);

    objects.forEach((obj) => {
      (obj as any).id = (obj as any).id || crypto.randomUUID();
      this.canvas!.add(obj);
    });

    this.canvas.discardActiveObject();
    this.canvas.renderAll();
    this.saveToHistory();
    this.triggerAutosave();
    this.updateZundandUI();
  }

  public lockSelected() {
    if (!this.canvas) return;

    const activeObjects = this.canvas.getActiveObjects();
    activeObjects.forEach((obj) => {
      if ((obj as any).isArtboard) return;
      obj.set({
        lockMovementX: true,
        lockMovementY: true,
        lockScalingX: true,
        lockScalingY: true,
        lockRotation: true,
        hasControls: false,
        selectable: false,
      });
      (obj as any).locked = true;
    });

    this.canvas.discardActiveObject();
    this.canvas.renderAll();
    this.saveToHistory();
    this.triggerAutosave();
    this.updateZundandUI();
  }

  public unlockSelected(objectId?: string) {
    if (!this.canvas) return;

    let targetObjects: FabricObject[] = [];
    if (objectId) {
      const found = this.canvas
        .getObjects()
        .find((obj) => (obj as any).id === objectId);
      if (found) targetObjects = [found];
    } else {
      // unlock all selected (if selectable somehow)
      targetObjects = this.canvas.getActiveObjects();
    }

    targetObjects.forEach((obj) => {
      obj.set({
        lockMovementX: false,
        lockMovementY: false,
        lockScalingX: false,
        lockScalingY: false,
        lockRotation: false,
        hasControls: true,
        selectable: true,
      });
      (obj as any).locked = false;
    });

    this.canvas.renderAll();
    this.saveToHistory();
    this.triggerAutosave();
    this.updateZundandUI();
  }

  // PROPERTY SETTERS
  public setProperty(key: keyof ActiveProperties, value: any) {
    if (!this.canvas) return;

    const activeObjects = this.canvas.getActiveObjects();
    if (activeObjects.length === 0) return;

    activeObjects.forEach((obj) => {
      if ((obj as any).isArtboard) return;

      // Handle custom shadow
      if (key.startsWith("shadow")) {
        let currentShadow = obj.shadow as Shadow | null;
        if (!currentShadow) {
          currentShadow = new Shadow({
            color: "rgba(0,0,0,0)",
            blur: 0,
            offsetX: 0,
            offsetY: 0,
          });
        }

        const shadowOptions = {
          color: currentShadow.color,
          blur: currentShadow.blur,
          offsetX: currentShadow.offsetX,
          offsetY: currentShadow.offsetY,
        };

        if (key === "shadowColor") shadowOptions.color = value;
        if (key === "shadowBlur") shadowOptions.blur = parseFloat(value) || 0;
        if (key === "shadowOffsetX")
          shadowOptions.offsetX = parseFloat(value) || 0;
        if (key === "shadowOffsetY")
          shadowOptions.offsetY = parseFloat(value) || 0;

        obj.set({ shadow: new Shadow(shadowOptions) });
      } else if (key === "width") {
        const val = parseFloat(value) || 0;
        if (obj.type === "circle") {
          const radius = val / 2;
          obj.set({ radius, width: val, height: val, scaleX: 1, scaleY: 1 });
        } else {
          obj.set({ width: val, scaleX: 1 });
        }
      } else if (key === "height") {
        const val = parseFloat(value) || 0;
        if (obj.type === "circle") {
          const radius = val / 2;
          obj.set({ radius, width: val, height: val, scaleX: 1, scaleY: 1 });
        } else {
          obj.set({ height: val, scaleY: 1 });
        }
      } else {
        // Standard property
        obj.set({ [key]: value });
      }

      // Sync bounding box coordinates for Figma selection highlights
      obj.setCoords();
    });

    this.canvas.renderAll();
    this.updateZundandUI();
    this.saveToHistory();
    this.triggerAutosave();
  }

  public setArtboardProperty(key: "width" | "height" | "fill", value: any) {
    if (!this.canvas || !this.artboard) return;

    if (key === "width") {
      const newWidth = parseInt(value) || 100;
      this.artboard.set({ width: newWidth });
      const currentProj = useEditorStore.getState().currentProject;
      if (currentProj) {
        useEditorStore
          .getState()
          .setCurrentProject({ ...currentProj, width: newWidth });
      }
    } else if (key === "height") {
      const newHeight = parseInt(value) || 100;
      this.artboard.set({ height: newHeight });
      const currentProj = useEditorStore.getState().currentProject;
      if (currentProj) {
        useEditorStore
          .getState()
          .setCurrentProject({ ...currentProj, height: newHeight });
      }
    } else if (key === "fill") {
      this.artboard.set({ fill: value });
    }

    this.enforceDocumentOrigin();
    this.zoomToFit();

    this.canvas.renderAll();
    this.saveToHistory();
    this.triggerAutosave();
    this.validateDocumentGeometry("artboard resize");
  }

  // LAYER LIST MODIFIERS
  public reorderLayer(id: string, dir: "up" | "down") {
    if (!this.canvas) return;

    const objects = this.canvas
      .getObjects()
      .filter((obj) => !(obj as any).isArtboard);
    const index = objects.findIndex((obj) => (obj as any).id === id);
    if (index === -1) return;

    const targetObj = objects[index];

    // In objects array, index 0 is bottom, index length-1 is top.
    // To move standard button 'up' in list (visually up towards index 0 of layers list, which is higher stacking index):
    if (dir === "up" && index < objects.length - 1) {
      const targetAbsIndex = this.canvas
        .getObjects()
        .indexOf(objects[index + 1]);
      this.canvas.moveObjectTo(targetObj, targetAbsIndex);
    } else if (dir === "down" && index > 0) {
      const targetAbsIndex = this.canvas
        .getObjects()
        .indexOf(objects[index - 1]);
      this.canvas.moveObjectTo(targetObj, targetAbsIndex);
    }

    this.canvas.renderAll();
    this.updateLayersList();
    this.saveToHistory();
    this.triggerAutosave();
  }

  public reorderLayersByIndex(sourceIndex: number, targetIndex: number) {
    if (!this.canvas) return;

    const objects = this.canvas
      .getObjects()
      .filter((obj) => !(obj as any).isArtboard);

    // Convert layers list index (reversed) to stacking order index
    const fabSourceIndex = objects.length - 1 - sourceIndex;
    const fabTargetIndex = objects.length - 1 - targetIndex;

    if (
      fabSourceIndex < 0 ||
      fabSourceIndex >= objects.length ||
      fabTargetIndex < 0 ||
      fabTargetIndex >= objects.length
    ) {
      return;
    }

    const targetObj = objects[fabSourceIndex];

    // Artboard is always index 0, so offset by 1
    const absTargetIndex = fabTargetIndex + 1;

    this.canvas.moveObjectTo(targetObj, absTargetIndex);
    this.canvas.renderAll();
    this.updateLayersList();
    this.saveToHistory();
    this.triggerAutosave();
  }

  public flipHorizontal() {
    if (!this.canvas) return;
    const activeObject = this.canvas.getActiveObject();
    if (activeObject && !(activeObject as any).isArtboard) {
      activeObject.set({ flipX: !activeObject.flipX });
      this.canvas.renderAll();
      this.saveToHistory();
      this.triggerAutosave();
    }
  }

  public flipVertical() {
    if (!this.canvas) return;
    const activeObject = this.canvas.getActiveObject();
    if (activeObject && !(activeObject as any).isArtboard) {
      activeObject.set({ flipY: !activeObject.flipY });
      this.canvas.renderAll();
      this.saveToHistory();
      this.triggerAutosave();
    }
  }

  public bringToFront() {
    if (!this.canvas) return;
    const activeObject = this.canvas.getActiveObject();
    if (activeObject && !(activeObject as any).isArtboard) {
      this.canvas.bringObjectToFront(activeObject);
      this.canvas.renderAll();
      this.updateLayersList();
      this.saveToHistory();
      this.triggerAutosave();
    }
  }

  public sendToBack() {
    if (!this.canvas) return;
    const activeObject = this.canvas.getActiveObject();
    if (activeObject && !(activeObject as any).isArtboard) {
      // Index 1 is right above the artboard (index 0)
      this.canvas.moveObjectTo(activeObject, 1);
      this.canvas.renderAll();
      this.updateLayersList();
      this.saveToHistory();
      this.triggerAutosave();
    }
  }

  public copySelected() {
    if (!this.canvas || this.disposed) return;
    const activeObject = this.canvas.getActiveObject();
    if (activeObject && !(activeObject as any).isArtboard) {
      activeObject.clone().then((cloned) => {
        if (this.disposed) return;
        this.clipboard = cloned;
      });
    }
  }

  public pasteSelected() {
    if (!this.canvas || !this.clipboard || this.disposed) return;

    this.clipboard.clone().then((clonedObj) => {
      if (!clonedObj || !this.canvas || this.disposed) return;

      this.canvas.discardActiveObject();
      clonedObj.set({
        left: clonedObj.left! + 20,
        top: clonedObj.top! + 20,
        evented: true,
      });

      (clonedObj as any).id = crypto.randomUUID();
      (clonedObj as any).name =
        `${(this.clipboard as any).name || "Pasted Object"} Copy`;

      this.canvas.add(clonedObj);
      this.canvas.setActiveObject(clonedObj);
      this.canvas.renderAll();
      this.updateLayersList();
      this.saveToHistory();
      this.triggerAutosave();
    });
  }

  public hasClipboard(): boolean {
    return this.clipboard !== null;
  }

  public renameLayer(id: string, newName: string) {
    if (!this.services || !this.services.layers.rename(id, newName)) return;
    this.updateLayersList();
    this.saveToHistory();
    void this.triggerAutosave();
  }
  public selectObjectById(id: string) {
    if (!this.canvas || !this.services) return;

    const object = this.services.layers.findById(id);
    if (!object) return;

    this.canvas.setActiveObject(object);
    this.canvas.requestRenderAll();
    this.updateZundandUI();
  }
  public toggleLayerVisibility(id: string) {
    if (!this.services) return;

    const object = this.services.layers.findById(id);
    if (!object) return;

    if (!this.services.layers.setVisibility(id, object.visible === false))
      return;
    this.updateLayersList();
    this.saveToHistory();
    void this.triggerAutosave();
  }
  public toggleLayerLock(id: string) {
    if (!this.services) return;

    const object = this.services.layers.findById(id);
    if (!object) return;

    if (!this.services.layers.setLocked(id, !Boolean((object as any).locked))) {
      return;
    }

    this.updateZundandUI();
    this.saveToHistory();
    void this.triggerAutosave();
  }
  public toggleGrid(show: boolean) {
    this.showGrid = show;
    if (!this.canvas) return;

    if (show) {
      this.canvas.backgroundColor = "#0e0e10";
    } else {
      this.canvas.backgroundColor = "#121214";
    }

    this.canvas.renderAll();
  }

  // EXPORT UTILITIES
  public async exportToImage(
    format: "png" | "jpeg" | "webp" | "svg",
  ): Promise<string> {
    if (!this.canvas || !this.artboard) return "";

    const exportService = this.createExportService();
    if (!exportService) return "";

    if (format === "svg") {
      const svg = await exportService.exportSvg();
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    }

    return exportService.exportRaster(format);
  }

  public async exportRaster(
    format: "png" | "jpeg" | "webp",
    scale = 1,
  ): Promise<string> {
    if (!this.canvas || !this.artboard) return "";

    const exportService = this.createExportService();
    if (!exportService) return "";

    return exportService.exportRaster(format, scale);
  }

  public async exportSvg(): Promise<string> {
    if (!this.canvas || !this.artboard) return "";

    const exportService = this.createExportService();
    if (!exportService) return "";

    const svg = await exportService.exportSvg();
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  public async createThumbnail(maxWidth = 320): Promise<string> {
    if (!this.canvas || !this.artboard) return "";

    const exportService = this.createExportService();
    if (!exportService) return "";

    return exportService.createThumbnail(maxWidth);
  }

  private async generateThumbnailDataURL(): Promise<string> {
    try {
      return await this.createThumbnail(320);
    } catch (err) {
      console.error("Failed to generate thumbnail:", err);
      return "";
    }
  }

  // AUTOSAVE TRIGGER
  public async triggerAutosave() {
    if (!this.canvas || !this.onProjectSaveCallback || this.disposed) return;

    try {
      const thumbnail = await this.generateThumbnailDataURL();
      if (this.disposed || !this.canvas || !this.onProjectSaveCallback) return;
      const canvasData = this.getCleanCanvasJSON();
      this.onProjectSaveCallback(thumbnail, canvasData);
    } catch (err) {
      console.error("Autosave error:", err);
    }
  }

  public zoomToFit() {
    if (!this.services || this.disposed) return;
    this.services.viewport.zoomToFit();
  }
  public setZoom(zoomValue: number) {
    this.services?.viewport.setZoom(zoomValue);
  }
  public zoomIn() {
    this.services?.viewport.zoomIn();
  }
  public zoomOut() {
    this.services?.viewport.zoomOut();
  }
  private createExportService() {
    if (!this.canvas || !this.artboard) return null;

    return new ExportCanvasService({
      sourceCanvas: this.canvas,
      documentWidth: this.artboard.width ?? 0,
      documentHeight: this.artboard.height ?? 0,
      documentBackground:
        typeof this.artboard.fill === "string" ? this.artboard.fill : "#ffffff",
      documentOriginX: 0,
      documentOriginY: 0,
    });
  }

  public zoomTo100() {
    this.services?.viewport.zoomTo100();
  }
  public resize(width: number, height: number) {
    this.services?.viewport.resize(width, height);
  }
  public dispose() {
    if (this.disposed) return;
    this.disposed = true;
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    if (this.canvas) {
      this.canvas.off();
      this.canvas.dispose();
      this.canvas = null;
    }
    this.services = null;
    this.artboard = null;
    this.onProjectSaveCallback = null;
  }

  public viewportToDocumentPoint(
    viewportX: number,
    viewportY: number,
  ): { x: number; y: number } {
    return (
      this.services?.viewport.viewportToDocumentPoint(viewportX, viewportY) ?? {
        x: 0,
        y: 0,
      }
    );
  }
}
