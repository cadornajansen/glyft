import {
  Keyboard,
  RefreshCw,
  Check,
  MapPin,
  MousePointer,
  Space,
  RotateCcw,
} from "lucide-react";
import { useEditorStore } from "../stores/editorStore";
import { useState } from "react";

import { resetLocalApp } from "../db/projectDb";
interface StatusBarProps {
  isSaving: boolean;
}

export function StatusBar({ isSaving }: StatusBarProps) {
  const { zoom, activeTool, currentProject, layers } = useEditorStore();
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleResetApp = async () => {
    try {
      setIsResetting(true);
      await resetLocalApp();
      window.location.reload();
    } catch (error) {
      console.error("Failed to reset local app:", error);
      setIsResetting(false);
    }
  };

  const getToolLabel = () => {
    switch (activeTool) {
      case "select":
        return "Select Mode";
      case "rectangle":
        return "Rectangle Tool";
      case "circle":
        return "Circle Tool";
      case "line":
        return "Line Tool";
      case "arrow":
        return "Arrow Tool";
      case "text":
        return "Text Block Tool";
      default:
        return "Idle";
    }
  };

  return (
    <>
      <div
        id="bottom-status-bar"
        className="relative z-20 flex h-8 w-full items-center border-t border-[#222] bg-[#0a0a0a] px-4 text-[10px] font-semibold text-[#707070] select-none"
      >
        {/* Left */}
        <div className="flex w-52 shrink-0 items-center gap-4">
          <div className="flex items-center gap-1.5 text-[#a1a1a1]">
            <MousePointer size={11} />
            <span>{getToolLabel()}</span>
          </div>

          {currentProject && (
            <div className="flex items-center gap-1.5 border-l border-[#222] pl-4 text-[#707070]">
              <span>
                Layers:{" "}
                <strong className="font-mono text-[#a1a1a1]">
                  {layers.length}
                </strong>
              </span>
            </div>
          )}
        </div>

        {/* Center */}
        <div className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-4 font-medium text-[#707070] md:flex">
          <div className="flex items-center gap-1">
            <Keyboard size={11} className="text-[#555]" />
            <span className="text-[9px] font-bold uppercase tracking-wider text-[#555]">
              Shortcuts:
            </span>
          </div>

          <div className="flex items-center gap-3 whitespace-nowrap">
            <span>
              <kbd className="rounded border border-[#333] bg-[#1a1a1a] px-1 font-mono text-[#a1a1a1]">
                V
              </kbd>{" "}
              Select
            </span>

            <span>
              <kbd className="rounded border border-[#333] bg-[#1a1a1a] px-1 font-mono text-[#a1a1a1]">
                R
              </kbd>{" "}
              Rect
            </span>

            <span>
              <kbd className="rounded border border-[#333] bg-[#1a1a1a] px-1 font-mono text-[#a1a1a1]">
                C
              </kbd>{" "}
              Circle
            </span>

            <span>
              <kbd className="rounded border border-[#333] bg-[#1a1a1a] px-1 font-mono text-[#a1a1a1]">
                T
              </kbd>{" "}
              Text
            </span>

            <span>
              <kbd className="rounded border border-[#333] bg-[#1a1a1a] px-1 font-mono text-[#a1a1a1]">
                I
              </kbd>{" "}
              Image
            </span>

            <span>
              <kbd className="rounded border border-[#333] bg-[#1a1a1a] px-1 font-mono text-[#a1a1a1]">
                Space + Drag
              </kbd>{" "}
              Pan
            </span>

            <span>
              <kbd className="rounded border border-[#333] bg-[#1a1a1a] px-1 font-mono text-[#a1a1a1]">
                Del
              </kbd>{" "}
              Delete
            </span>
          </div>
        </div>

        {/* Right */}
        <div className="ml-auto flex w-56 shrink-0 items-center justify-end gap-2">
          <div className="flex min-w-36 justify-end">
            {isSaving ? (
              <div className="flex items-center gap-1 text-[#a1a1a1]">
                <RefreshCw size={10} className="animate-spin" />
                <span>Autosaving...</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-[#707070]">
                <Check size={10} className="text-emerald-500" />
                <span>Synced to local database</span>
              </div>
            )}
          </div>

          {import.meta.env.DEV && (
            <button
              type="button"
              title="Reset local Glyft data"
              aria-label="Reset local Glyft data"
              onClick={() => setShowResetDialog(true)}
              className="flex size-6 shrink-0 items-center justify-center rounded border border-[#2a2a2a] text-[#707070] transition-colors hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400"
            >
              <RotateCcw size={11} />
            </button>
          )}
        </div>
        {showResetDialog && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
            onMouseDown={() => setShowResetDialog(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="reset-dialog-title"
              className="w-full max-w-sm rounded-xl border border-[#292929] bg-[#111] p-5 shadow-2xl"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <h2
                id="reset-dialog-title"
                className="text-sm font-semibold text-white"
              >
                Reset local Glyft app?
              </h2>

              <p className="mt-2 text-xs leading-5 text-[#8a8a8a]">
                This deletes every locally stored project and reloads Glyft
                using the latest default template. This action cannot be undone.
              </p>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  disabled={isResetting}
                  onClick={() => setShowResetDialog(false)}
                  className="rounded-md border border-[#303030] px-3 py-1.5 text-xs text-[#b0b0b0] hover:bg-[#1a1a1a] disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={isResetting}
                  onClick={handleResetApp}
                  className="flex min-w-24 items-center justify-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isResetting && (
                    <RefreshCw size={11} className="animate-spin" />
                  )}
                  {isResetting ? "Resetting..." : "Reset app"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
