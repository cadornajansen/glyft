export interface CanvasHistoryState {
  canUndo: boolean;
  canRedo: boolean;
}

export interface CanvasHistoryManagerOptions {
  restore: (snapshot: string) => Promise<void> | void;
  onStateChange?: (state: CanvasHistoryState) => void;
  limit?: number;
}

/**
 * Owns undo/redo stack transitions and guarantees that failed restoration
 * cannot leave history permanently locked.
 */
export class CanvasHistoryManager {
  private readonly undoStack: string[] = [];
  private readonly redoStack: string[] = [];
  private readonly limit: number;
  private applying = false;

  public constructor(private readonly options: CanvasHistoryManagerOptions) {
    this.limit = Math.max(1, options.limit ?? 50);
  }

  public get isApplying(): boolean {
    return this.applying;
  }

  public push(snapshot: string): void {
    if (this.applying) return;
    if (this.undoStack.at(-1) === snapshot) return;

    this.undoStack.push(snapshot);
    if (this.undoStack.length > this.limit) {
      this.undoStack.splice(0, this.undoStack.length - this.limit);
    }

    this.redoStack.length = 0;
    this.emitState();
  }

  public async undo(currentSnapshot: string): Promise<boolean> {
    if (this.applying || this.undoStack.length <= 1) return false;

    const current = this.undoStack.pop();
    const target = this.undoStack.at(-1);
    if (!current || !target) return false;

    this.redoStack.push(currentSnapshot || current);
    this.applying = true;

    try {
      await this.options.restore(target);
      return true;
    } catch (error) {
      this.redoStack.pop();
      this.undoStack.push(current);
      throw error;
    } finally {
      this.applying = false;
      this.emitState();
    }
  }

  public async redo(currentSnapshot: string): Promise<boolean> {
    if (this.applying || this.redoStack.length === 0) return false;

    const target = this.redoStack.pop();
    if (!target) return false;

    this.undoStack.push(currentSnapshot);
    this.applying = true;

    try {
      await this.options.restore(target);
      return true;
    } catch (error) {
      this.undoStack.pop();
      this.redoStack.push(target);
      throw error;
    } finally {
      this.applying = false;
      this.emitState();
    }
  }

  public reset(initialSnapshot?: string): void {
    this.undoStack.length = 0;
    this.redoStack.length = 0;

    if (initialSnapshot) {
      this.undoStack.push(initialSnapshot);
    }

    this.emitState();
  }

  public getState(): CanvasHistoryState {
    return {
      canUndo: this.undoStack.length > 1,
      canRedo: this.redoStack.length > 0,
    };
  }

  private emitState(): void {
    this.options.onStateChange?.(this.getState());
  }
}
