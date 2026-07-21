import { useEditorStore } from "../stores/editorStore";
import { READY_MADE_TEMPLATES } from "./catalog";
import {
  downloadProjectAsTemplate,
  importPortableTemplateFile,
  importPortableTemplatePackage,
} from "./portableTemplate";

const INSTALLED_FLAG = "__glyftTemplateTransferUIInstalled";
const PROJECT_CONTROLS_ID = "glyft-template-project-controls";
const CATALOG_SECTION_ID = "glyft-ready-made-template-section";

function createButton(label: string, title: string): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.title = title;
  button.style.cssText = [
    "height:26px",
    "padding:0 9px",
    "border:1px solid #2f2f2f",
    "border-radius:6px",
    "background:#171717",
    "color:#b5b5b5",
    "font:600 10px Inter,system-ui,sans-serif",
    "cursor:pointer",
  ].join(";");
  button.addEventListener("mouseenter", () => {
    button.style.background = "#242424";
    button.style.color = "#fff";
  });
  button.addEventListener("mouseleave", () => {
    button.style.background = "#171717";
    button.style.color = "#b5b5b5";
  });
  return button;
}

function showError(error: unknown) {
  const message = error instanceof Error ? error.message : "Template operation failed.";
  window.alert(message);
}

function openImportedProject(project: {
  id: string;
  name: string;
  width: number;
  height: number;
  createdAt: number;
  updatedAt: number;
  canvasData: string;
  thumbnail?: string;
}) {
  const store = useEditorStore.getState();
  store.setCurrentProjectId(project.id);
  store.setCurrentProject(project);
  store.setActiveTab("projects");

  window.setTimeout(() => {
    document.getElementById(`project-card-${project.id}`)?.click();
  }, 150);
}

function ensureProjectControls(fileInput: HTMLInputElement) {
  if (document.getElementById(PROJECT_CONTROLS_ID)) return;
  const newProjectButton = document.getElementById("btn-new-project");
  const header = newProjectButton?.parentElement;
  if (!header) return;

  const controls = document.createElement("div");
  controls.id = PROJECT_CONTROLS_ID;
  controls.style.cssText = "display:flex;align-items:center;gap:6px;margin-left:auto";

  const importButton = createButton("Import .glyft", "Import a portable Glyft template");
  importButton.addEventListener("click", () => fileInput.click());

  const exportButton = createButton("Save template", "Export the active project as a portable Glyft template");
  exportButton.addEventListener("click", async () => {
    const id = useEditorStore.getState().currentProjectId;
    if (!id) {
      window.alert("Open a project before saving it as a template.");
      return;
    }
    exportButton.disabled = true;
    exportButton.textContent = "Saving…";
    try {
      await downloadProjectAsTemplate(id);
    } catch (error) {
      showError(error);
    } finally {
      exportButton.disabled = false;
      exportButton.textContent = "Save template";
    }
  });

  controls.append(importButton, exportButton);
  header.insertBefore(controls, newProjectButton);
}

function createCatalogCard(template: (typeof READY_MADE_TEMPLATES)[number]) {
  const button = document.createElement("button");
  button.type = "button";
  button.style.cssText = [
    "display:flex",
    "width:100%",
    "align-items:center",
    "gap:10px",
    "padding:10px",
    "border:1px solid transparent",
    "border-radius:8px",
    "background:transparent",
    "color:#fff",
    "text-align:left",
    "cursor:pointer",
  ].join(";");
  button.addEventListener("mouseenter", () => (button.style.background = "#161616"));
  button.addEventListener("mouseleave", () => (button.style.background = "transparent"));

  if (template.preview) {
    const image = document.createElement("img");
    image.src = template.preview;
    image.alt = "";
    image.style.cssText = "width:56px;height:38px;object-fit:cover;border-radius:5px;border:1px solid #2a2a2a";
    button.appendChild(image);
  }

  const copy = document.createElement("span");
  copy.style.cssText = "display:flex;min-width:0;flex:1;flex-direction:column";
  const name = document.createElement("span");
  name.textContent = template.name;
  name.style.cssText = "font:600 12px Inter,system-ui,sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis";
  const details = document.createElement("span");
  details.textContent = `${template.width} × ${template.height} px · ${template.category}`;
  details.style.cssText = "margin-top:3px;color:#707070;font:500 10px Inter,system-ui,sans-serif";
  copy.append(name, details);
  button.appendChild(copy);

  button.addEventListener("click", async () => {
    button.disabled = true;
    try {
      openImportedProject(await importPortableTemplatePackage(template.package));
    } catch (error) {
      showError(error);
    } finally {
      button.disabled = false;
    }
  });
  return button;
}

function ensureCatalogSection(fileInput: HTMLInputElement) {
  if (document.getElementById(CATALOG_SECTION_ID)) return;
  const labels = Array.from(document.querySelectorAll("span"));
  const starterLabel = labels.find((node) => node.textContent?.trim() === "Starter Presets");
  const starterSection = starterLabel?.parentElement;
  if (!starterSection) return;

  const section = document.createElement("div");
  section.id = CATALOG_SECTION_ID;
  section.style.cssText = "display:flex;flex-direction:column;gap:10px";

  const heading = document.createElement("div");
  heading.style.cssText = "display:flex;align-items:center;justify-content:space-between";
  const title = document.createElement("span");
  title.textContent = "Ready-made Templates";
  title.style.cssText = "color:#555;font:700 10px Inter,system-ui,sans-serif;letter-spacing:.12em;text-transform:uppercase";
  const importButton = createButton("Import", "Import a shared .glyft template");
  importButton.addEventListener("click", () => fileInput.click());
  heading.append(title, importButton);
  section.appendChild(heading);

  if (READY_MADE_TEMPLATES.length === 0) {
    const empty = document.createElement("div");
    empty.style.cssText = "padding:14px;border:1px dashed #292929;border-radius:8px;background:rgba(26,26,26,.18);color:#707070;font:500 10px/1.55 Inter,system-ui,sans-serif";
    empty.textContent = "Export a project with Save template, then add the reviewed .glyft package to src/templates/catalog.ts for the editor and future landing-page catalog.";
    section.appendChild(empty);
  } else {
    const list = document.createElement("div");
    list.style.cssText = "display:flex;flex-direction:column;gap:4px";
    READY_MADE_TEMPLATES.forEach((template) => list.appendChild(createCatalogCard(template)));
    section.appendChild(list);
  }

  starterSection.insertAdjacentElement("afterend", section);
}

export function installTemplateTransferUI() {
  const runtime = window as unknown as Record<string, unknown>;
  if (runtime[INSTALLED_FLAG]) return;
  runtime[INSTALLED_FLAG] = true;

  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = ".glyft,application/vnd.glyft.template+json,application/json";
  fileInput.hidden = true;
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    fileInput.value = "";
    if (!file) return;
    try {
      openImportedProject(await importPortableTemplateFile(file));
    } catch (error) {
      showError(error);
    }
  });
  document.body.appendChild(fileInput);

  const refresh = () => {
    ensureProjectControls(fileInput);
    ensureCatalogSection(fileInput);
  };
  const observer = new MutationObserver(refresh);
  observer.observe(document.body, { childList: true, subtree: true });
  refresh();
}
