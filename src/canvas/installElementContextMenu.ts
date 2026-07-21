import type { FabricObject } from "fabric";
import { CanvasController } from "./CanvasController";

const INSTALLED_FLAG = "__glyftElementContextMenuInstalled";
const MENU_ID = "glyft-element-context-menu";

let activeController: CanvasController | null = null;

interface ContextController extends CanvasController {
  clipboard: FabricObject | null;
  updateZundandUI: () => void;
  cutSelected: () => Promise<void>;
}

interface MenuAction {
  label: string;
  shortcut?: string;
  danger?: boolean;
  disabled?: boolean;
  separatorBefore?: boolean;
  run: () => void | Promise<void>;
}

function removeMenu() {
  document.getElementById(MENU_ID)?.remove();
}

function isCanvasContextTarget(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest("#canvas-container"));
}

function findObjectAtPointer(controller: CanvasController, event: MouseEvent) {
  const canvas = controller.canvas;
  if (!canvas) return null;

  const directTarget = canvas.findTarget(event as never);
  if (
    directTarget &&
    !(directTarget as FabricObject & { isArtboard?: boolean }).isArtboard
  ) {
    return directTarget;
  }

  const scenePoint = canvas.getScenePoint(event as never);

  return (
    canvas
      .getObjects()
      .slice()
      .reverse()
      .find((object) => {
        if ((object as FabricObject & { isArtboard?: boolean }).isArtboard) {
          return false;
        }
        if (object.visible === false) return false;
        return object.containsPoint(scenePoint);
      }) ?? null
  );
}

function selectContextTarget(controller: ContextController, event: MouseEvent) {
  const canvas = controller.canvas;
  if (!canvas) return;

  const target = findObjectAtPointer(controller, event);
  if (!target) return;

  const currentSelection = canvas.getActiveObjects();
  if (currentSelection.includes(target)) return;

  canvas.discardActiveObject();
  canvas.setActiveObject(target);
  canvas.requestRenderAll();
  controller.updateZundandUI();
}

function makeButton(action: MenuAction, close: () => void) {
  const fragment = document.createDocumentFragment();

  if (action.separatorBefore) {
    const divider = document.createElement("div");
    divider.style.cssText = "height:1px;background:#343434;margin:5px 6px";
    fragment.appendChild(divider);
  }

  const button = document.createElement("button");
  button.type = "button";
  button.disabled = Boolean(action.disabled);
  button.setAttribute("role", "menuitem");
  button.style.cssText = [
    "display:flex",
    "align-items:center",
    "width:100%",
    "height:30px",
    "gap:12px",
    "padding:0 10px",
    "border:0",
    "border-radius:6px",
    "background:transparent",
    "font:500 12px Inter,system-ui,sans-serif",
    `color:${action.danger ? "#fb7185" : "#dedede"}`,
    "text-align:left",
    `cursor:${action.disabled ? "not-allowed" : "pointer"}`,
    `opacity:${action.disabled ? "0.38" : "1"}`,
  ].join(";");

  const label = document.createElement("span");
  label.textContent = action.label;
  label.style.flex = "1";
  button.appendChild(label);

  if (action.shortcut) {
    const shortcut = document.createElement("span");
    shortcut.textContent = action.shortcut;
    shortcut.style.cssText =
      "color:#777;font:500 10px ui-monospace,SFMono-Regular,monospace";
    button.appendChild(shortcut);
  }

  if (!action.disabled) {
    button.addEventListener("mouseenter", () => {
      button.style.background = action.danger
        ? "rgba(244,63,94,.12)"
        : "#303030";
    });
    button.addEventListener("mouseleave", () => {
      button.style.background = "transparent";
    });
    button.addEventListener("click", async (clickEvent) => {
      clickEvent.stopPropagation();
      await action.run();
      close();
    });
  }

  fragment.appendChild(button);
  return fragment;
}

function showMenu(controller: ContextController, event: MouseEvent) {
  removeMenu();
  selectContextTarget(controller, event);

  const canvas = controller.canvas;
  if (!canvas) return;

  const selected = canvas.getActiveObjects();
  const active = canvas.getActiveObject();
  const hasSelection = selected.length > 0;
  const hasClipboard = controller.hasClipboard();
  const isGroup = active?.type === "group";
  const hasLocked = selected.some((object) =>
    Boolean((object as FabricObject & { locked?: boolean }).locked),
  );

  const actions: MenuAction[] = hasSelection
    ? [
        { label: "Cut", shortcut: "Ctrl X", run: () => controller.cutSelected() },
        { label: "Copy", shortcut: "Ctrl C", run: () => controller.copySelected() },
        {
          label: "Paste",
          shortcut: "Ctrl V",
          disabled: !hasClipboard,
          run: () => controller.pasteSelected(),
        },
        {
          label: "Duplicate",
          shortcut: "Ctrl D",
          run: () => controller.duplicateSelected(),
        },
        {
          label: "Flip horizontal",
          separatorBefore: true,
          run: () => controller.flipHorizontal(),
        },
        { label: "Flip vertical", run: () => controller.flipVertical() },
        {
          label: "Bring to front",
          separatorBefore: true,
          run: () => controller.bringToFront(),
        },
        { label: "Send to back", run: () => controller.sendToBack() },
        selected.length > 1
          ? {
              label: "Group selection",
              shortcut: "Ctrl G",
              separatorBefore: true,
              run: () => controller.groupSelected(),
            }
          : {
              label: "Ungroup",
              separatorBefore: true,
              disabled: !isGroup,
              run: () => controller.ungroupSelected(),
            },
        hasLocked
          ? {
              label: "Unlock",
              run: () => {
                selected.forEach((object) => {
                  const id = (object as FabricObject & { id?: string }).id;
                  if (id) controller.unlockSelected(id);
                });
              },
            }
          : { label: "Lock", run: () => controller.lockSelected() },
        {
          label: "Delete",
          shortcut: "Delete",
          danger: true,
          separatorBefore: true,
          run: () => controller.deleteSelected(),
        },
      ]
    : [
        {
          label: "Paste",
          shortcut: "Ctrl V",
          disabled: !hasClipboard,
          run: () => controller.pasteSelected(),
        },
      ];

  const menu = document.createElement("div");
  menu.id = MENU_ID;
  menu.setAttribute("role", "menu");
  menu.style.cssText = [
    "position:fixed",
    "z-index:99999",
    "width:224px",
    "padding:6px",
    "border:1px solid #363636",
    "border-radius:10px",
    "background:rgba(30,30,30,.98)",
    "box-shadow:0 18px 50px rgba(0,0,0,.5),0 2px 8px rgba(0,0,0,.35)",
    "backdrop-filter:blur(14px)",
    "user-select:none",
  ].join(";");

  const close = () => removeMenu();
  actions.forEach((action) => menu.appendChild(makeButton(action, close)));
  document.body.appendChild(menu);

  const bounds = menu.getBoundingClientRect();
  menu.style.left = `${Math.max(
    8,
    Math.min(event.clientX, window.innerWidth - bounds.width - 8),
  )}px`;
  menu.style.top = `${Math.max(
    8,
    Math.min(event.clientY, window.innerHeight - bounds.height - 8),
  )}px`;
}

export function installElementContextMenu() {
  const prototype = CanvasController.prototype as unknown as {
    [INSTALLED_FLAG]?: boolean;
    updateZundandUI: (this: ContextController) => void;
    cutSelected?: (this: ContextController) => Promise<void>;
  };

  if (prototype[INSTALLED_FLAG]) return;
  prototype[INSTALLED_FLAG] = true;

  prototype.cutSelected = async function cutSelected() {
    const activeObject = this.canvas?.getActiveObject();
    if (!this.canvas || !activeObject) return;

    this.clipboard = await activeObject.clone();
    this.deleteSelected();
  };

  const originalUpdateUI = prototype.updateZundandUI;
  prototype.updateZundandUI = function contextMenuControllerUpdate() {
    activeController = this;
    originalUpdateUI.call(this);
  };

  document.addEventListener(
    "contextmenu",
    (event) => {
      if (!isCanvasContextTarget(event.target) || !activeController?.canvas) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      showMenu(activeController as ContextController, event);
    },
    true,
  );

  document.addEventListener(
    "pointerdown",
    (event) => {
      const menu = document.getElementById(MENU_ID);
      if (menu && !menu.contains(event.target as Node)) removeMenu();
    },
    true,
  );

  window.addEventListener("blur", removeMenu);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") removeMenu();
  });
}
