import {
  Canvas as FabricCanvas,
  Rect,
  Circle,
  Line,
  IText,
  Shadow,
  Group,
  Image as FabricImage,
  FabricObject,
  Point,
  Path,
  type TOptions,
  type TMat2D,
} from "fabric";
import { ExportCanvasService } from "./ExportCanvasService";
import { useEditorStore, type ActiveProperties } from "../stores/editorStore";
import {
  CANVAS_DOCUMENT_VERSION,
  type CanvasDocument,
  type CanvasObjectData,
  type Project,
} from "../types";

export class CanvasController {
  public canvas: FabricCanvas | null = null;
  public artboard: Rect | null = null;
  public readyPromise: Promise<void>;
  private disposed = false;
  private documentTemplateVersion: number | undefined;
  private undoStack: string[] = [];
  private redoStack: string[] = [];
  private isApplyingHistory = false;
  private spacePressed = false;
  private isDragging = false;
  private lastPosX = 0;
  private lastPosY = 0;
  private clipboard: any = null;
  private isExporting = false;
  private showGrid = true;
  private pendingDocumentMigration = false;
  private onProjectSaveCallback:
    | ((thumbnail: string, canvasData: string) => void)
    | null = null;

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
  ) {
    this.onProjectSaveCallback = onSave;
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

    // 3. Load Canvas Data (objects) if any
    if (project.canvasData) {
      try {
        const parsedDocument = this.parseCanvasDocument(project.canvasData);
        this.pendingDocumentMigration = parsedDocument.migrated;

        if (parsedDocument.document.background && this.artboard) {
          this.artboard.set({ fill: parsedDocument.document.background });
        }

        await this.loadObjects(parsedDocument.document.objects);
      } catch (err) {
        console.error("Error parsing canvas data:", err);
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

  private parseCanvasDocument(canvasData: string): {
    document: CanvasDocument;
    migrated: boolean;
  } {
    const parsed = JSON.parse(canvasData) as Partial<CanvasDocument> & {
      [key: string]: unknown;
    };

    const version = typeof parsed.version === "number" ? parsed.version : 0;
    this.documentTemplateVersion =
      typeof parsed.templateVersion === "number"
        ? parsed.templateVersion
        : undefined;
    const background =
      typeof parsed.background === "string" ? parsed.background : undefined;
    const objects = Array.isArray(parsed.objects)
      ? parsed.objects.map((object) => ({ ...(object as CanvasObjectData) }))
      : [];

    if (version >= CANVAS_DOCUMENT_VERSION) {
      return {
        document: {
          version: CANVAS_DOCUMENT_VERSION,
          templateVersion: this.documentTemplateVersion,
          background,
          objects,
        },
        migrated: false,
      };
    }

    const legacyOriginX = this.readLegacyOrigin(parsed, [
      "artboardLeft",
      "documentOriginX",
    ]);
    const legacyOriginY = this.readLegacyOrigin(parsed, [
      "artboardTop",
      "documentOriginY",
    ]);

    return {
      document: {
        version: CANVAS_DOCUMENT_VERSION,
        templateVersion: this.documentTemplateVersion,
        background,
        objects: objects.map((object) =>
          this.migrateLegacyObject(object, legacyOriginX, legacyOriginY),
        ),
      },
      migrated: true,
    };
  }

  private readLegacyOrigin(
    parsed: Partial<CanvasDocument> & { [key: string]: unknown },
    keys: string[],
  ) {
    for (const key of keys) {
      const value = parsed[key as keyof typeof parsed];
      if (typeof value === "number" && Number.isFinite(value)) {
        return value;
      }
    }

    return 0;
  }

  private migrateLegacyObject(
    object: CanvasObjectData,
    legacyOriginX: number,
    legacyOriginY: number,
  ): CanvasObjectData {
    const migrated = { ...object };

    if (legacyOriginX !== 0 || legacyOriginY !== 0) {
      if (typeof migrated.left === "number") migrated.left -= legacyOriginX;
      if (typeof migrated.top === "number") migrated.top -= legacyOriginY;
      if (typeof migrated.x1 === "number") migrated.x1 -= legacyOriginX;
      if (typeof migrated.y1 === "number") migrated.y1 -= legacyOriginY;
      if (typeof migrated.x2 === "number") migrated.x2 -= legacyOriginX;
      if (typeof migrated.y2 === "number") migrated.y2 -= legacyOriginY;
    }

    return migrated;
  }

  private async loadObjects(objectsData: CanvasObjectData[]) {
    if (!this.canvas || this.disposed) return;

    // We can load objects sequentially
    for (const objData of objectsData) {
      if (!this.canvas || this.disposed) return;

      try {
        let obj: FabricObject | null = null;
        const options: TOptions<any> = { ...objData };
        delete (options as any).type;

        switch (objData.type?.toLowerCase()) {
          case "rect":
            obj = new Rect(options);
            break;
          case "circle":
            obj = new Circle(options);
            break;
          case "line": {
            const lx1 = objData.x1 !== undefined ? objData.x1 - offsetX : 0;
            const ly1 = objData.y1 !== undefined ? objData.y1 - offsetY : 0;
            const lx2 = objData.x2 !== undefined ? objData.x2 - offsetX : 0;
            const ly2 = objData.y2 !== undefined ? objData.y2 - offsetY : 0;
            obj = new Line([lx1, ly1, lx2, ly2], options);
            break;
          }
          case "path":
            obj = new Path(objData.path, options);
            break;
          case "itext":
            obj = new IText(objData.text || "Text", options);
            break;
          case "image":
            // Fabric v6+ image loading from source
            if (objData.src) {
              const imgElement = await new Promise<HTMLImageElement>(
                (resolve, reject) => {
                  const img = new Image();
                  img.crossOrigin = "anonymous";
                  img.onload = () => resolve(img);
                  img.onerror = () => reject(new Error("Image load fail"));
                  img.src = objData.src;
                },
              );
              if (!this.canvas || this.disposed) return;
              obj = new FabricImage(imgElement, options);
            }
            break;
        }

        if (obj && this.canvas && !this.disposed) {
          // Set custom id and name
          (obj as any).id = objData.id || crypto.randomUUID();
          (obj as any).name =
            objData.name || `${objData.type?.toUpperCase()} Item`;
          this.canvas.add(obj);
        }
      } catch (e) {
        console.error("Failed to load object:", e);
      }
    }

    this.canvas.renderAll();
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

  private setupEvents() {
    if (!this.canvas) return;

    this.canvas.on("selection:created", () => this.updateZundandUI());
    this.canvas.on("selection:updated", () => this.updateZundandUI());
    this.canvas.on("selection:cleared", () => this.updateZundandUI());

    this.canvas.on("object:modified", () => {
      this.saveToHistory();
      this.triggerAutosave();
      this.updateLayersList();
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
    this.canvas.on("after:render", (opt) => {
      if (!this.canvas || !this.showGrid || this.isExporting) return;

      const ctx = opt.ctx;
      const vpt = this.canvas.viewportTransform;
      if (!vpt) return;

      const zoom = this.canvas.getZoom();

      // Grid spacing: 50 pixels in canvas coordinates
      const gridSpacing = 50;
      const width = this.canvas.getWidth();
      const height = this.canvas.getHeight();

      ctx.save();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.05)"; // very subtle white grid lines
      ctx.lineWidth = 1;

      // Calculate start and end points in viewport space
      const left = -vpt[4] / zoom;
      const top = -vpt[5] / zoom;
      const right = (width - vpt[4]) / zoom;
      const bottom = (height - vpt[5]) / zoom;

      // Align to grid spacing
      const startX = Math.floor(left / gridSpacing) * gridSpacing;
      const startY = Math.floor(top / gridSpacing) * gridSpacing;

      ctx.beginPath();
      for (let x = startX; x <= right; x += gridSpacing) {
        const vx = x * zoom + vpt[4];
        ctx.moveTo(vx, 0);
        ctx.lineTo(vx, height);
      }
      for (let y = startY; y <= bottom; y += gridSpacing) {
        const vy = y * zoom + vpt[5];
        ctx.moveTo(0, vy);
        ctx.lineTo(width, vy);
      }
      ctx.stroke();

      // Draw slightly darker major grid lines every 5 grid lines (250px)
      ctx.strokeStyle = "rgba(255, 255, 255, 0.09)";
      ctx.beginPath();
      for (
        let x = Math.floor(left / (gridSpacing * 5)) * (gridSpacing * 5);
        x <= right;
        x += gridSpacing * 5
      ) {
        const vx = x * zoom + vpt[4];
        ctx.moveTo(vx, 0);
        ctx.lineTo(vx, height);
      }
      for (
        let y = Math.floor(top / (gridSpacing * 5)) * (gridSpacing * 5);
        y <= bottom;
        y += gridSpacing * 5
      ) {
        const vy = y * zoom + vpt[5];
        ctx.moveTo(0, vy);
        ctx.lineTo(width, vy);
      }
      ctx.stroke();

      ctx.restore();
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
    if (!this.canvas) return;

    const activeObjects = this.canvas.getActiveObjects();
    useEditorStore.getState().setSelectedObjectCount(activeObjects.length);

    if (activeObjects.length === 1) {
      const obj = activeObjects[0];
      const shadowObj = obj.shadow as Shadow | null;

      const properties: ActiveProperties = {
        id: (obj as any).id,
        type: obj.type,
        fill: (obj.fill as string) || "#000000",
        stroke: (obj.stroke as string) || "",
        strokeWidth: obj.strokeWidth || 0,
        opacity: obj.opacity || 1,
        rx: (obj as Rect).rx || 0,
        shadowColor: shadowObj?.color || "",
        shadowBlur: shadowObj?.blur || 0,
        shadowOffsetX: shadowObj?.offsetX || 0,
        shadowOffsetY: shadowObj?.offsetY || 0,
        // Position, Size, and Rotation
        left: Math.round(obj.left || 0),
        top: Math.round(obj.top || 0),
        width: Math.round((obj.width || 0) * (obj.scaleX || 1)),
        height: Math.round((obj.height || 0) * (obj.scaleY || 1)),
        angle: Math.round(obj.angle || 0),
        flipX: !!obj.flipX,
        flipY: !!obj.flipY,
        // Text specific
        fontFamily: (obj as IText).fontFamily || "Inter",
        fontSize: (obj as IText).fontSize || 24,
        fontWeight: (obj as IText).fontWeight || "normal",
        charSpacing: (obj as IText).charSpacing || 0,
        lineHeight: (obj as IText).lineHeight || 1.15,
        textAlign: (obj as IText).textAlign || "left",
        fontStyle: (obj as IText).fontStyle || "normal",
        underline: (obj as IText).underline || false,
      };

      useEditorStore.getState().setActiveProperties(properties);
    } else {
      useEditorStore.getState().setActiveProperties(null);
    }

    this.updateLayersList();
  }

  public updateLayersList() {
    if (!this.canvas) return;

    // Retrieve all active layers excluding the artboard
    const objects = this.canvas
      .getObjects()
      .filter((obj) => !(obj as any).isArtboard);

    // Reverse layer order to display layers from top-to-bottom
    const layers = objects
      .slice()
      .reverse()
      .map((obj) => ({
        id: (obj as any).id || crypto.randomUUID(),
        name: (obj as any).name || `${obj.type?.toUpperCase()} Layer`,
        type: obj.type || "unknown",
        visible: obj.visible !== false,
        locked: !!((obj as any).locked || obj.lockMovementX),
      }));

    useEditorStore.getState().setLayers(layers);
  }

  // HISTORY MANAGER
  public saveToHistory() {
    if (!this.canvas || this.isApplyingHistory) return;

    const state = this.getCleanCanvasJSON();

    // Avoid double push
    if (
      this.undoStack.length > 0 &&
      this.undoStack[this.undoStack.length - 1] === state
    ) {
      return;
    }

    this.undoStack.push(state);
    this.redoStack = []; // clear redo on new action

    if (this.undoStack.length > 40) {
      this.undoStack.shift(); // keep history limit to 40
    }

    useEditorStore.getState().setHistoryState(this.undoStack.length > 1, false);
  }

  public undo() {
    if (!this.canvas || this.undoStack.length <= 1) return;

    this.isApplyingHistory = true;
    const current = this.undoStack.pop()!;
    this.redoStack.push(current);

    const previousState = this.undoStack[this.undoStack.length - 1];
    this.loadCanvasStateFromJSON(previousState).then(() => {
      this.isApplyingHistory = false;
      useEditorStore
        .getState()
        .setHistoryState(this.undoStack.length > 1, true);
      this.triggerAutosave();
    });
  }

  public redo() {
    if (!this.canvas || this.redoStack.length === 0) return;

    this.isApplyingHistory = true;
    const nextState = this.redoStack.pop()!;
    this.undoStack.push(nextState);

    this.loadCanvasStateFromJSON(nextState).then(() => {
      this.isApplyingHistory = false;
      useEditorStore
        .getState()
        .setHistoryState(true, this.redoStack.length > 0);
      this.triggerAutosave();
    });
  }

  private getCleanCanvasJSON(): string {
    if (!this.canvas) return "";
    // Export objects excluding artboard
    const objects = this.canvas
      .getObjects()
      .filter((obj) => !(obj as any).isArtboard);
    const objectsData = objects.map((obj) => {
      const data = obj.toObject(["id", "name", "rx", "ry", "shadow"]);
      return data;
    });

    const documentData: Record<string, unknown> = {
      version: CANVAS_DOCUMENT_VERSION,
      background:
        typeof this.artboard?.fill === "string"
          ? this.artboard.fill
          : "#ffffff",
      objects: objectsData,
    };

    if (typeof this.documentTemplateVersion === "number") {
      documentData.templateVersion = this.documentTemplateVersion;
    }

    return JSON.stringify(documentData);
  }

  private async loadCanvasStateFromJSON(jsonString: string) {
    if (!this.canvas) return;

    // Clear everything except artboard
    const objects = this.canvas.getObjects().slice();
    for (const obj of objects) {
      if (!(obj as any).isArtboard) {
        this.canvas.remove(obj);
      }
    }

    try {
      const parsed = JSON.parse(jsonString);
      await this.loadObjects(parsed.objects || []);
    } catch (e) {
      console.error("Failed to load canvas state:", e);
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

  public async addImage(url: string) {
    if (!this.canvas || !this.artboard || this.disposed) return;

    try {
      const imgElement = await new Promise<HTMLImageElement>(
        (resolve, reject) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error("Image failed to load"));
          img.src = url;
        },
      );
      if (!this.canvas || !this.artboard || this.disposed) return;

      // Constrain size
      let width = imgElement.width;
      let height = imgElement.height;
      const maxDim = 300;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = (height * maxDim) / width;
          width = maxDim;
        } else {
          width = (width * maxDim) / height;
          height = maxDim;
        }
      }

      const fabImage = new FabricImage(imgElement, {
        left: 40,
        top: 40,
        width,
        height,
        opacity: 1,
      });

      (fabImage as any).id = crypto.randomUUID();
      (fabImage as any).name = "Image";

      this.canvas.add(fabImage);
      this.canvas.setActiveObject(fabImage);
      this.canvas.renderAll();
      this.saveToHistory();
      this.triggerAutosave();
    } catch (err) {
      console.error(err);
    }
  }

  public addSVG(svgString: string) {
    // Standard Fabric parsing for SVG strings isn't built into core direct in simple ways in v6+,
    // but we can load an SVG as an Image data URL easily! This is extremely robust and avoids parser issues.
    const blob = new Blob([svgString], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    this.addImage(url).then(() => {
      // Free URL memory after some time
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  }

  // LAYER ACTIONS
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
    if (!this.canvas) return;
    const obj = this.canvas.getObjects().find((o) => (o as any).id === id);
    if (obj) {
      (obj as any).name = newName;
      this.updateLayersList();
      this.saveToHistory();
      this.triggerAutosave();
    }
  }

  public selectObjectById(id: string) {
    if (!this.canvas) return;
    const obj = this.canvas.getObjects().find((o) => (o as any).id === id);
    if (obj && !(obj as any).isArtboard) {
      this.canvas.setActiveObject(obj);
      this.canvas.renderAll();
      this.updateZundandUI();
    }
  }

  public toggleLayerVisibility(id: string) {
    if (!this.canvas) return;
    const obj = this.canvas.getObjects().find((o) => (o as any).id === id);
    if (obj) {
      obj.set({ visible: obj.visible === false });
      this.canvas.renderAll();
      this.updateLayersList();
      this.saveToHistory();
      this.triggerAutosave();
    }
  }

  public toggleLayerLock(id: string) {
    if (!this.canvas) return;
    const obj = this.canvas.getObjects().find((o) => (o as any).id === id);
    if (obj) {
      const isLocked = !obj.lockMovementX;
      obj.set({
        lockMovementX: isLocked,
        lockMovementY: isLocked,
        lockScalingX: isLocked,
        lockScalingY: isLocked,
        lockRotation: isLocked,
        hasControls: !isLocked,
        selectable: !isLocked,
      });
      (obj as any).locked = isLocked;
      this.canvas.renderAll();
      this.updateLayersList();
      this.saveToHistory();
      this.triggerAutosave();
    }
  }

  // GRID TOGGLE
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
  private async triggerAutosave() {
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
    if (!this.canvas || !this.artboard || this.disposed) return;

    const w = this.canvas.getWidth();
    const h = this.canvas.getHeight();
    const aw = this.artboard.width!;
    const ah = this.artboard.height!;

    const padding = 60;
    const zoom = Math.min((w - padding * 2) / aw, (h - padding * 2) / ah);
    const translateX = (w - aw * zoom) / 2;
    const translateY = (h - ah * zoom) / 2;

    const vpt = [zoom, 0, 0, zoom, translateX, translateY] as TMat2D;

    this.canvas.setViewportTransform(vpt);
    this.canvas.renderAll();

    useEditorStore.getState().setZoom(zoom);
  }

  public setZoom(zoomValue: number) {
    if (!this.canvas) return;
    const zoom = Math.max(0.05, Math.min(20, zoomValue));
    // Zoom relative to the center of the canvas viewport
    const width = this.canvas.getWidth();
    const height = this.canvas.getHeight();
    this.canvas.zoomToPoint(new Point(width / 2, height / 2), zoom);
    useEditorStore.getState().setZoom(zoom);
  }

  public zoomIn() {
    if (!this.canvas) return;
    this.setZoom(this.canvas.getZoom() + 0.1);
  }

  public zoomOut() {
    if (!this.canvas) return;
    this.setZoom(this.canvas.getZoom() - 0.1);
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
    this.setZoom(1.0);
  }

  public resize(width: number, height: number) {
    if (!this.canvas || !this.artboard) return;

    this.canvas.setDimensions({ width, height });
    this.enforceDocumentOrigin();
    this.zoomToFit();
    this.canvas.renderAll();
    this.validateDocumentGeometry("canvas resize");
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
    this.artboard = null;
    this.onProjectSaveCallback = null;
  }
}
