import { describe, it, expect, beforeEach, afterEach } from "vitest";
import "fake-indexeddb/auto";
import { db } from "./projectDb";
import { saveProjectCanvasState } from "./saveProjectCanvasState";
import { updateProjectDimensions, renameProject, duplicateLatestProject } from "./updateProjectMetadata";
import { type Project } from "../types";

describe("saveProjectCanvasState", () => {
  beforeEach(async () => {
    // Open db if not already open
    if (!db.isOpen()) {
      await db.open();
    }
    await db.projects.clear();
  });

  afterEach(async () => {
    await db.projects.clear();
  });

  it("should return the exact returned object after saving", async () => {
    const originalProject: Project = {
      id: "test-id",
      name: "Original Name",
      width: 800,
      height: 600,
      createdAt: 1000,
      updatedAt: 1000,
      canvasData: JSON.stringify({ objects: [] }),
      thumbnail: "thumb-1",
    };

    await db.projects.put(originalProject);

    const saved = await saveProjectCanvasState(
      "test-id",
      JSON.stringify({ objects: [{ type: "rect" }] }),
      "thumb-2",
      2000,
    );

    expect(saved).not.toBeNull();
    expect(saved).toEqual({
      id: "test-id",
      name: "Original Name",
      width: 800,
      height: 600,
      createdAt: 1000,
      updatedAt: 2000,
      canvasData: JSON.stringify({ objects: [{ type: "rect" }] }),
      thumbnail: "thumb-2",
    });

    // Verify it is actually in the database
    const inDb = await db.projects.get("test-id");
    expect(inDb).toEqual(saved);
  });

  it("should preserve renaming (newer name in database than stale editor state)", async () => {
    const originalProject: Project = {
      id: "test-id",
      name: "Old Name",
      width: 800,
      height: 600,
      createdAt: 1000,
      updatedAt: 1000,
      canvasData: JSON.stringify({ objects: [] }),
      thumbnail: "thumb-1",
    };

    await db.projects.put(originalProject);

    // Concurrently or in the database, the name is updated (e.g. user renamed it)
    await db.projects.update("test-id", { name: "New Name", updatedAt: 1500 });

    // Stale editor state might still think name is "Old Name", but we call helper
    const saved = await saveProjectCanvasState(
      "test-id",
      JSON.stringify({ objects: [{ type: "circle" }] }),
      "thumb-2",
      2000,
    );

    expect(saved).not.toBeNull();
    // Name must be preserved as "New Name"
    expect(saved!.name).toBe("New Name");
    expect(saved!.canvasData).toBe(JSON.stringify({ objects: [{ type: "circle" }] }));
    expect(saved!.thumbnail).toBe("thumb-2");
    expect(saved!.updatedAt).toBe(2000);
  });

  it("should preserve dimension changes (newer width and height in database)", async () => {
    const originalProject: Project = {
      id: "test-id",
      name: "Test Project",
      width: 800,
      height: 600,
      createdAt: 1000,
      updatedAt: 1000,
      canvasData: JSON.stringify({ objects: [] }),
      thumbnail: "thumb-1",
    };

    await db.projects.put(originalProject);

    // Update dimensions in DB (e.g., user changed artboard settings)
    await db.projects.update("test-id", { width: 1920, height: 1080 });

    // Autosave helper is called
    const saved = await saveProjectCanvasState(
      "test-id",
      JSON.stringify({ objects: [] }),
      "thumb-new",
      2000,
    );

    expect(saved).not.toBeNull();
    expect(saved!.width).toBe(1920);
    expect(saved!.height).toBe(1080);
  });

  it("should preserve future metadata fields", async () => {
    // Store an extra field using a safe test cast
    const originalProject = {
      id: "test-id",
      name: "Test Project",
      width: 800,
      height: 600,
      createdAt: 1000,
      updatedAt: 1000,
      canvasData: JSON.stringify({ objects: [] }),
      thumbnail: "thumb-1",
      customMetadata: { source: "future" },
    } as any;

    await db.projects.put(originalProject);

    // Autosave helper is called
    const saved = (await saveProjectCanvasState(
      "test-id",
      JSON.stringify({ objects: [] }),
      "thumb-new",
      2000,
    )) as any;

    expect(saved).not.toBeNull();
    expect(saved.customMetadata).toEqual({ source: "future" });

    // Also check the db record
    const inDb = (await db.projects.get("test-id")) as any;
    expect(inDb.customMetadata).toEqual({ source: "future" });
  });

  it("should return null and not recreate the project if it is deleted before saving", async () => {
    const originalProject: Project = {
      id: "test-id",
      name: "Test Project",
      width: 800,
      height: 600,
      createdAt: 1000,
      updatedAt: 1000,
      canvasData: JSON.stringify({ objects: [] }),
      thumbnail: "thumb-1",
    };

    await db.projects.put(originalProject);

    // Delete the project
    await db.projects.delete("test-id");

    // Call autosave helper
    const saved = await saveProjectCanvasState(
      "test-id",
      JSON.stringify({ objects: [] }),
      "thumb-new",
      2000,
    );

    expect(saved).toBeNull();

    // Verify it was not recreated in the DB
    const inDb = await db.projects.get("test-id");
    expect(inDb).toBeUndefined();
  });

  it("should handle concurrency: preserving updates immediately before transaction reads", async () => {
    const originalProject: Project = {
      id: "test-id",
      name: "Original Name",
      width: 800,
      height: 600,
      createdAt: 1000,
      updatedAt: 1000,
      canvasData: JSON.stringify({ objects: [] }),
      thumbnail: "thumb-1",
    };

    await db.projects.put(originalProject);

    // Simulate concurrent modification immediately before transaction reads.
    const savePromise = saveProjectCanvasState(
      "test-id",
      JSON.stringify({ objects: [{ type: "line" }] }),
      "thumb-2",
      2500,
    );

    // Directly write to database. Dexie transactions are queued, so this write
    // will be executed.
    await db.projects.update("test-id", { name: "Concurrently Updated Name" });

    const saved = await savePromise;

    expect(saved).not.toBeNull();
    expect(saved!.name).toBe("Concurrently Updated Name");
    expect(saved!.updatedAt).toBe(2500);

    const inDb = await db.projects.get("test-id");
    expect(inDb!.name).toBe("Concurrently Updated Name");
  });

  describe("updateProjectMetadata Helpers", () => {
    it("A. Artboard dimensions persist", async () => {
      const project: Project = {
        id: "test-dimensions",
        name: "Dimension Test",
        width: 800,
        height: 600,
        createdAt: 1000,
        updatedAt: 1000,
        canvasData: "canvas-original",
        thumbnail: "thumb-original",
      };
      await db.projects.put(project);

      const updated = await updateProjectDimensions("test-dimensions", 1920, 1080, 2000);
      expect(updated).not.toBeNull();
      expect(updated!.width).toBe(1920);
      expect(updated!.height).toBe(1080);
      expect(updated!.canvasData).toBe("canvas-original");
      expect(updated!.thumbnail).toBe("thumb-original");
      expect(updated!.updatedAt).toBe(2000);

      const inDb = await db.projects.get("test-dimensions");
      expect(inDb).toEqual(updated);
    });

    it("B. Artboard update preserves concurrent canvas changes", async () => {
      const project: Project = {
        id: "test-dimensions-concurrency",
        name: "Concurrency Test",
        width: 800,
        height: 600,
        createdAt: 1000,
        updatedAt: 1000,
        canvasData: "canvas-original",
        thumbnail: "thumb-original",
      };
      await db.projects.put(project);

      // Concurrent change updates the canvasData in the DB
      await db.projects.update("test-dimensions-concurrency", {
        canvasData: "canvas-newer",
        thumbnail: "thumb-newer",
      });

      const updated = await updateProjectDimensions("test-dimensions-concurrency", 1200, 900, 2000);
      expect(updated).not.toBeNull();
      expect(updated!.width).toBe(1200);
      expect(updated!.height).toBe(900);
      expect(updated!.canvasData).toBe("canvas-newer");
      expect(updated!.thumbnail).toBe("thumb-newer");
    });

    it("C. Rename preserves canvas data", async () => {
      const project: Project = {
        id: "test-rename",
        name: "Old Name",
        width: 800,
        height: 600,
        createdAt: 1000,
        updatedAt: 1000,
        canvasData: "canvas-newer-state",
        thumbnail: "thumb-newer-state",
      };
      await db.projects.put(project);

      const updated = await renameProject("test-rename", "New Name", 2000);
      expect(updated).not.toBeNull();
      expect(updated!.name).toBe("New Name");
      expect(updated!.width).toBe(800);
      expect(updated!.height).toBe(600);
      expect(updated!.canvasData).toBe("canvas-newer-state");
      expect(updated!.thumbnail).toBe("thumb-newer-state");
      expect(updated!.updatedAt).toBe(2000);

      const inDb = await db.projects.get("test-rename");
      expect(inDb).toEqual(updated);
    });

    it("D. Rename missing project", async () => {
      // Do not put in DB
      const updated = await renameProject("non-existent", "New Name", 2000);
      expect(updated).toBeNull();

      const inDb = await db.projects.get("non-existent");
      expect(inDb).toBeUndefined();
    });

    it("E. Duplicate uses latest database record", async () => {
      const project: Project = {
        id: "source-id",
        name: "Source Project",
        width: 800,
        height: 600,
        createdAt: 1000,
        updatedAt: 1000,
        canvasData: "canvas-old-sidebar",
        thumbnail: "thumb-old-sidebar",
      };
      await db.projects.put(project);

      // Simulate a concurrent autosave that updates DB canvas data
      await db.projects.update("source-id", {
        canvasData: "canvas-new-autosave",
        thumbnail: "thumb-new-autosave",
      });

      const duplicate = await duplicateLatestProject("source-id");
      expect(duplicate).not.toBeNull();
      expect(duplicate!.id).not.toBe("source-id");
      expect(duplicate!.name).toBe("Source Project (Copy)");
      expect(duplicate!.canvasData).toBe("canvas-new-autosave");
      expect(duplicate!.thumbnail).toBe("thumb-new-autosave");
    });

    it("F. Duplicate creates independent record", async () => {
      const project: Project = {
        id: "source-id",
        name: "Source Project",
        width: 800,
        height: 600,
        createdAt: 1000,
        updatedAt: 1000,
        canvasData: "canvas-data",
        thumbnail: "thumb-data",
      };
      await db.projects.put(project);

      const duplicate = await duplicateLatestProject("source-id");
      expect(duplicate).not.toBeNull();
      expect(duplicate!.id).not.toBe("source-id");
      expect(duplicate!.createdAt).toBeGreaterThan(1000);
      expect(duplicate!.updatedAt).toBe(duplicate!.createdAt);

      // Mutate duplicate in DB
      await db.projects.update(duplicate!.id, { canvasData: "mutated-data" });

      // Verify source remains unchanged
      const source = await db.projects.get("source-id");
      expect(source!.canvasData).toBe("canvas-data");
    });

    it("G. Unknown metadata preservation", async () => {
      const project = {
        id: "meta-id",
        name: "Meta Project",
        width: 800,
        height: 600,
        createdAt: 1000,
        updatedAt: 1000,
        canvasData: "canvas-data",
        thumbnail: "thumb-data",
        extraFutureField: "future-value",
      } as any;
      await db.projects.put(project);

      const updatedDim = (await updateProjectDimensions("meta-id", 1024, 768, 2000)) as any;
      expect(updatedDim.extraFutureField).toBe("future-value");

      const updatedRename = (await renameProject("meta-id", "Renamed Meta", 3000)) as any;
      expect(updatedRename.extraFutureField).toBe("future-value");

      const duplicated = (await duplicateLatestProject("meta-id")) as any;
      expect(duplicated.extraFutureField).toBe("future-value");
    });
  });
});
