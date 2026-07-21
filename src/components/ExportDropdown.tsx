import { useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  Download,
  FileCode2,
  FileImage,
  LoaderCircle,
} from "lucide-react";

export type ExportFormat = "png" | "jpeg" | "webp" | "svg";

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
  const [isOpen, setIsOpen] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(
    null,
  );
  const [completedFormat, setCompletedFormat] = useState<ExportFormat | null>(
    null,
  );

  useEffect(() => {
    if (!isOpen) return;

    const closeOnPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
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

  const handleExport = async (format: ExportFormat) => {
    if (exportingFormat) return;

    setExportingFormat(format);
    setCompletedFormat(null);

    try {
      await onExport(format);
      setCompletedFormat(format);
      window.setTimeout(() => setCompletedFormat(null), 1200);
      setIsOpen(false);
    } finally {
      setExportingFormat(null);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        id="btn-export-dropdown"
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        disabled={Boolean(exportingFormat)}
        onClick={() => setIsOpen((open) => !open)}
        className="flex h-8 items-center gap-2 rounded-md bg-white px-3 text-xs font-semibold text-black transition-colors hover:bg-[#e7e7e7] disabled:cursor-wait disabled:opacity-75"
      >
        {exportingFormat ? (
          <LoaderCircle size={13} className="animate-spin" />
        ) : completedFormat ? (
          <Check size={13} />
        ) : (
          <Download size={13} />
        )}

        <span>{exportingFormat ? "Exporting…" : "Export"}</span>
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
            <p className="text-[11px] font-semibold text-[#eeeeee]">
              Export file
            </p>
            <p className="mt-0.5 text-[10px] text-[#777777]">
              Raster formats export at twice the document resolution.
            </p>
          </div>

          <div className="h-px bg-[#303030]" />

          <div className="pt-1.5">
            {exportOptions.map((option) => {
              const Icon = option.icon;
              const isExporting = exportingFormat === option.format;

              return (
                <button
                  key={option.format}
                  id={`export-${option.format}`}
                  type="button"
                  role="menuitem"
                  disabled={Boolean(exportingFormat)}
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
        </div>
      )}
    </div>
  );
}
