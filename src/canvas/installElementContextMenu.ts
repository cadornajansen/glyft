import type { FabricObject } from "fabric";
import { CanvasController } from "./CanvasController";

const INSTALLED_FLAG = "__glyftElementContextMenuInstalled";
const MENU_ID = "glyft-element-context-menu";

type MenuAction = {
  label: string;
  shortcut?: string;
  danger?: boolean;
  disabled?: boolean;
  separatorBefore?: boolean;
  run: () => void | Promise<void>;
};

type RuntimePrototype = {
  [INSTALLED_FLAG]?: boolean;
  initCanvas: (this: CanvasController, ...args: unknown[]) => Promise<void>;
  cutSelected?: (this: CanvasController) => Promise<void>;
};

let menuCleanup: (() => void) | null = null;

function removeMenu() {
  menuCleanup?.();
  menuCleanup = null;
  document.getElementById(MENU_ID)?.remove();
}

function getObjectAtPointer(controller: CanvasController, event: MouseEvent) {
  const canvas = controller.canvas;
  if (!canvas) return null;

  const directTarget = canvas.findTarget(event as never);
  if (
    directTarget &&
    !(directTarget as FabricObject & { isArtboard?: boolean }).isArtboard
  ) {
    return directTarget;
  }

  const point = canvas.getScenePoint(event as never);

  return (
    canvas
      .getObjects()
      .slice()
      .reverse()
      .find((object) => {
        if (
          (object as FabricObject & { isArtboard?: boolean }).isArtboard ||
          object.visible === false
        ) {
          return false;
        }

        return object.containsPoint(point);
      }) ?? null
  );
}

function ensureContextSelection(controller: CanvasController, event: MouseEvent) {
  const canvas = controller.canvas;
  if (!canvas) return;

  const target = getObjectAtPointer(controller, event);
  const activeObjects = canvas.getActiveObjects();

  if (target && !activeObjects.includes(target)) {
    canvas.discardActiveObject();
    canvas.setActiveObject(target);
    canvas.requestRenderAll();

    (
      controller as unknown as {
        updateZundandUI: () => void;
      }
    ).updateZundandUI();
  }
}

function createMenuNodes(action: MenuAction, close: () => void): HTMLElement[] {
  const nodes: HTMLElement[] = [];

  if (action.separatorBefore) {
    const separator = document.createElement("div");
    separator.style.cssText =
      "height:1px;background:#303030;margin:5px 6px";
    nodes.push(separator);
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
    `cursor:${action.disabled ? "not-allowed" : "default"}`,
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

    button.addEventListener("click", async (event) => {
      event.stopPropagation();
      await action.run();
      close();
    });
  }

  nodes.push(button);
  return nodes;
}

function showMenu(controller: CanvasController, event: MouseEvent) {
  removeMenu();

  const canvas = controller.canvas;
  if (!canvas) return;

  ensureContextSelection(controller, event);

  const activeObjects = canvas.getActiveObjects();
  const activeObject = canvas.getActiveObject();
  const hasSelection = activeObjects.length > 0;
  const hasClipboard = controller.hasClipboard();
  const isGroup = activeObject?.type === "group";
  const hasLocked = activeObjects.some((object) =>
    Boolean((object as FabricObject & { locked?: boolean }).locked),
  );

  const close = () => removeMenu();

  const actions: MenuAction[] = hasSelection
    ? [
        {
          label: "Cut",
          shortcut: "Ctrl X",
          run: () =>
            (
              controller as CanvasController & {
                cutSelected: () => Promise<void>;
              }
            ).cutSelected(),
        },
        {
          label: "Copy",
          shortcut: "Ctrl C",
          run: () => controller.copySelected(),
        },
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
        {
          label: "Flip vertical",
          run: () => controller.flipVertical(),
        },
        {
          label: "Bring to front",
          separatorBefore: true,
          run: () => controller.bringToFront(),
        },
        {
          label: "Send to back",
          run: () => controller.sendToBack(),
        },
        activeObjects.length > 1
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
                activeObjects.forEach((object) => {
                  const id = (object as FabricObject & { id?: string }).id;
                  if (id) controller.unlockSelected(id);
                });
              },
            }
          : {
              label: "Lock",
              run: () => controller.lockSelected(),
            },
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
  menu.setAttribute("aria-label", "Element actions");
  menu.style.cssText = [
    "position:fixed",
    "z-index:9999",
    "width:224px",
    "padding:6px",
    "border:1px solid #363636",
    "border-radius:10px",
    "background:rgba(30,30,30,.98)",
    "box-shadow:0 18px 50px rgba(0,0,0,.5),0 2px 8px rgba(0,0,0,.35)",
    "backdrop-filter:blur(14px)",
    "user-select:none",
  ].join(";");

  actions.forEach((action) => {
    createMenuNodes(action, close).forEach((node) => menu.appendChild(node));
  });

  document.body.appendChild(menu);

  const menuRect = menu.getBoundingClientRect();
  const left = Math.min(event.clientX, window.innerWidth - menuRect.width - 8);
  const top = Math.min(event.clientY, window.innerHeight - menuRect.height - 8);

  menu.style.left = `${Math.max(8, left)}px`;
  menu.style.top = `${Math.max(8, top)}px`;

  const closeOnPointer = (pointerEvent: PointerEvent) => {
    if (!menu.contains(pointerEvent.target as Node)) close();
  };

  const closeOnKey = (keyboardEvent: KeyboardEvent) => {
    if (keyboardEvent.key === "Escape") close();
  };

  const closeOnBlur = () => close();

  document.addEventListener("pointerdown", closeOnPointer, true);
  document.addEventListener("keydown", closeOnKey);
  window.addEventListener("blur", closeOnBlur);

  menuCleanup = () => {
    document.removeEventListener("pointerdown", closeOnPointer, true);
    document.removeEventListener("keydown", closeOnKey);
    window.removeEventListener("blur", closeOnBlur);
  };
}

export function installElementContextMenu() {
  const prototype =
    CanvasController.prototype as unknown as RuntimePrototype;

  if (prototype[INSTALLED_FLAG]) return;
  prototype[INSTALLED_FLAG] = true;

  prototype.cutSelected = async function cutSelected() {
    const canvas = this.canvas;
    const activeObject = canvas?.getActiveObject();
    if (!canvas || !activeObject) return;

    const cloned = await activeObject.clone();

    (
      this as unknown as {
        clipboard: FabricObject | null;
      }
    ).clipboard = cloned;

    this.deleteSelected();
  };

  const originalInitCanvas = prototype.initCanvas;

  prototype.initCanvas = async function patchedInitCanvas(...args: unknown[]) {
    await originalInitCanvas.apply(this, args);

    const upperCanvas = this.canvas?.upperCanvasEl;
    if (!upperCanvas) return;

    upperCanvas.addEventListener(
      "contextmenu",
      (contextEvent) => {
        contextEvent.preventDefault();
        contextEvent.stopPropagation();
        showMenu(this, contextEvent);
      },
      true,
    );
  };
}
