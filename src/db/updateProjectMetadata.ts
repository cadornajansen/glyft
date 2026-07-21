import { db } from "./projectDb";
import { type Project } from "../types";

/**
 * Transactional helper to update only the artboard dimensions of a project,
 * preserving all other metadata and canvas states.
 *
 * @returns The exact written Project object, or null if it no longer exists.
 */
export async function updateProjectDimensions(
  projectId: string,
  width: number,
  height: number,
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
      width,
      height,
      updatedAt,
    };

    await db.projects.put(persisted);
  });

  return persisted;
}

/**
 * Transactional helper to update only the name of a project,
 * preserving all other metadata and canvas states.
 *
 * @returns The exact written Project object, or null if it no longer exists.
 */
export async function renameProject(
  projectId: string,
  name: string,
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
      name,
      updatedAt,
    };

    await db.projects.put(persisted);
  });

  return persisted;
}

/**
 * Transactional helper to duplicate a project using the latest record from IndexedDB.
 *
 * @returns The newly created Project object, or null if the source project no longer exists.
 */
export async function duplicateLatestProject(
  projectId: string,
): Promise<Project | null> {
  let duplicated: Project | null = null;

  await db.transaction("rw", db.projects, async () => {
    const latest = await db.projects.get(projectId);

    if (!latest) {
      duplicated = null;
      return;
    }

    const now = Date.now();
    duplicated = {
      ...latest,
      id: crypto.randomUUID(),
      name: `${latest.name} (Copy)`,
      createdAt: now,
      updatedAt: now,
    };

    await db.projects.put(duplicated);
  });

  return duplicated;
}
