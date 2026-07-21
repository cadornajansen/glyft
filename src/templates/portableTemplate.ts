import { getProjectById, saveProject } from "../db/projectDb";
import {
  CANVAS_DOCUMENT_VERSION,
  type CanvasDocument,
  type CanvasObjectData,
  type Project,
} from "../types";

export const GLYFT_TEMPLATE_FORMAT = "glyft-template";
export const GLYFT_TEMPLATE_VERSION = 1;
export const MAX_TEMPLATE_FILE_BYTES = 64 * 1024 * 1024;
export const MAX_TEMPLATE_ASSET_BYTES = 48 * 1024 * 1024;

const ASSET_PREFIX = "glyft-asset://";

export interface PortableTemplateManifest {
  format: typeof GLYFT_TEMPLATE_FORMAT;
  version: typeof GLYFT_TEMPLATE_VERSION;
  name: string;
  width: number;
  height: number;
  createdAt: number;
  documentVersion: number;
  assetCount: number;
}

export interface PortableTemplateAsset {
  id: string;
  mimeType: string;
  base64: string;
}

export interface PortableTemplatePackage {
  manifest: PortableTemplateManifest;
  document: CanvasDocument;
  assets: PortableTemplateAsset[];
  preview?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function estimateBase64Bytes(value: string): number {
  const padding = value.endsWith("==") ? 2 : value.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((value.length * 3) / 4) - padding);
}

function parseDataUrl(source: string): { mimeType: string; base64: string } | null {
  const match = /^data:([^;,]+)?;base64,([A-Za-z0-9+/=\s]+)$/i.exec(source);
  if (!match) return null;
  return {
    mimeType: match[1] || "application/octet-stream",
    base64: match[2].replace(/\s/g, ""),
  };
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(new Error("Could not encode bundled image."));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read image."));
    reader.readAsDataURL(blob);
  });
}

async function normalizeAssetSource(source: string): Promise<{
  mimeType: string;
  base64: string;
}> {
  const inline = parseDataUrl(source);
  if (inline) return inline;

  let response: Response;
  try {
    response = await fetch(source, { mode: "cors" });
  } catch {
    throw new Error(
      `An image could not be bundled because its source blocks cross-origin access: ${source}`,
    );
  }

  if (!response.ok) {
    throw new Error(`An image could not be downloaded for bundling (${response.status}).`);
  }

  const dataUrl = await blobToDataUrl(await response.blob());
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) throw new Error("An image could not be encoded for the template.");
  return parsed;
}

async function bundleObjectAssets(
  object: CanvasObjectData,
  sourceToId: Map<string, string>,
  assets: PortableTemplateAsset[],
): Promise<CanvasObjectData> {
  const bundled: CanvasObjectData = { ...object };

  if (typeof object.src === "string" && object.src.length > 0) {
    let assetId = sourceToId.get(object.src);
    if (!assetId) {
      const normalized = await normalizeAssetSource(object.src);
      assetId = crypto.randomUUID();
      sourceToId.set(object.src, assetId);
      assets.push({ id: assetId, ...normalized });
    }
    bundled.src = `${ASSET_PREFIX}${assetId}`;
  }

  if (Array.isArray(object.objects)) {
    bundled.objects = await Promise.all(
      object.objects
        .filter(isRecord)
        .map((child) =>
          bundleObjectAssets(child as CanvasObjectData, sourceToId, assets),
        ),
    );
  }

  return bundled;
}

function restoreObjectAssets(
  object: CanvasObjectData,
  assets: Map<string, PortableTemplateAsset>,
): CanvasObjectData {
  const restored: CanvasObjectData = { ...object };

  if (typeof object.src === "string" && object.src.startsWith(ASSET_PREFIX)) {
    const id = object.src.slice(ASSET_PREFIX.length);
    const asset = assets.get(id);
    if (!asset) throw new Error(`Template is missing bundled asset ${id}.`);
    restored.src = `data:${asset.mimeType};base64,${asset.base64}`;
  }

  if (Array.isArray(object.objects)) {
    restored.objects = object.objects
      .filter(isRecord)
      .map((child) =>
        restoreObjectAssets(child as CanvasObjectData, assets),
      );
  }

  return restored;
}

function validatePackage(value: unknown): PortableTemplatePackage {
  if (!isRecord(value)) throw new Error("This is not a Glyft template package.");
  const manifest = value.manifest;
  const document = value.document;
  const rawAssets = value.assets;

  if (!isRecord(manifest)) throw new Error("Template manifest is missing.");
  if (manifest.format !== GLYFT_TEMPLATE_FORMAT) {
    throw new Error("Unsupported template format.");
  }
  if (manifest.version !== GLYFT_TEMPLATE_VERSION) {
    throw new Error(`Unsupported template version: ${String(manifest.version)}.`);
  }
  if (
    typeof manifest.name !== "string" ||
    !Number.isFinite(manifest.width) ||
    !Number.isFinite(manifest.height) ||
    Number(manifest.width) <= 0 ||
    Number(manifest.height) <= 0 ||
    Number(manifest.width) > 100_000 ||
    Number(manifest.height) > 100_000
  ) {
    throw new Error("Template dimensions or name are invalid.");
  }
  if (!isRecord(document) || !Array.isArray(document.objects)) {
    throw new Error("Template document is malformed.");
  }
  if (!Array.isArray(rawAssets)) throw new Error("Template asset list is malformed.");

  const ids = new Set<string>();
  let assetBytes = 0;
  const assets: PortableTemplateAsset[] = rawAssets.map((raw) => {
    if (
      !isRecord(raw) ||
      typeof raw.id !== "string" ||
      typeof raw.mimeType !== "string" ||
      typeof raw.base64 !== "string" ||
      !/^[A-Za-z0-9+/=]*$/.test(raw.base64)
    ) {
      throw new Error("A bundled template asset is malformed.");
    }
    if (ids.has(raw.id)) throw new Error("Template contains duplicate asset IDs.");
    ids.add(raw.id);
    assetBytes += estimateBase64Bytes(raw.base64);
    return { id: raw.id, mimeType: raw.mimeType, base64: raw.base64 };
  });

  if (assetBytes > MAX_TEMPLATE_ASSET_BYTES) {
    throw new Error("Template assets exceed the 48 MB safety limit.");
  }

  return {
    manifest: manifest as unknown as PortableTemplateManifest,
    document: document as unknown as CanvasDocument,
    assets,
    preview: typeof value.preview === "string" ? value.preview : undefined,
  };
}

export async function createPortableTemplatePackage(
  project: Project,
): Promise<PortableTemplatePackage> {
  const parsed = JSON.parse(project.canvasData) as CanvasDocument;
  if (!parsed || !Array.isArray(parsed.objects)) {
    throw new Error("The current project document is malformed.");
  }

  const assets: PortableTemplateAsset[] = [];
  const sourceToId = new Map<string, string>();
  const objects = await Promise.all(
    parsed.objects.map((object) => bundleObjectAssets(object, sourceToId, assets)),
  );

  return {
    manifest: {
      format: GLYFT_TEMPLATE_FORMAT,
      version: GLYFT_TEMPLATE_VERSION,
      name: project.name,
      width: project.width,
      height: project.height,
      createdAt: Date.now(),
      documentVersion: parsed.version ?? CANVAS_DOCUMENT_VERSION,
      assetCount: assets.length,
    },
    document: { ...parsed, objects },
    assets,
    preview: project.thumbnail,
  };
}

export async function downloadProjectAsTemplate(projectId: string): Promise<void> {
  const project = await getProjectById(projectId);
  if (!project) throw new Error("Project could not be found.");

  const template = await createPortableTemplatePackage(project);
  const contents = JSON.stringify(template);
  if (new Blob([contents]).size > MAX_TEMPLATE_FILE_BYTES) {
    throw new Error("Template exceeds the 64 MB package limit.");
  }

  const blob = new Blob([contents], { type: "application/vnd.glyft.template+json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${project.name.replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "") || "template"}.glyft`;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export async function importPortableTemplatePackage(
  input: unknown,
): Promise<Project> {
  const template = validatePackage(input);
  const assetMap = new Map(template.assets.map((asset) => [asset.id, asset]));
  const restoredDocument: CanvasDocument = {
    ...template.document,
    objects: template.document.objects.map((object) =>
      restoreObjectAssets(object, assetMap),
    ),
  };
  const now = Date.now();
  const project: Project = {
    id: crypto.randomUUID(),
    name: template.manifest.name,
    width: template.manifest.width,
    height: template.manifest.height,
    createdAt: now,
    updatedAt: now,
    thumbnail: template.preview,
    canvasData: JSON.stringify(restoredDocument),
  };
  await saveProject(project);
  return project;
}

export async function importPortableTemplateFile(file: File): Promise<Project> {
  if (file.size > MAX_TEMPLATE_FILE_BYTES) {
    throw new Error("Template exceeds the 64 MB package limit.");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    throw new Error("Template package is not valid JSON.");
  }
  return importPortableTemplatePackage(parsed);
}
