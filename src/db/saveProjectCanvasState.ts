import { db } from "./projectDb";
import { type Project } from "../types";

/**
 * Transaction-safe helper to persist project canvas data and thumbnail.
 * Inside a read/write transaction, it retrieves the latest database record,
 * merges only the canvasData, thumbnail, and updatedAt timestamp, and
 * preserves other metadata (name, width, height, createdAt, and future metadata).
 *
 * @returns The exact written Project object, or null if the project does not exist.
 */
export async function saveProjectCanvasState(
  projectId: string,
  canvasData: string,
  thumbnail: string | undefined,
  updatedAt: number = Date.now(),
): Promise<Project | null> {
  let persisted: Project | null = null;

  await db.transaction("rw", db.projects, async () => {
    const latest = await db.projects.get(projectId);

    if (!latest) {
      persisted = null;
      return;
    }

    persisted = {
      ...latest,
      canvasData,
      thumbnail,
      updatedAt,
    };

    await db.projects.put(persisted);
  });

  return persisted;
}
