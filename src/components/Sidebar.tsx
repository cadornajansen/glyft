import React, { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Copy,
  FileText,
  FileUp,
  Folder,
  Image as ImageIcon,
  Layout,
  LoaderCircle,
  Monitor,
  Plus,
  Smartphone,
  Sparkles,
  Trash2,
  Upload,
  type LucideIcon,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { createNewProject, getAllProjects, saveProject } from "../db/projectDb";
import { useEditorStore } from "../stores/editorStore";
import { READY_MADE_TEMPLATES } from "../templates/catalog";
import {
  importPortableTemplateFile,
  importPortableTemplatePackage,
} from "../templates/portableTemplate";
import { renameProject, duplicateLatestProject } from "../db/updateProjectMetadata";
import type { Project } from "../types";

interface Preset {
  name: string;
  width: number;
  height: number;
  category: string;
  icon: LucideIcon;
}

const PRESETS: Preset[] = [
  {
    name: "Open Graph (OG) Image",
    width: 1200,
    height: 630,
    category: "Web",
    icon: Folder,
  },
  {
    name: "Hero Banner (Standard)",
    width: 1200,
    height: 480,
    category: "Web",
    icon: Monitor,
  },
  {
    name: "Blog Cover",
    width: 1000,
    height: 500,
    category: "Web",
    icon: BookOpen,
  },
  {
    name: "Product Card UI",
    width: 600,
    height: 600,
    category: "Commerce",
    icon: Layout,
  },
  {
    name: "Social Post (Square)",
    width: 1080,
    height: 1080,
    category: "Social",
    icon: Smartphone,
  },
  {
    name: "App Icon / Favicon",
    width: 512,
    height: 512,
    category: "App",
    icon: ImageIcon,
  },
];

interface SidebarProps {
  onLoadProject: (id: string) => Promise<void>;
  onDeleteProject: (projectId: string) => Promise<void>;
  onAddImage: (url: string, position?: { x: number; y: number }) => void;
  onAddSVG: (svg: string, position?: { x: number; y: number }) => void;
}

function showTemplateError(error: unknown) {
  window.alert(
    error instanceof Error ? error.message : "Template operation failed.",
  );
}

export function Sidebar({
  onLoadProject,
  onDeleteProject,
  onAddImage,
  onAddSVG,
}: SidebarProps) {
  const {
    currentProjectId,
    activeTab,
    setActiveTab,
    isLeftSidebarOpen,
    setLeftSidebarOpen,
    lastAutosaveAt,
  } = useEditorStore();

  const [projects, setProjects] = useState<Project[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [isImportingTemplate, setIsImportingTemplate] = useState(false);
  const [loadingTemplateId, setLoadingTemplateId] = useState<string | null>(null);
  const assetFileInputRef = useRef<HTMLInputElement>(null);
  const templateFileInputRef = useRef<HTMLInputElement>(null);

  const loadProjects = async () => {
    setProjects(await getAllProjects());
  };

  useEffect(() => {
    void loadProjects();
  }, [currentProjectId, lastAutosaveAt]);

  const openProject = async (project: Project) => {
    const store = useEditorStore.getState();
    store.setCurrentProjectId(project.id);
    store.setCurrentProject(project);
    store.setActiveTab("projects");
    await onLoadProject(project.id);
    await loadProjects();
  };

  const handleCreateNew = async (name: string, width = 800, height = 600) => {
    await openProject(await createNewProject(name, width, height));
  };

  const handleDelete = (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setDeletingId(id);
  };
  const handleDuplicate = async (
    project: Project,
    event: React.MouseEvent,
  ) => {
    event.stopPropagation();
    await duplicateLatestProject(project.id);
    await loadProjects();
  };
  const startRename = (project: Project, event: React.MouseEvent) => {
    event.stopPropagation();
    setEditingId(project.id);
    setEditName(project.name);
  };
  const saveRename = async (project: Project) => {
    if (!editName.trim()) return;
    const updated = await renameProject(project.id, editName.trim());
    if (updated && currentProjectId === project.id) {
      useEditorStore.getState().setCurrentProject(updated);
    }
    setEditingId(null);
    await loadProjects();
  };
  const handleAssetUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const reader = new FileReader();
    if (file.type.includes("svg")) {
      reader.onload = (loadEvent) => {
        const svg = loadEvent.target?.result;
        if (typeof svg === "string") onAddSVG(svg);
      };
      reader.readAsText(file);
      return;
    }

    reader.onload = (loadEvent) => {
      const dataUrl = loadEvent.target?.result;
      if (typeof dataUrl === "string") onAddImage(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleTemplateImport = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || isImportingTemplate) return;

    setIsImportingTemplate(true);
    try {
      await openProject(await importPortableTemplateFile(file));
    } catch (error) {
      showTemplateError(error);
    } finally {
      setIsImportingTemplate(false);
    }
  };

  const handleReadyMadeTemplate = async (
    template: (typeof READY_MADE_TEMPLATES)[number],
  ) => {
    if (loadingTemplateId) return;
    setLoadingTemplateId(template.id);
    try {
      await openProject(await importPortableTemplatePackage(template.package));
    } catch (error) {
      showTemplateError(error);
    } finally {
      setLoadingTemplateId(null);
    }
  };

  const handleDragOver = (event: React.DragEvent) => event.preventDefault();
  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (!file) return;

    const transfer = new DataTransfer();
    transfer.items.add(file);
    if (assetFileInputRef.current) {
      assetFileInputRef.current.files = transfer.files;
      assetFileInputRef.current.dispatchEvent(
        new Event("change", { bubbles: true }),
      );
    }
  };

  if (!isLeftSidebarOpen) {
    return (
      <button
        id="sidebar-trigger-open"
        type="button"
        onClick={() => setLeftSidebarOpen(true)}
        className="fixed left-4 top-20 z-40 flex h-10 w-10 items-center justify-center rounded-full border border-zinc-800 bg-zinc-950/90 text-zinc-400 shadow-xl backdrop-blur-md transition-all hover:bg-zinc-900 hover:text-zinc-200"
      >
        <ChevronRight size={18} />
      </button>
    );
  }

  return (
    <div
      id="left-sidebar"
      className="z-30 flex h-full w-80 flex-col border-r border-[#222] bg-[#0a0a0a]"
    >
      <div className="flex items-center gap-1.5 border-b border-[#222] bg-[#0a0a0a] p-2">
        <div className="relative flex-1">
          <button
            id="tab-projects"
            type="button"
            onClick={() => setActiveTab("projects")}
            className={`relative z-10 flex w-full items-center justify-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === "projects"
                ? "text-white"
                : "text-[#707070] hover:text-[#a1a1a1]"
            }`}
          >
            <Folder size={13} />
            <span>Projects</span>
          </button>
          {activeTab === "projects" && (
            <motion.div
              layoutId="active-tab"
              className="absolute inset-0 rounded-md border border-white/5 bg-[#161616]"
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            />
          )}
        </div>

        <div className="relative flex-1">
          <button
            id="tab-assets"
            type="button"
            onClick={() => setActiveTab("assets")}
            className={`relative z-10 flex w-full items-center justify-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === "assets"
                ? "text-white"
                : "text-[#707070] hover:text-[#a1a1a1]"
            }`}
          >
            <Sparkles size={13} />
            <span>Templates</span>
          </button>
          {activeTab === "assets" && (
            <motion.div
              layoutId="active-tab"
              className="absolute inset-0 rounded-md border border-white/5 bg-[#161616]"
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            />
          )}
        </div>

        <button
          id="sidebar-trigger-close"
          type="button"
          onClick={() => setLeftSidebarOpen(false)}
          className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded text-[#707070] hover:bg-[#1a1a1a] hover:text-white"
          title="Collapse Sidebar"
        >
          <ChevronLeft size={16} />
        </button>
      </div>

      <div className="relative flex-1 overflow-y-auto p-4 scrollbar-none">
        <AnimatePresence mode="wait">
          {activeTab === "projects" ? (
            <motion.div
              key="projects-panel"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#555]">
                  Local Storage
                </span>
                <button
                  id="btn-new-project"
                  type="button"
                  onClick={() =>
                    void handleCreateNew("Untitled Graphic", 1200, 630)
                  }
                  className="flex cursor-pointer items-center gap-1 rounded bg-white px-2.5 py-1 text-xs font-bold text-black transition-colors hover:bg-[#e0e0e0]"
                >
                  New Asset
                  <Plus size={12} />
                </button>
              </div>

              <div className="flex justify-end">
                <button
                  id="btn-import-template"
                  type="button"
                  disabled={isImportingTemplate}
                  onClick={() => templateFileInputRef.current?.click()}
                  className="flex h-6 items-center gap-1.5 rounded border border-[#2d2d2d] bg-[#151515] px-2 text-[9px] font-semibold text-[#8d8d8d] transition-colors hover:bg-[#202020] hover:text-white disabled:cursor-wait disabled:opacity-60"
                >
                  {isImportingTemplate ? (
                    <LoaderCircle size={11} className="animate-spin" />
                  ) : (
                    <FileUp size={11} />
                  )}
                  Import .glyft
                </button>
                <input
                  ref={templateFileInputRef}
                  type="file"
                  accept=".glyft,application/vnd.glyft.template+json,application/json"
                  onChange={(event) => void handleTemplateImport(event)}
                  className="hidden"
                />
              </div>

              <div className="space-y-2">
                {projects.length === 0 ? (
                  <div className="rounded border border-dashed border-[#222] bg-[#1a1a1a]/10 px-4 py-8 text-center">
                    <FileText className="mx-auto mb-2 text-[#555]" size={24} />
                    <p className="text-xs font-medium text-[#707070]">
                      No assets created yet.
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        void handleCreateNew("Untitled Graphic", 1200, 630)
                      }
                      className="mt-3 cursor-pointer text-xs font-semibold text-white hover:underline"
                    >
                      Create your first project →
                    </button>
                  </div>
                ) : (
                  projects.map((project) => (
                    <div
                      key={project.id}
                      id={`project-card-${project.id}`}
                      onClick={() => {
                        if (deletingId !== project.id) void openProject(project);
                      }}
                      className={`group relative flex cursor-pointer flex-col rounded-lg border p-3 transition-all ${
                        currentProjectId === project.id
                          ? "border-white/10 bg-[#141414] shadow-md"
                          : "border-transparent bg-transparent hover:bg-[#1a1a1a]/30"
                      }`}
                    >
                      {deletingId === project.id ? (
                        <div
                          className="flex flex-col gap-2 py-1"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <span className="text-xs font-semibold text-red-400">
                            Delete this project?
                          </span>
                          <span className="text-[10px] leading-relaxed text-[#707070]">
                            This action is irreversible and cannot be undone.
                          </span>
                          <div className="mt-1 flex gap-2">
                            <button
                              id={`confirm-del-${project.id}`}
                              type="button"
                              onClick={async () => {
                                try {
                                  await onDeleteProject(project.id);
                                } finally {
                                  setDeletingId(null);
                                  await loadProjects();
                                }
                              }}
                              className="cursor-pointer rounded bg-red-600 px-2.5 py-1 text-[10px] font-bold text-white transition-colors hover:bg-red-700"
                            >
                              Delete
                            </button>
                            <button
                              id={`cancel-del-${project.id}`}
                              type="button"
                              onClick={() => setDeletingId(null)}
                              className="cursor-pointer rounded border border-[#333] bg-[#1a1a1a]/80 px-2.5 py-1 text-[10px] font-semibold text-[#707070] transition-colors hover:bg-[#1a1a1a] hover:text-white"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start justify-between">
                            {editingId === project.id ? (
                              <input
                                id={`rename-input-${project.id}`}
                                type="text"
                                value={editName}
                                onChange={(event) => setEditName(event.target.value)}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter") void saveRename(project);
                                  if (event.key === "Escape") setEditingId(null);
                                }}
                                onClick={(event) => event.stopPropagation()}
                                autoFocus
                                className="w-[70%] rounded border border-[#333] bg-[#1a1a1a] px-1.5 py-0.5 text-xs font-semibold text-white focus:outline-none"
                              />
                            ) : (
                              <span
                                onDoubleClick={(event) =>
                                  startRename(project, event)
                                }
                                className="truncate pr-6 text-xs font-semibold text-white"
                              >
                                {project.name}
                              </span>
                            )}

                            <div className="absolute right-2 top-2.5 flex items-center gap-1 rounded border border-white/5 bg-[#0a0a0a]/95 py-0.5 pl-2 opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                              <button
                                id={`btn-dup-${project.id}`}
                                type="button"
                                title="Duplicate project"
                                onClick={(event) =>
                                  void handleDuplicate(project, event)
                                }
                                className="rounded p-1 text-[#707070] transition-colors hover:bg-[#1a1a1a] hover:text-white"
                              >
                                <Copy size={12} />
                              </button>
                              <button
                                id={`btn-rename-${project.id}`}
                                type="button"
                                title="Rename"
                                onClick={(event) => startRename(project, event)}
                                className="rounded p-1 font-mono text-[9px] text-[#707070] transition-colors hover:bg-[#1a1a1a] hover:text-white"
                              >
                                RENAME
                              </button>
                              <button
                                id={`btn-del-${project.id}`}
                                type="button"
                                title="Delete"
                                onClick={(event) => handleDelete(project.id, event)}
                                className="rounded p-1 text-[#707070] transition-colors hover:bg-red-500/10 hover:text-red-400"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>

                          <div className="mt-3 flex items-center justify-between text-[10px] text-[#707070]">
                            <span>
                              {project.width} × {project.height} px
                            </span>
                            <span>
                              {new Date(project.updatedAt).toLocaleDateString(
                                undefined,
                                { month: "short", day: "numeric" },
                              )}
                            </span>
                          </div>

                          {project.thumbnail && (
                            <div className="mt-2.5 aspect-[1.91/1] overflow-hidden rounded-md border border-[#222] bg-[#141414]">
                              <img
                                src={project.thumbnail}
                                alt={project.name}
                                referrerPolicy="no-referrer"
                                className="h-full w-full object-cover opacity-60 transition-opacity group-hover:opacity-100"
                              />
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="assets-panel"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="space-y-6"
            >
              <div className="space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#555]">
                  Starter Presets
                </span>
                <div className="grid grid-cols-1 gap-2">
                  {PRESETS.map((preset) => {
                    const Icon = preset.icon;
                    return (
                      <button
                        key={preset.name}
                        id={`preset-${preset.name.replace(/\s+/g, "-").toLowerCase()}`}
                        type="button"
                        onClick={() =>
                          void handleCreateNew(
                            preset.name,
                            preset.width,
                            preset.height,
                          )
                        }
                        className="group flex cursor-pointer items-center rounded-lg border border-transparent p-2.5 text-left transition-all hover:bg-[#161616]/70"
                      >
                        <div className="mr-3 rounded border border-white/5 bg-[#1a1a1a] p-2 text-[#707070] transition-colors group-hover:text-white">
                          <Icon size={14} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs font-semibold text-white">
                            {preset.name}
                          </div>
                          <div className="mt-0.5 text-[10px] text-[#707070]">
                            {preset.width} × {preset.height} px • {preset.category}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#555]">
                    Ready-made Templates
                  </span>
                  <button
                    type="button"
                    disabled={isImportingTemplate}
                    onClick={() => templateFileInputRef.current?.click()}
                    className="flex h-6 items-center gap-1 rounded border border-[#2d2d2d] bg-[#151515] px-2 text-[9px] font-semibold text-[#8d8d8d] transition-colors hover:bg-[#202020] hover:text-white disabled:opacity-60"
                  >
                    <FileUp size={10} />
                    Import
                  </button>
                </div>

                {READY_MADE_TEMPLATES.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-[#292929] bg-[#1a1a1a]/20 p-3 text-[10px] leading-4 text-[#707070]">
                    Saved templates will appear here after they are added to the
                    shared catalog.
                  </div>
                ) : (
                  <div className="space-y-1">
                    {READY_MADE_TEMPLATES.map((template) => (
                      <button
                        key={template.id}
                        type="button"
                        disabled={Boolean(loadingTemplateId)}
                        onClick={() => void handleReadyMadeTemplate(template)}
                        className="group flex w-full items-center gap-2.5 rounded-lg p-2 text-left transition-colors hover:bg-[#161616] disabled:cursor-wait disabled:opacity-60"
                      >
                        {template.preview ? (
                          <img
                            src={template.preview}
                            alt=""
                            className="h-9 w-14 shrink-0 rounded border border-[#2a2a2a] object-cover"
                          />
                        ) : (
                          <span className="flex h-9 w-14 shrink-0 items-center justify-center rounded border border-[#2a2a2a] bg-[#151515] text-[#555]">
                            <Layout size={14} />
                          </span>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[11px] font-semibold text-white">
                            {template.name}
                          </span>
                          <span className="mt-0.5 block text-[9px] text-[#707070]">
                            {template.width} × {template.height} px · {template.category}
                          </span>
                        </span>
                        {loadingTemplateId === template.id && (
                          <LoaderCircle
                            size={12}
                            className="shrink-0 animate-spin text-[#888]"
                          />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#555]">
                  Import Assets
                </span>
                <div
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => assetFileInputRef.current?.click()}
                  className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-[#222] bg-[#1a1a1a]/10 px-4 py-6 text-center transition-all hover:border-white/10 hover:bg-[#1a1a1a]/20"
                >
                  <Upload className="mb-2 text-[#555]" size={24} />
                  <span className="text-xs font-semibold text-[#a1a1a1]">
                    Drag & Drop Image
                  </span>
                  <span className="mt-1 text-[10px] text-[#707070]">
                    PNG, JPG, SVG, or WebP
                  </span>
                  <input
                    ref={assetFileInputRef}
                    type="file"
                    onChange={handleAssetUpload}
                    accept="image/png, image/jpeg, image/svg+xml, image/webp"
                    className="hidden"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
