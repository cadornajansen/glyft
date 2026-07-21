# Contributing to Glyft

Thanks for taking the time to contribute.

Glyft is an early-stage, local-first graphics editor. Contributions are most useful when they are focused, easy to review, and preserve existing project data.

## Before you start

- Search the [existing issues](https://github.com/cadornajansen/glyft/issues) before opening a new one.
- For a substantial feature or architectural change, open an issue first.
- Keep pull requests narrow. Unrelated cleanup should be submitted separately.
- Read [`AGENTS.md`](AGENTS.md) for repository-specific architecture and workflow notes.

## Development setup

### Requirements

- Node.js 22
- npm

### Install

```bash
git clone https://github.com/cadornajansen/glyft.git
cd glyft
npm ci
npm run dev
```

The landing page runs at `http://localhost:3000` and the editor at `http://localhost:3000/editor`.

## Validation

Run all required checks before opening a pull request:

```bash
npm run lint
npm run test
npm run build
```

Changes to editor behavior should also be tested manually in the browser.

At minimum, verify the affected workflow and confirm there are no new console errors.

## Contribution guidelines

### Keep data safe

Glyft stores projects locally in IndexedDB. Changes to persistence, canvas serialization, migrations, templates, undo/redo, or recovery behavior must avoid silently dropping or overwriting user data.

Prefer:

- targeted database updates;
- transaction-safe persistence;
- backward-compatible document changes;
- explicit handling for malformed or missing data;
- regression tests for data-integrity fixes.

### Keep UI in React

New interface behavior should be implemented through React components and state when an appropriate integration point exists.

Avoid:

- injected application UI;
- delayed synthetic clicks;
- `MutationObserver`-driven interface changes;
- global DOM handlers for component-local behavior.

### Keep canvas changes scoped

Fabric.js behavior can affect selection, history, serialization, export, and autosave at the same time.

When changing canvas code:

- inspect all callers before changing a shared service;
- preserve nested groups and object ordering;
- distinguish document coordinates from viewport transforms;
- test reload, undo/redo, and export where relevant;
- document intentional compatibility changes.

### Add tests where they protect behavior

Tests are expected for bug fixes and data transformations when the behavior can be isolated reliably.

Good candidates include:

- persistence helpers;
- document parsing and migration;
- template import/export;
- history stack behavior;
- route resolution;
- failure and missing-record cases.

Avoid brittle tests that only mirror component implementation details.

## Pull requests

A pull request should include:

- a clear summary of the change;
- the reason for the change;
- screenshots or recordings for visible UI changes;
- the commands used for verification;
- any known limitations or follow-up work.

Use focused commit messages, for example:

```text
fix: preserve project metadata during autosave
feat: add portable template import
refactor: isolate editor route setup
test: cover missing project persistence
```

Do not force-push over review feedback unless necessary. If you do, explain what changed.

## Reporting bugs

Open an issue with:

- the steps to reproduce;
- expected behavior;
- actual behavior;
- browser and operating system;
- screenshots, console output, or a sample `.glyft` file when relevant.

Do not include private project data in public issues.

## Feature proposals

Feature requests should explain:

- the user problem;
- the intended workflow;
- why the feature belongs in Glyft;
- the smallest useful version;
- any effect on saved documents or compatibility.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
