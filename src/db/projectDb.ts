import Dexie, { type Table } from 'dexie';
import { CANVAS_DOCUMENT_VERSION, type Project } from "../types";

export class GlyftDatabase extends Dexie {
  projects!: Table<Project>;

  constructor() {
    super("GlyftDatabase");
    this.version(1).stores({
      projects: "id, name, createdAt, updatedAt",
    });
  }
}

export const db = new GlyftDatabase();

// Database helper operations
export async function getAllProjects(): Promise<Project[]> {
  return db.projects.orderBy("updatedAt").reverse().toArray();
}

export async function getProjectById(id: string): Promise<Project | undefined> {
  return db.projects.get(id);
}

export async function saveProject(project: Project): Promise<string> {
  await db.projects.put(project);
  return project.id;
}

export async function deleteProject(id: string): Promise<void> {
  await db.projects.delete(id);
}

export async function resetLocalApp(): Promise<void> {
  await db.delete();
}

export async function createNewProject(
  name: string,
  width = 800,
  height = 600,
): Promise<Project> {
  const newProj: Project = {
    id: crypto.randomUUID(),
    name,
    width,
    height,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    canvasData: JSON.stringify({
      version: CANVAS_DOCUMENT_VERSION,
      objects: [],
      background: "#ffffff",
    }),
  };
  await saveProject(newProj);
  return newProj;
}
