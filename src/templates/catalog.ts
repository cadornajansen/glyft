import type { PortableTemplatePackage } from "./portableTemplate";

export interface ReadyMadeTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  width: number;
  height: number;
  preview?: string;
  package: PortableTemplatePackage;
}

/**
 * Shared catalog consumed by the editor and, later, the public templates page.
 * Add generated template packages here after reviewing their bundled assets.
 */
export const READY_MADE_TEMPLATES: ReadyMadeTemplate[] = [];
