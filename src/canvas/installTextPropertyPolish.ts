import type { ActiveProperties } from "../stores/editorStore";
import { useEditorStore } from "../stores/editorStore";
import { CanvasController } from "./CanvasController";

const INSTALLED_FLAG = "__glyftTextPropertyPolishInstalled";
const FONT_SIZE_LIST_ID = "glyft-font-size-presets";
const BOLD_BUTTON_ID = "glyft-font-bold-button";

const FONT_SIZE_PRESETS = [
  10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72, 80,
  96, 112, 128,
];

type RuntimeController = {
  canvas: CanvasController["canvas"];
  updateZundandUI: () => void;
  setProperty: (key: keyof ActiveProperties, value: unknown) => void;
};

type RuntimePrototype = {
  [INSTALLED_FLAG]?: boolean;
  updateZundandUI: (this: RuntimeController) => void;
};

let activeController: RuntimeController | null = null;
let scheduled = false;

function normalizeTextType(type: unknown) {
  return type === "i-text" || type === "itext" || type === "text";
}

function ensureFontSizePresets() {
  if (document.getElementById(FONT_SIZE_LIST_ID)) return;

  const dataList = document.createElement("datalist");
  dataList.id = FONT_SIZE_LIST_ID;

  FONT_SIZE_PRESETS.forEach((size) => {
    const option = document.createElement("option");
    option.value = String(size);
    option.label = `${size}px`;
    dataList.appendChild(option);
  });

  document.body.appendChild(dataList);
}

function updateBoldButtonState(button: HTMLButtonElement) {
  const weight = useEditorStore.getState().activeProperties?.fontWeight;
  const numericWeight = typeof weight === "number" ? weight : Number(weight);
  const isBold = weight === "bold" || (Number.isFinite(numericWeight) && numericWeight >= 600);

  button.dataset.active = String(isBold);
  button.setAttribute("aria-pressed", String(isBold));
  button.className = [
    "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
    "border border-transparent text-[13px] font-bold transition-colors",
    isBold
      ? "bg-[#3a3a3a] text-white"
      : "text-[#8d8d8d] hover:bg-[#303030] hover:text-white",
  ].join(" ");
}

function ensureBoldButton() {
  const underlineButton = document.querySelector<HTMLButtonElement>(
    '#properties-sidebar button[title="Underline"]',
  );
  const styleRow = underlineButton?.parentElement;

  if (!underlineButton || !styleRow) return;

  let button = document.getElementById(BOLD_BUTTON_ID) as HTMLButtonElement | null;

  if (!button) {
    button = document.createElement("button");
    button.id = BOLD_BUTTON_ID;
    button.type = "button";
    button.title = "Bold";
    button.textContent = "B";

    button.addEventListener("click", () => {
      const currentWeight = useEditorStore.getState().activeProperties?.fontWeight;
      const numericWeight =
        typeof currentWeight === "number" ? currentWeight : Number(currentWeight);
      const isBold =
        currentWeight === "bold" ||
        (Number.isFinite(numericWeight) && numericWeight >= 600);

      activeController?.setProperty("fontWeight", isBold ? "400" : "700");
    });

    const italicButton = styleRow.querySelector<HTMLButtonElement>(
      'button[title="Italic"]',
    );
    styleRow.insertBefore(button, italicButton ?? underlineButton);
    styleRow.classList.remove("grid-cols-5");
    styleRow.classList.add("grid-cols-6");
  }

  updateBoldButtonState(button);
}

function enhanceTypographyPanel() {
  const activeProperties = useEditorStore.getState().activeProperties;
  if (!normalizeTextType(activeProperties?.type)) return;

  ensureFontSizePresets();

  const fontSizeInput = document.querySelector<HTMLInputElement>(
    "#properties-sidebar #prop-font-size",
  );

  if (fontSizeInput) {
    fontSizeInput.setAttribute("list", FONT_SIZE_LIST_ID);
    fontSizeInput.setAttribute("min", "1");
    fontSizeInput.setAttribute("step", "1");
    fontSizeInput.setAttribute("inputmode", "numeric");
    fontSizeInput.title = "Font size in pixels. Choose 10–128px or enter a custom value.";
  }

  const widthInput = document.querySelector<HTMLElement>(
    "#properties-sidebar #prop-width",
  );
  const layoutSection = widthInput?.closest("section");
  if (layoutSection instanceof HTMLElement) {
    layoutSection.style.display = "none";
  }

  ensureBoldButton();
}

function scheduleEnhancement() {
  if (scheduled) return;
  scheduled = true;

  queueMicrotask(() => {
    scheduled = false;
    enhanceTypographyPanel();
  });
}

export function installTextPropertyPolish() {
  const prototype = CanvasController.prototype as unknown as RuntimePrototype;

  if (prototype[INSTALLED_FLAG]) return;
  prototype[INSTALLED_FLAG] = true;

  const originalUpdateUI = prototype.updateZundandUI;

  prototype.updateZundandUI = function textPropertyUpdateUI() {
    activeController = this;
    originalUpdateUI.call(this);

    const store = useEditorStore.getState();
    const activeProperties = store.activeProperties;

    if (normalizeTextType(activeProperties?.type) && activeProperties?.type !== "itext") {
      store.setActiveProperties({
        ...activeProperties,
        type: "itext",
      });
    }

    scheduleEnhancement();
  };

  const observer = new MutationObserver(scheduleEnhancement);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
}