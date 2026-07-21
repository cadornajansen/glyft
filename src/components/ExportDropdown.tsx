import { useEffect, useRef, useState, type ChangeEvent } from "react";
import {
  Check,
  ChevronDown,
  Download,
  FileArchive,
  FileCode2,
  FileImage,
  FileUp,
  LoaderCircle,
} from "lucide-react";
import { useEditorStore } from "../stores/editorStore";
import {
  downloadProjectAsTemplate,
  importPortableTemplateFile,
} from "../templates/portableTemplate";

export type ExportFormat = "png" | "jpeg" | "webp" | "svg";
type ExportOperation = ExportFormat | "template";

interface ExportDropdownProps {
  onExport: (format: ExportFormat) => void | Promise<void>;
}

const exportOptions: Array<{
  format: ExportFormat;
  title: string;
  description: string;
  badge: string;
  icon: typeof FileImage;
}> = [
  {
    format: "png",
    title: "PNG",
    description: "Lossless, high quality · 2×",
    badge: "Best quality",
    icon: FileImage,
  },
  {
    format: "webp",
    title: "WebP",
    description: "Smaller file · 2×",
    badge: "Web optimized",
    icon: FileImage,
  },
  {
    format: "jpeg",
    title: "JPEG",
    description: "Compatible photo format · 2×",
    badge: "Small file",
    icon: FileImage,
  },
  {
    format: "svg",
    title: "SVG",
    description: "Resolution-independent vector",
    badge: "Scalable",
    icon: FileCode2,
  },
];

export function ExportDropdown({ onExport }: ExportDropdownProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const currentProjectId = useEditorStore((state) => state.currentProjectId);
  const [isOpen, setIsOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [activeOperation, setActiveOperation] = useState<ExportOperation | null>(
    null,
  );
  const [completedOperation, setCompletedOperation] =
    useState<ExportOperation | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const closeOnPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("pointerdown", closeOnPointerDown);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnPointerDown);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  const markCompleted = (operation: ExportOperation) => {
    setCompletedOperation(operation);
    window.setTimeout(() => setCompletedOperation(null), 1200);
    setIsOpen(false);
  };

  const handleExport = async (format: ExportFormat) => {
    if (activeOperation || isImporting) return;
    setActiveOperation(format);
    setCompletedOperation(null);
    try {
      await onExport(format);
      markCompleted(format);
    } finally {
      setActiveOperation(null);
    }
  };

  const handleTemplateExport = async () => {
    if (activeOperation || isImporting || !currentProjectId) return;
    setActiveOperation("template");
    setCompletedOperation(null);
    try {
      await downloadProjectAsTemplate(currentProjectId);
      markCompleted("template");
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "Template export failed.",
      );
    } finally {
      setActiveOperation(null);
    }
  };

  const handleTemplateImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || isImporting || activeOperation) return;

    setIsImporting(true);
    setIsOpen(false);
    try {
      await importPortableTemplateFile(file);
      window.location.reload();
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "Template import failed.",
      );
      setIsImporting(false);
    }
  };

  const isBusy = Boolean(activeOperation) || isImporting;

  return (
    <div ref={rootRef} className="relative flex items-center gap-1.5">
      <button
        id="btn-import-template-toolbar"
        type="button"
        disabled={isBusy}
        onClick={() => importInputRef.current?.click()}
        title="Import a portable Glyft template"
        className="flex h-8 items-center gap-1.5 rounded-md border border-[#333] bg-[#171717] px-2.5 text-[10px] font-semibold text-[#a1a1a1] transition-colors hover:bg-[#232323] hover:text-white disabled:cursor-wait disabled:opacity-55"
      >
        {isImporting ? (
          <LoaderCircle size={12} className="animate-spin" />
        ) : (
          <FileUp size={12} />
        )}
        <span>{isImporting ? "Importing…" : "Import .glyft"}</span>
      </button>
      <input
        ref={importInputRef}
        type="file"
        accept=".glyft,application/vnd.glyft.template+json,application/json"
        onChange={(event) => void handleTemplateImport(event)}
        className="hidden"
      />

      <button
        id="btn-export-dropdown"
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        disabled={isBusy}
        onClick={() => setIsOpen((open) => !open)}
        className="flex h-8 items-center gap-2 rounded-md bg-white px-3 text-xs font-semibold text-black transition-colors hover:bg-[#e7e7e7] disabled:cursor-wait disabled:opacity-75"
      >
        {activeOperation ? (
          <LoaderCircle size={13} className="animate-spin" />
        ) : completedOperation ? (
          <Check size={13} />
        ) : (
          <Download size={13} />
        )}
        <span>{activeOperation ? "Exporting…" : "Export"}</span>
        <ChevronDown
          size={12}
          className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-label="Export file"
          className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-xl border border-[#353535] bg-[#1d1d1d] p-1.5 shadow-[0_18px_50px_rgba(0,0,0,0.55)]"
        >
          <div className="px-2.5 pb-2 pt-1.5">
            <p className="text-[11px] font-semibold text-[#eeeeee]">Export file</p>
            <p className="mt-0.5 text-[10px] text-[#777777]">
              Raster formats export at twice the document resolution.
            </p>
          </div>

          <div className="h-px bg-[#303030]" />
          <div className="pt-1.5">
            {exportOptions.map((option) => {
              const Icon = option.icon;
              const isExporting = activeOperation === option.format;
              return (
                <button
                  key={option.format}
                  id={`export-${option.format}`}
                  type="button"
                  role="menuitem"
                  disabled={isBusy}
                  onClick={() => void handleExport(option.format)}
                  className="group flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-[#2b2b2b] disabled:cursor-wait disabled:opacity-55"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[#3a3a3a] bg-[#252525] text-[#a8a8a8] group-hover:text-white">
                    {isExporting ? (
                      <LoaderCircle size={14} className="animate-spin" />
                    ) : (
                      <Icon size={14} />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[11px] font-semibold text-[#eeeeee]">
                      {option.title}
                    </span>
                    <span className="mt-0.5 block text-[10px] text-[#777777]">
                      {option.description}
                    </span>
                  </span>
                  <span className="rounded border border-[#3a3a3a] bg-[#252525] px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-[#777777]">
                    {option.badge}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="my-1.5 h-px bg-[#303030]" />
          <button
            id="export-template"
            type="button"
            role="menuitem"
            disabled={isBusy || !currentProjectId}
            onClick={() => void handleTemplateExport()}
            className="group flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-[#2b2b2b] disabled:cursor-not-allowed disabled:opacity-45"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[#3a3a3a] bg-[#252525] text-[#a8a8a8] group-hover:text-white">
              {activeOperation === "template" ? (
                <LoaderCircle size={14} className="animate-spin" />
              ) : (
                <FileArchive size={14} />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-semibold text-[#eeeeee]">
                Save as template
              </span>
              <span className="mt-0.5 block text-[10px] text-[#777777]">
                Portable Glyft project with bundled assets
              </span>
            </span>
            <span className="rounded border border-[#3a3a3a] bg-[#252525] px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-[#777777]">
              .glyft
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
