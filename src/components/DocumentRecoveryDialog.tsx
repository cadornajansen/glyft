import React from "react";
import { AlertTriangle, Trash2, X, RefreshCw } from "lucide-react";

interface DocumentRecoveryDialogProps {
  projectName: string;
  errorMessage: string;
  onKeepBlank: () => void;
  onDeleteProject: () => void;
  onDismiss: () => void;
}

/**
 * Shown when a project's canvasData fails to parse during canvas initialization.
 * Gives the user a clear, non-destructive path to recover.
 */
export function DocumentRecoveryDialog({
  projectName,
  errorMessage,
  onKeepBlank,
  onDeleteProject,
  onDismiss,
}: DocumentRecoveryDialogProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="recovery-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-md rounded-xl border border-zinc-700/60 bg-zinc-900 shadow-2xl mx-4">
        {/* Header */}
        <div className="flex items-start gap-3 p-5 border-b border-zinc-800">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/15">
            <AlertTriangle className="h-5 w-5 text-amber-400" />
          </div>
          <div className="min-w-0 flex-1">
            <h2
              id="recovery-dialog-title"
              className="text-base font-semibold text-zinc-100 leading-snug"
            >
              Document could not be opened
            </h2>
            <p className="mt-1 text-sm text-zinc-400 leading-snug truncate">
              {projectName}
            </p>
          </div>
          <button
            id="recovery-dismiss-btn"
            onClick={onDismiss}
            title="Dismiss"
            className="shrink-0 rounded-md p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3">
          <p className="text-sm text-zinc-300 leading-relaxed">
            This project&apos;s canvas data may be corrupted and cannot be displayed.
            You can start fresh with a blank canvas, permanently delete the
            project, or dismiss this message and continue working.
          </p>
          {errorMessage && (
            <details className="text-xs text-zinc-500">
              <summary className="cursor-pointer select-none hover:text-zinc-400 transition-colors">
                Technical details
              </summary>
              <pre className="mt-2 overflow-x-auto rounded bg-zinc-800 p-2 text-zinc-400 whitespace-pre-wrap break-all">
                {errorMessage}
              </pre>
            </details>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col-reverse gap-2 p-5 pt-0 sm:flex-row sm:justify-end">
          <button
            id="recovery-delete-btn"
            onClick={onDeleteProject}
            className="flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Delete project
          </button>
          <button
            id="recovery-blank-btn"
            onClick={onKeepBlank}
            className="flex items-center justify-center gap-1.5 rounded-md bg-zinc-700 px-4 py-2 text-sm font-medium text-zinc-100 hover:bg-zinc-600 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Keep blank canvas
          </button>
        </div>
      </div>
    </div>
  );
}
