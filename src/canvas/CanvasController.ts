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
  type TMat2D
} from 'fabric';
import { useEditorStore, type ActiveProperties } from '../stores/editorStore';
import { type Project } from '../types';

export class CanvasController {
  public canvas: FabricCanvas | null = null;
  public artboard: Rect | null = null;
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
  private onProjectSaveCallback: ((thumbnail: string, canvasData: string) => void) | null = null;

  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'Space') {
      // Prevent browser default scrolling
      const activeElem = document.activeElement;
      const isInput = activeElem && (activeElem.tagName === 'INPUT' || activeElem.tagName === 'TEXTAREA' || activeElem.getAttribute('contenteditable') === 'true');
      if (!isInput) {
        e.preventDefault();
        this.spacePressed = true;
        useEditorStore.getState().setIsPanning(true);
        if (this.canvas) this.canvas.defaultCursor = 'grab';
      }
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    if (e.code === 'Space') {
      this.spacePressed = false;
      useEditorStore.getState().setIsPanning(false);
      if (this.canvas) {
        this.canvas.defaultCursor = 'default';
        this.canvas.selection = true;
      }
    }
  };

  constructor(
    canvasId: string,
    width: number,
    height: number,
    project: Project,
    onSave: (thumbnail: string, canvasData: string) => void
  ) {
    this.onProjectSaveCallback = onSave;
    this.initCanvas(canvasId, width, height, project);
  }

  private initCanvas(canvasId: string, width: number, height: number, project: Project) {
    // 1. Setup Canvas
    this.canvas = new FabricCanvas(canvasId, {
      width,
      height,
      backgroundColor: '#1e1e24', // dark slate workspace color
      selectionColor: 'rgba(59, 130, 246, 0.15)',
      selectionBorderColor: '#3b82f6',
      selectionLineWidth: 1.5,
    });

    // 2. Setup the Artboard (Document surface)
    const artboardWidth = project.width;
    const artboardHeight = project.height;
    const artboardLeft = 0;
    const artboardTop = 0;

    this.artboard = new Rect({
      left: artboardLeft,
      top: artboardTop,
      width: artboardWidth,
      height: artboardHeight,
      fill: '#ffffff',
      selectable: false,
      hoverCursor: 'default',
      rx: 0,
      ry: 0,
      shadow: new Shadow({
        color: 'rgba(0, 0, 0, 0.25)',
        blur: 30,
        offsetX: 0,
        offsetY: 8,
      }),
    });
    // Set a custom property to identify the artboard
    (this.artboard as any).isArtboard = true;
    (this.artboard as any).id = 'artboard_doc';

    this.canvas.add(this.artboard);
    this.canvas.sendObjectToBack(this.artboard);

    // 3. Load Canvas Data (objects) if any
    if (project.canvasData) {
      try {
        const parsed = JSON.parse(project.canvasData);
        // Clean out existing artboard to prevent duplicates during load
        const filteredObjects = (parsed.objects || []).filter((o: any) => o.id !== 'artboard_doc');
        
        // Deserialize objects manually or load using Fabric parser
        // For security and performance, let's parse objects and load them
        this.loadObjects(filteredObjects);
      } catch (err) {
        console.error('Error parsing canvas data:', err);
      }
    }

    // Centering and zoom defaults
    this.canvas.renderAll();
    this.saveToHistory();

    // 4. Attach Events
    this.setupEvents();
    this.setupKeyboardEvents();
    this.updateZundandUI();
  }

  private async loadObjects(objectsData: any[]) {
    if (!this.canvas) return;
    
    // We can load objects sequentially
    for (const objData of objectsData) {
      try {
        let obj: FabricObject | null = null;
        const options: TOptions<any> = { ...objData };
        delete (options as any).type;

        switch (objData.type?.toLowerCase()) {
          case 'rect':
            obj = new Rect(options);
            break;
          case 'circle':
            obj = new Circle(options);
            break;
          case 'line':
            obj = new Line([objData.x1, objData.y1, objData.x2, objData.y2], options);
            break;
          case 'path':
            obj = new Path(objData.path, options);
            break;
          case 'itext':
            obj = new IText(objData.text || 'Text', options);
            break;
          case 'image':
            // Fabric v6+ image loading from source
            if (objData.src) {
              const imgElement = await new Promise<HTMLImageElement>((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => resolve(img);
                img.onerror = () => reject(new Error('Image load fail'));
                img.src = objData.src;
              });
              obj = new FabricImage(imgElement, options);
            }
            break;
        }

        if (obj) {
          // Set custom id and name
          (obj as any).id = objData.id || crypto.randomUUID();
          (obj as any).name = objData.name || `${objData.type?.toUpperCase()} Item`;
          this.canvas.add(obj);
        }
      } catch (e) {
        console.error('Failed to load object:', e);
      }
    }
    
    this.canvas.renderAll();
    this.updateLayersList();
  }

  private setupEvents() {
    if (!this.canvas) return;

    this.canvas.on('selection:created', () => this.updateZundandUI());
    this.canvas.on('selection:updated', () => this.updateZundandUI());
    this.canvas.on('selection:cleared', () => this.updateZundandUI());
    
    this.canvas.on('object:modified', () => {
      this.saveToHistory();
      this.triggerAutosave();
      this.updateLayersList();
    });

    this.canvas.on('object:added', (e) => {
      const target = e.target;
      if (target && !(target as any).isArtboard && !(target as any).id) {
        (target as any).id = crypto.randomUUID();
        (target as any).name = (target as any).name || `${target.type?.toUpperCase()} Object`;
      }
      this.updateLayersList();
    });

    this.canvas.on('object:removed', () => {
      this.updateLayersList();
    });

    // Mouse Wheel Zoom
    this.canvas.on('mouse:wheel', (opt) => {
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
    this.canvas.on('mouse:down', (opt) => {
      const evt = opt.e as any;
      const isMiddleClick = evt.button === 1;
      const isPanMode = this.spacePressed || useEditorStore.getState().isPanning || useEditorStore.getState().activeTool === 'pan' || isMiddleClick;
      
      if (isPanMode) {
        this.isDragging = true;
        this.canvas!.selection = false;
        this.canvas!.discardActiveObject();
        this.canvas!.renderAll();
        this.lastPosX = (opt as any).pointer ? (opt as any).pointer.x : (evt.clientX || (evt.touches && evt.touches[0]?.clientX) || 0);
        this.lastPosY = (opt as any).pointer ? (opt as any).pointer.y : (evt.clientY || (evt.touches && evt.touches[0]?.clientY) || 0);
      }
    });

    this.canvas.on('mouse:move', (opt) => {
      const e = opt.e as any;
      if (this.isDragging && this.canvas) {
        const clientX = (opt as any).pointer ? (opt as any).pointer.x : (e.clientX || (e.touches && e.touches[0]?.clientX) || 0);
        const clientY = (opt as any).pointer ? (opt as any).pointer.y : (e.clientY || (e.touches && e.touches[0]?.clientY) || 0);

        const vpt = this.canvas.viewportTransform 
          ? [...this.canvas.viewportTransform] as unknown as TMat2D 
          : [1, 0, 0, 1, 0, 0] as TMat2D;
        vpt[4] += clientX - this.lastPosX;
        vpt[5] += clientY - this.lastPosY;
        this.canvas.setViewportTransform(vpt);
        this.canvas.requestRenderAll();
        this.lastPosX = clientX;
        this.lastPosY = clientY;
      }
    });

    this.canvas.on('mouse:up', () => {
      if (this.isDragging) {
        this.isDragging = false;
        if (this.canvas) {
          this.canvas.selection = true;
        }
      }
    });

    // Infinite Canvas Grid Rendering
    this.canvas.on('after:render', (opt) => {
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
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)'; // very subtle white grid lines
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
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.09)';
      ctx.beginPath();
      for (let x = Math.floor(left / (gridSpacing * 5)) * (gridSpacing * 5); x <= right; x += gridSpacing * 5) {
        const vx = x * zoom + vpt[4];
        ctx.moveTo(vx, 0);
        ctx.lineTo(vx, height);
      }
      for (let y = Math.floor(top / (gridSpacing * 5)) * (gridSpacing * 5); y <= bottom; y += gridSpacing * 5) {
        const vy = y * zoom + vpt[5];
        ctx.moveTo(0, vy);
        ctx.lineTo(width, vy);
      }
      ctx.stroke();
      
      ctx.restore();
    });
  }

  private setupKeyboardEvents() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  public syncActiveTool(tool: any) {
    if (!this.canvas) return;
    
    if (tool === 'pan') {
      this.canvas.defaultCursor = 'grab';
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
      this.canvas.defaultCursor = 'default';
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
        fill: obj.fill as string || '#000000',
        stroke: obj.stroke as string || '',
        strokeWidth: obj.strokeWidth || 0,
        opacity: obj.opacity || 1,
        rx: (obj as Rect).rx || 0,
        shadowColor: shadowObj?.color || '',
        shadowBlur: shadowObj?.blur || 0,
        shadowOffsetX: shadowObj?.offsetX || 0,
        shadowOffsetY: shadowObj?.offsetY || 0,
        // Text specific
        fontFamily: (obj as IText).fontFamily || 'Inter',
        fontSize: (obj as IText).fontSize || 24,
        fontWeight: (obj as IText).fontWeight || 'normal',
        charSpacing: (obj as IText).charSpacing || 0,
        lineHeight: (obj as IText).lineHeight || 1.15,
        textAlign: (obj as IText).textAlign || 'left',
        fontStyle: (obj as IText).fontStyle || 'normal',
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
    const objects = this.canvas.getObjects().filter((obj) => !(obj as any).isArtboard);
    
    // Reverse layer order to display layers from top-to-bottom
    const layers = objects.slice().reverse().map((obj) => ({
      id: (obj as any).id || crypto.randomUUID(),
      name: (obj as any).name || `${obj.type?.toUpperCase()} Layer`,
      type: obj.type || 'unknown',
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
    if (this.undoStack.length > 0 && this.undoStack[this.undoStack.length - 1] === state) {
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
      useEditorStore.getState().setHistoryState(this.undoStack.length > 1, true);
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
      useEditorStore.getState().setHistoryState(true, this.redoStack.length > 0);
      this.triggerAutosave();
    });
  }

  private getCleanCanvasJSON(): string {
    if (!this.canvas) return '';
    // Export objects excluding artboard
    const objects = this.canvas.getObjects().filter((obj) => !(obj as any).isArtboard);
    const objectsData = objects.map((obj) => {
      const data = obj.toObject(['id', 'name', 'rx', 'ry', 'shadow']);
      return data;
    });

    return JSON.stringify({
      objects: objectsData,
    });
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
      console.error('Failed to load canvas state:', e);
    }

    this.canvas.renderAll();
    this.updateZundandUI();
  }

  // OBJECT GENERATION
  public addRectangle() {
    if (!this.canvas || !this.artboard) return;

    const rect = new Rect({
      left: this.artboard.left! + 50,
      top: this.artboard.top! + 50,
      width: 150,
      height: 100,
      fill: '#3b82f6',
      stroke: '',
      strokeWidth: 0,
      rx: 8,
      ry: 8,
      opacity: 1,
    });
    
    (rect as any).id = crypto.randomUUID();
    (rect as any).name = 'Rectangle';
    
    this.canvas.add(rect);
    this.canvas.setActiveObject(rect);
    this.canvas.renderAll();
    this.saveToHistory();
    this.triggerAutosave();
  }

  public addCircle() {
    if (!this.canvas || !this.artboard) return;

    const circle = new Circle({
      left: this.artboard.left! + 60,
      top: this.artboard.top! + 60,
      radius: 60,
      fill: '#10b981',
      stroke: '',
      strokeWidth: 0,
      opacity: 1,
    });

    (circle as any).id = crypto.randomUUID();
    (circle as any).name = 'Circle';

    this.canvas.add(circle);
    this.canvas.setActiveObject(circle);
    this.canvas.renderAll();
    this.saveToHistory();
    this.triggerAutosave();
  }

  public addLine() {
    if (!this.canvas || !this.artboard) return;

    const x1 = this.artboard.left! + 40;
    const y1 = this.artboard.top! + 40;
    const x2 = x1 + 150;
    const y2 = y1 + 100;

    const line = new Line([x1, y1, x2, y2], {
      stroke: '#ef4444',
      strokeWidth: 4,
      opacity: 1,
    });

    (line as any).id = crypto.randomUUID();
    (line as any).name = 'Line';

    this.canvas.add(line);
    this.canvas.setActiveObject(line);
    this.canvas.renderAll();
    this.saveToHistory();
    this.triggerAutosave();
  }

  public addArrow() {
    if (!this.canvas || !this.artboard) return;

    const left = this.artboard.left! + 40;
    const top = this.artboard.top! + 40;

    // Render arrow as a custom path for rich editing
    const arrowPath = new Path('M 0 10 L 100 10 M 100 10 L 80 0 M 100 10 L 80 20', {
      left,
      top,
      stroke: '#f59e0b',
      strokeWidth: 4,
      fill: '',
      opacity: 1,
    });

    (arrowPath as any).id = crypto.randomUUID();
    (arrowPath as any).name = 'Arrow';

    this.canvas.add(arrowPath);
    this.canvas.setActiveObject(arrowPath);
    this.canvas.renderAll();
    this.saveToHistory();
    this.triggerAutosave();
  }

  public addText() {
    if (!this.canvas || !this.artboard) return;

    const text = new IText('Double click to edit', {
      left: this.artboard.left! + 50,
      top: this.artboard.top! + 120,
      fontFamily: 'Inter',
      fontSize: 28,
      fill: '#1e293b',
      fontWeight: 'bold',
      opacity: 1,
    });

    (text as any).id = crypto.randomUUID();
    (text as any).name = 'Text Block';

    this.canvas.add(text);
    this.canvas.setActiveObject(text);
    this.canvas.renderAll();
    this.saveToHistory();
    this.triggerAutosave();
  }

  public async addImage(url: string) {
    if (!this.canvas || !this.artboard) return;

    try {
      const imgElement = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Image failed to load'));
        img.src = url;
      });

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
        left: this.artboard.left! + 40,
        top: this.artboard.top! + 40,
        width,
        height,
        opacity: 1,
      });

      (fabImage as any).id = crypto.randomUUID();
      (fabImage as any).name = 'Image';

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
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
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
    const validObjects = activeObjects.filter((obj) => !(obj as any).isArtboard);
    if (validObjects.length <= 1) return;

    // Convert selection to a single group
    const group = new Group(validObjects, {
      subTargetCheck: true,
    });
    (group as any).id = crypto.randomUUID();
    (group as any).name = 'Group';

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
    if (!activeObject || activeObject.type !== 'group') return;

    const group = activeObject as Group;
    const objects = group.getObjects();

    // Fabric v6+ ungroup releases objects in coordinate space
    if (typeof (group as any).destroy === 'function') {
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
      const found = this.canvas.getObjects().find((obj) => (obj as any).id === objectId);
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
      if (key.startsWith('shadow')) {
        let currentShadow = obj.shadow as Shadow | null;
        if (!currentShadow) {
          currentShadow = new Shadow({
            color: 'rgba(0,0,0,0)',
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

        if (key === 'shadowColor') shadowOptions.color = value;
        if (key === 'shadowBlur') shadowOptions.blur = parseFloat(value) || 0;
        if (key === 'shadowOffsetX') shadowOptions.offsetX = parseFloat(value) || 0;
        if (key === 'shadowOffsetY') shadowOptions.offsetY = parseFloat(value) || 0;

        obj.set({ shadow: new Shadow(shadowOptions) });
      } else {
        // Standard property
        obj.set({ [key]: value });
      }
    });

    this.canvas.renderAll();
    this.updateZundandUI();
    this.saveToHistory();
    this.triggerAutosave();
  }

  public setArtboardProperty(key: 'width' | 'height' | 'fill', value: any) {
    if (!this.canvas || !this.artboard) return;

    if (key === 'width') {
      const newWidth = parseInt(value) || 100;
      this.artboard.set({ width: newWidth });
      const currentProj = useEditorStore.getState().currentProject;
      if (currentProj) {
        useEditorStore.getState().setCurrentProject({ ...currentProj, width: newWidth });
      }
    } else if (key === 'height') {
      const newHeight = parseInt(value) || 100;
      this.artboard.set({ height: newHeight });
      const currentProj = useEditorStore.getState().currentProject;
      if (currentProj) {
        useEditorStore.getState().setCurrentProject({ ...currentProj, height: newHeight });
      }
    } else if (key === 'fill') {
      this.artboard.set({ fill: value });
    }

    // Keep it centered or re-center it if resized
    const w = this.canvas.getWidth();
    const h = this.canvas.getHeight();
    this.artboard.set({
      left: (w - this.artboard.width!) / 2,
      top: (h - this.artboard.height!) / 2,
    });

    this.canvas.renderAll();
    this.saveToHistory();
    this.triggerAutosave();
  }

  // LAYER LIST MODIFIERS
  public reorderLayer(id: string, dir: 'up' | 'down') {
    if (!this.canvas) return;

    const objects = this.canvas.getObjects().filter((obj) => !(obj as any).isArtboard);
    const index = objects.findIndex((obj) => (obj as any).id === id);
    if (index === -1) return;

    const targetObj = objects[index];
    
    // In objects array, index 0 is bottom, index length-1 is top.
    // To move standard button 'up' in list (visually up towards index 0 of layers list, which is higher stacking index):
    if (dir === 'up' && index < objects.length - 1) {
      const targetAbsIndex = this.canvas.getObjects().indexOf(objects[index + 1]);
      this.canvas.moveObjectTo(targetObj, targetAbsIndex);
    } else if (dir === 'down' && index > 0) {
      const targetAbsIndex = this.canvas.getObjects().indexOf(objects[index - 1]);
      this.canvas.moveObjectTo(targetObj, targetAbsIndex);
    }

    this.canvas.renderAll();
    this.updateLayersList();
    this.saveToHistory();
    this.triggerAutosave();
  }

  public reorderLayersByIndex(sourceIndex: number, targetIndex: number) {
    if (!this.canvas) return;

    const objects = this.canvas.getObjects().filter((obj) => !(obj as any).isArtboard);
    
    // Convert layers list index (reversed) to stacking order index
    const fabSourceIndex = (objects.length - 1) - sourceIndex;
    const fabTargetIndex = (objects.length - 1) - targetIndex;

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
    if (!this.canvas) return;
    const activeObject = this.canvas.getActiveObject();
    if (activeObject && !(activeObject as any).isArtboard) {
      activeObject.clone().then((cloned) => {
        this.clipboard = cloned;
      });
    }
  }

  public pasteSelected() {
    if (!this.canvas || !this.clipboard) return;
    
    this.clipboard.clone().then((clonedObj) => {
      if (!clonedObj || !this.canvas) return;
      
      this.canvas.discardActiveObject();
      clonedObj.set({
        left: clonedObj.left! + 20,
        top: clonedObj.top! + 20,
        evented: true,
      });
      
      (clonedObj as any).id = crypto.randomUUID();
      (clonedObj as any).name = `${(this.clipboard as any).name || 'Pasted Object'} Copy`;
      
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
      // Set grid-like workspace visual (e.g. dots or dark styling)
      this.canvas.backgroundColor = '#15151a'; // deeper dark with visual gridding done by parent viewport or custom pattern
    } else {
      this.canvas.backgroundColor = '#1c1c24';
    }
    
    this.canvas.renderAll();
  }

  // EXPORT UTILITIES
  public exportToImage(format: 'png' | 'jpeg' | 'webp' | 'svg'): string {
    if (!this.canvas || !this.artboard) return '';

    // If svg, Fabric can generate standard SVG
    if (format === 'svg') {
      // We generate SVG only for objects within the artboard bounds
      // To export clean SVG, we can define clipping bounds or extract the SVG string
      // Let's do a clean SVG generation of the canvas, but wrapped in artboard's viewport viewbox
      const activeSelection = this.canvas.getActiveObject();
      this.canvas.discardActiveObject(); // deselect to avoid export indicators

      const originalVpt = [...this.canvas.viewportTransform!] as unknown as TMat2D;
      
      // Temporarily zoom/pan so artboard is 0,0 and exactly at 100% zoom
      this.canvas.setViewportTransform([1, 0, 0, 1, -this.artboard.left!, -this.artboard.top!] as TMat2D);
      
      const svgOutput = this.canvas.toSVG({
        width: String(this.artboard.width!),
        height: String(this.artboard.height!),
        viewBox: {
          x: 0,
          y: 0,
          width: this.artboard.width!,
          height: this.artboard.height!,
        },
      });

      // Restore viewport
      this.canvas.setViewportTransform(originalVpt);
      if (activeSelection) this.canvas.setActiveObject(activeSelection);
      this.canvas.renderAll();

      return `data:image/svg+xml;utf8,${encodeURIComponent(svgOutput)}`;
    }

    // PNG / JPEG / WEBP
    const activeSelection = this.canvas.getActiveObject();
    this.canvas.discardActiveObject(); // deselect

    const originalVpt = [...this.canvas.viewportTransform!] as unknown as TMat2D;
    const originalWidth = this.canvas.getWidth();
    const originalHeight = this.canvas.getHeight();

    // Prevent grid lines from rendering during export
    this.isExporting = true;

    // Temporarily resize canvas to match the artboard's true dimensions
    this.canvas.setDimensions({
      width: this.artboard.width!,
      height: this.artboard.height!
    });

    // For perfect rendering, align to top-left (0,0) at 100% zoom
    this.canvas.setViewportTransform([1, 0, 0, 1, 0, 0] as TMat2D);
    this.canvas.renderAll();

    // Use toDataURL at 2x multiplier for ultra-crisp results
    const dataUrl = this.canvas.toDataURL({
      format: format === 'jpeg' ? 'jpeg' : format === 'webp' ? 'webp' : 'png',
      quality: 1.0,
      multiplier: 2, // 2x export scale
    });

    // Restore original canvas dimensions & viewport transform
    this.canvas.setDimensions({
      width: originalWidth,
      height: originalHeight
    });
    this.canvas.setViewportTransform(originalVpt);
    
    // Clear the export flag and restore selection
    this.isExporting = false;
    if (activeSelection) this.canvas.setActiveObject(activeSelection);
    this.canvas.renderAll();

    return dataUrl;
  }

  // AUTOSAVE TRIGGER
  private triggerAutosave() {
    if (!this.canvas || !this.onProjectSaveCallback) return;
    
    // Generate low-res thumbnail
    const originalVpt = [...this.canvas.viewportTransform!] as unknown as TMat2D;
    const originalWidth = this.canvas.getWidth();
    const originalHeight = this.canvas.getHeight();

    // Prevent grid lines from rendering on thumbnail
    this.isExporting = true;

    let thumbnail = '';
    if (this.artboard) {
      // Temporarily resize canvas to match the artboard's true dimensions
      this.canvas.setDimensions({
        width: this.artboard.width!,
        height: this.artboard.height!
      });

      // Align to top-left (0,0) at 100% zoom
      this.canvas.setViewportTransform([1, 0, 0, 1, 0, 0] as TMat2D);
      this.canvas.renderAll();

      thumbnail = this.canvas.toDataURL({
        format: 'png',
        quality: 0.6,
        multiplier: 0.25, // miniature thumbnail
      });

      // Restore original canvas dimensions
      this.canvas.setDimensions({
        width: originalWidth,
        height: originalHeight
      });
    }

    this.canvas.setViewportTransform(originalVpt);
    this.isExporting = false;
    this.canvas.renderAll();

    const canvasData = this.getCleanCanvasJSON();
    this.onProjectSaveCallback(thumbnail, canvasData);
  }

  public zoomToFit() {
    if (!this.canvas || !this.artboard) return;

    const w = this.canvas.getWidth();
    const h = this.canvas.getHeight();
    const aw = this.artboard.width!;
    const ah = this.artboard.height!;

    const padding = 60;
    const scaleX = (w - padding * 2) / aw;
    const scaleY = (h - padding * 2) / ah;
    const zoom = Math.min(scaleX, scaleY, 2.0); // max 2x

    const artboardCenterX = this.artboard.left! + aw / 2;
    const artboardCenterY = this.artboard.top! + ah / 2;

    const vpt = [
      zoom,
      0,
      0,
      zoom,
      w / 2 - artboardCenterX * zoom,
      h / 2 - artboardCenterY * zoom
    ] as TMat2D;

    this.canvas.setViewportTransform(vpt);
    this.canvas.renderAll();

    useEditorStore.getState().setZoom(zoom);
  }

  public resize(width: number, height: number) {
    if (!this.canvas || !this.artboard) return;
    
    // Save current zoom
    const zoom = this.canvas.getZoom();
    
    // Keep artboard center focused at canvas center
    const aw = this.artboard.width!;
    const ah = this.artboard.height!;
    const artboardCenterX = this.artboard.left! + aw / 2;
    const artboardCenterY = this.artboard.top! + ah / 2;
    
    this.canvas.setDimensions({ width, height });
    
    const vpt = [
      zoom,
      0,
      0,
      zoom,
      width / 2 - artboardCenterX * zoom,
      height / 2 - artboardCenterY * zoom
    ] as TMat2D;
    
    this.canvas.setViewportTransform(vpt);
    this.canvas.renderAll();
  }

  public dispose() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    if (this.canvas) {
      this.canvas.dispose();
      this.canvas = null;
    }
  }
}
