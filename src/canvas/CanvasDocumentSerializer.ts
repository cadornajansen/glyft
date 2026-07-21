import {
  CANVAS_DOCUMENT_VERSION,
  type CanvasDocument,
  type CanvasObjectData,
} from "../types";

export interface ParsedCanvasDocument {
  document: CanvasDocument;
  migrated: boolean;
}

export interface SerializeCanvasDocumentInput {
  background?: string;
  objects: CanvasObjectData[];
  templateVersion?: number;
}

type UnknownCanvasDocument = Partial<CanvasDocument> &
  Record<string, unknown>;

/**
 * Owns the versioned Glyft canvas document format.
 *
 * Fabric object construction stays outside this module so parsing and
 * migrations remain deterministic and independently testable.
 */
export class CanvasDocumentSerializer {
  public parse(canvasData: string): ParsedCanvasDocument {
    const parsed = JSON.parse(canvasData) as UnknownCanvasDocument;

    const version = this.readFiniteNumber(parsed.version) ?? 0;
    const templateVersion = this.readFiniteNumber(parsed.templateVersion);
    const background =
      typeof parsed.background === "string" ? parsed.background : undefined;
    const objects = this.readObjects(parsed.objects);

    if (version >= CANVAS_DOCUMENT_VERSION) {
      return {
        document: {
          version: CANVAS_DOCUMENT_VERSION,
          templateVersion,
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
        templateVersion,
        background,
        objects: objects.map((object) =>
          this.migrateLegacyObject(object, legacyOriginX, legacyOriginY),
        ),
      },
      migrated: true,
    };
  }

  public serialize({
    background = "#ffffff",
    objects,
    templateVersion,
  }: SerializeCanvasDocumentInput): string {
    const document: CanvasDocument = {
      version: CANVAS_DOCUMENT_VERSION,
      background,
      objects,
    };

    if (typeof templateVersion === "number") {
      document.templateVersion = templateVersion;
    }

    return JSON.stringify(document);
  }

  private readObjects(value: unknown): CanvasObjectData[] {
    if (!Array.isArray(value)) return [];

    return value
      .filter(
        (object): object is CanvasObjectData =>
          typeof object === "object" && object !== null,
      )
      .map((object) => ({ ...object }));
  }

  private readLegacyOrigin(
    parsed: UnknownCanvasDocument,
    keys: string[],
  ): number {
    for (const key of keys) {
      const value = this.readFiniteNumber(parsed[key]);
      if (value !== undefined) return value;
    }

    return 0;
  }

  private migrateLegacyObject(
    object: CanvasObjectData,
    legacyOriginX: number,
    legacyOriginY: number,
  ): CanvasObjectData {
    const migrated = { ...object };

    if (legacyOriginX === 0 && legacyOriginY === 0) {
      return migrated;
    }

    if (typeof migrated.left === "number") migrated.left -= legacyOriginX;
    if (typeof migrated.top === "number") migrated.top -= legacyOriginY;
    if (typeof migrated.x1 === "number") migrated.x1 -= legacyOriginX;
    if (typeof migrated.y1 === "number") migrated.y1 -= legacyOriginY;
    if (typeof migrated.x2 === "number") migrated.x2 -= legacyOriginX;
    if (typeof migrated.y2 === "number") migrated.y2 -= legacyOriginY;

    return migrated;
  }

  private readFiniteNumber(value: unknown): number | undefined {
    return typeof value === "number" && Number.isFinite(value)
      ? value
      : undefined;
  }
}
