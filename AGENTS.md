# Glyft Repository Context

Use this file as the first source of context before modifying this repository. Keep it updated whenever architecture, workflow, or major features change.

## Repository

- Repository: `cadornajansen/glyft`
- Active development branch: `feature/editor-polish`
- Main stack: React, Vite, TypeScript, Fabric.js, Zustand, Dexie, Tailwind CSS
- Product: local-first browser graphics editor

## Required workflow

1. Read this file before editing.
2. Inspect the current implementation before changing behavior.
3. Make changes on the requested branch; do not assume `main` is the target.
4. Prefer small, focused commits with descriptive messages.
5. Run or verify:
   - `npm run lint`
   - `npm run build`
6. Check GitHub Actions before claiming completion.
7. Do not close an issue until its acceptance criteria are implemented and verified.
8. Update this file when a change affects architecture, conventions, or major feature status.

## Engineering conventions

- Build UI through React components and React state.
- Do not inject application UI using `document.createElement`, `MutationObserver`, delayed DOM clicks, or manual DOM event wiring when a React integration point exists.
- Keep persistence and UI concerns separated.
- Avoid monkey-patching private controller methods unless no public integration point exists; document any runtime patch clearly.
- Preserve existing project data and document compatibility.
- Treat Fabric object type values as runtime data that may differ between Fabric versions, for example `i-text` versus `itext`.
- Use structural runtime interfaces when TypeScript access modifiers make controller prototype augmentation unsafe.
- Keep frontend-only requests isolated from database and serialization behavior.

## Core architecture

- `src/components/Sidebar.tsx`
  - Projects list
  - Starter presets
  - Ready-made templates
  - `.glyft` template import
- `src/components/ExportDropdown.tsx`
  - PNG, JPEG, WebP, SVG export
  - Save as `.glyft` template
- `src/canvas/CanvasController.ts`
  - Main canvas/editor orchestration
- `src/canvas/CanvasObjectFactory.ts`
  - Restores persisted Fabric objects, including recursive groups
- `src/canvas/CanvasLayerService.ts`
  - Recursive layer tree and nested object lookup
- `src/canvas/ExportCanvasService.ts`
  - High-resolution raster and SVG export
- `src/stores/editorStore.ts`
  - Editor UI state
- `src/db/projectDb.ts`
  - Dexie project persistence
- `src/templates/portableTemplate.ts`
  - Portable `.glyft` serialization, validation, asset bundling, and import
- `src/templates/catalog.ts`
  - Shared ready-made template catalog for the editor and future landing page

## Current implemented features

- Recursive grouped layers and nested selection support
- Recursive group deserialization
- Compact Fabric selection controls
- Element context menu
- High-quality 2x raster export with safe pixel limits
- Click-controlled export dropdown with loading state
- Text typography controls:
  - font family
  - custom font size and presets
  - weight
  - bold
  - italic
  - underline
- Portable `.glyft` template import/export with bundled image assets
- Ready-made template catalog integration
- Compact sidebar project rows with side thumbnails
- GitHub Actions CI for lint/typecheck and production build

## Template workflow

- Create a project in Glyft.
- Use `Export > Save as template` to produce a `.glyft` file.
- Review the package and preview.
- Add approved templates to `src/templates/catalog.ts`.
- Keep catalog data reusable by both the editor and a future landing-page templates route.

## Known constraints

- Fonts are referenced by family name; font binaries are not bundled.
- Ready-made templates remain empty until approved packages are added.
- Browser/runtime behavior should still be manually tested after CI because CI currently validates typecheck and build, not full interaction behavior.

## Latest context checkpoint

- Template UI was refactored into React components.
- `src/templates/installTemplateTransferUI.ts` was removed.
- Sidebar import and catalog rendering now live in `Sidebar.tsx`.
- Save-as-template now lives in `ExportDropdown.tsx`.
- Latest verified commit before this context file: `b42a1d308d034b1fda9af804da776b52fb0e168b`.
