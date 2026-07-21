<h1 align="center">Glyft</h1>

<p align="center">
  <strong>A local-first graphics editor for developer-focused visual assets.</strong>
</p>

<p align="center">
  <a href="https://github.com/cadornajansen/glyft/issues"><img src="https://img.shields.io/github/issues/cadornajansen/glyft" alt="Open issues" /></a>
  <a href="https://github.com/cadornajansen/glyft/stargazers"><img src="https://img.shields.io/github/stars/cadornajansen/glyft?style=social" alt="GitHub stars" /></a>
  <a href="https://github.com/cadornajansen/glyft/network/members"><img src="https://img.shields.io/github/forks/cadornajansen/glyft?style=social" alt="GitHub forks" /></a>
</p>

<p align="center">
  <a href="#local-development">Local Development</a> ·
  <a href="#project-structure">Project Structure</a> ·
  <a href="https://github.com/cadornajansen/glyft/issues">Issues</a> ·
  <a href="#contributing">Contributing</a>
</p>

## About

Glyft is an open-source browser graphics editor focused on fast creation of social images, OG banners, cards, covers, and other developer-facing visual assets.

Projects are stored locally in the browser through IndexedDB. There is no account requirement and no backend dependency for the editor itself.

## Current capabilities

- Infinite canvas with pan and zoom
- Artboard-based document editing
- Shapes, text, lines, arrows, images, and SVG image import
- Transform, typography, fill, stroke, opacity, and shadow controls
- Layer visibility, locking, naming, and reordering
- Undo and redo history
- Local-first project persistence and autosave
- PNG, JPEG, WebP, and SVG export
- Document-center smart guides and snapping
- Versioned canvas documents and template migrations

Glyft is under active development. Some advanced editing and recovery workflows are still being stabilized before the first beta release.

## Tech stack

| Layer | Technology |
| --- | --- |
| Interface | React 19, TypeScript, Tailwind CSS |
| Canvas | Fabric.js |
| State | Zustand |
| Local persistence | Dexie and IndexedDB |
| Tooling | Vite |

## Local development

### Prerequisites

- Node.js 20 or newer
- A supported Node package manager

### Install and run

```bash
npm install
npm run dev
```

Open the local URL printed by Vite, normally `http://localhost:3000`.

### Useful commands

```bash
npm run dev      # start the development server
npm run build    # create a production build
npm run preview  # preview the production build
npm run lint     # run the TypeScript check
```

## Architecture

Glyft keeps document state separate from viewport state:

```text
React interface
      ↓
Zustand editor state
      ↓
CanvasController
      ↓
Fabric.js canvas
      ↓
Dexie / IndexedDB
```

Object coordinates are stored relative to the document origin at `(0, 0)`. Pan and zoom exist only in Fabric's viewport transform and are not persisted as object positions.

## Project structure

```text
src/
├── canvas/       Fabric canvas, export, and editor coordination
├── components/   editor panels, toolbar, layers, and status UI
├── db/           IndexedDB project persistence
├── stores/       Zustand editor state
├── templates/    versioned starter templates
├── types/        document and project types
└── App.tsx       application shell and project lifecycle
```

## Roadmap

Development tasks and beta requirements are tracked in the [engineering roadmap](https://github.com/cadornajansen/glyft/issues/4).

Current priorities include:

- document validation and recovery
- reliable group serialization
- failure-safe undo and redo
- object-to-object smart guides
- export regression testing
- contributor documentation and CI

## Contributing

Contributions, bug reports, and focused feature proposals are welcome.

Before starting a large change, open or review an issue so the implementation can stay aligned with the current architecture and roadmap.

- [Browse open issues](https://github.com/cadornajansen/glyft/issues)
- [Report a bug](https://github.com/cadornajansen/glyft/issues/new)
- [View the engineering roadmap](https://github.com/cadornajansen/glyft/issues/4)

## Project status

Glyft is currently an early-stage open-source project and is not yet considered production-stable.

<p align="center">
  <sub>Local-first. Open source. Built for fast visual creation.</sub>
</p>
