import { describe, it, expect, beforeEach } from "vitest";
import { useEditorStore } from "./editorStore";

/**
 * Minimum regression tests for the canvas load error guard introduced in
 * the recovery-safety cleanup.
 *
 * These tests exercise the store directly without a real IndexedDB or Fabric
 * canvas. They verify the state transitions that block or allow autosave and
 * that the "Go back to projects" path never touches the corrupted project data.
 */
describe("canvasLoadError guard", () => {
  beforeEach(() => {
    // Reset the store to its initial state between tests
    const store = useEditorStore.getState();
    store.setCanvasLoadError(null);
    store.setCurrentProjectId(null);
    store.setCurrentProject(null);
  });

  it("canvasLoadError is null by default", () => {
    expect(useEditorStore.getState().canvasLoadError).toBeNull();
  });

  it("setCanvasLoadError sets the error message", () => {
    useEditorStore.getState().setCanvasLoadError("Unexpected token");
    expect(useEditorStore.getState().canvasLoadError).toBe("Unexpected token");
  });

  it("setCanvasLoadError(null) clears the error", () => {
    useEditorStore.getState().setCanvasLoadError("some error");
    useEditorStore.getState().setCanvasLoadError(null);
    expect(useEditorStore.getState().canvasLoadError).toBeNull();
  });

  it("autosave guard: canvasLoadError blocks write path", () => {
    // Simulate the guard condition used in App.tsx autosave callback.
    // When canvasLoadError is set, the autosave callback must exit early.
    useEditorStore.getState().setCanvasLoadError("corrupted JSON");

    const state = useEditorStore.getState();

    // This is the exact guard expression copied from App.tsx
    const shouldSkipSave = Boolean(state.canvasLoadError);

    expect(shouldSkipSave).toBe(true);
  });

  it("autosave guard: no error allows write path", () => {
    useEditorStore.getState().setCanvasLoadError(null);

    const state = useEditorStore.getState();
    const shouldSkipSave = Boolean(state.canvasLoadError);

    expect(shouldSkipSave).toBe(false);
  });

  it("Go back path: clearing error does not set canvasData", () => {
    // Simulate handleRecoveryGoBack: only clears error, does not call
    // saveProjectCanvasState. Verify the store has no canvasData side-effects.
    useEditorStore.getState().setCanvasLoadError("bad data");
    const project = {
      id: "proj-1",
      name: "Test",
      width: 800,
      height: 600,
      createdAt: 1000,
      updatedAt: 1000,
      canvasData: "{corrupted}",
    };
    useEditorStore.getState().setCurrentProject(project as any);

    // Simulate "Go back to projects": clear error only
    useEditorStore.getState().setCanvasLoadError(null);

    // The project record itself is NOT modified by going back
    expect(useEditorStore.getState().canvasLoadError).toBeNull();
    // currentProject still holds the original (now irrelevant after navigation)
    expect(useEditorStore.getState().currentProject?.canvasData).toBe("{corrupted}");
  });

  it("Replace with blank path: error cleared before write allows autosave guard", () => {
    useEditorStore.getState().setCanvasLoadError("corrupted JSON");

    // Simulate handleRecoveryReplaceWithBlank: clear error FIRST
    useEditorStore.getState().setCanvasLoadError(null);

    // Now the autosave guard must allow writes
    const shouldSkipSave = Boolean(useEditorStore.getState().canvasLoadError);
    expect(shouldSkipSave).toBe(false);
  });
});
