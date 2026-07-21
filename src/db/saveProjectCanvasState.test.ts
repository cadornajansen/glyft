import { describe, it, expect, beforeEach, afterEach } from "vitest";
import "fake-indexeddb/auto";
import { db } from "./projectDb";
import { saveProjectCanvasState } from "./saveProjectCanvasState";
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
});
