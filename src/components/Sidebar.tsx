import React, { useEffect, useState, useRef } from 'react';
import { 
  Folder, 
  Plus, 
  Trash2, 
  Copy, 
  Sparkles, 
  FileText, 
  Layout, 
  Image as ImageIcon, 
  Upload,
  ChevronLeft,
  ChevronRight,
  Monitor,
  Smartphone,
  BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useEditorStore } from '../stores/editorStore';
import { getAllProjects, createNewProject, saveProject } from "../db/projectDb";
import { type Project } from "../types";

interface Preset {
  name: string;
  width: number;
  height: number;
  category: string;
  icon: any;
}

const PRESETS: Preset[] = [
  {
    name: "Open Graph (OG) Image",
    width: 1200,
    height: 630,
    category: "Web",
    icon: ShareIcon,
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

function ShareIcon(props: any) {
  return <Folder {...props} />;
}

interface SidebarProps {
  onLoadProject: (id: string) => Promise<void>;
  onDeleteProject: (projectId: string) => Promise<void>;
  onAddImage: (url: string, position?: { x: number; y: number }) => void;

  onAddSVG: (svg: string, position?: { x: number; y: number }) => void;
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
  } = useEditorStore();

  const [projects, setProjects] = useState<Project[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProjects();
  }, [currentProjectId]);

  const loadProjects = async () => {
    const list = await getAllProjects();
    setProjects(list);
  };

  const handleCreateNew = async (name: string, width = 800, height = 600) => {
    const newProj = await createNewProject(name, width, height);
    useEditorStore.getState().setCurrentProjectId(newProj.id);
    useEditorStore.getState().setCurrentProject(newProj);
    await onLoadProject(newProj.id);
    loadProjects();
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(id);
  };

  const handleDuplicate = async (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    const duplicated: Project = {
      ...project,
      id: crypto.randomUUID(),
      name: `${project.name} (Copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await saveProject(duplicated);
    loadProjects();
  };

  const startRename = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(project.id);
    setEditName(project.name);
  };

  const saveRename = async (project: Project) => {
    if (editName.trim()) {
      const updated = {
        ...project,
        name: editName.trim(),
        updatedAt: Date.now(),
      };
      await saveProject(updated);
      if (currentProjectId === project.id) {
        useEditorStore.getState().setCurrentProject(updated);
      }
      setEditingId(null);
      loadProjects();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    if (file.type.includes("svg")) {
      reader.onload = (event) => {
        const svgString = event.target?.result as string;
        if (svgString) onAddSVG(svgString);
      };
      reader.readAsText(file);
    } else {
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (dataUrl) onAddImage(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  // Drag and drop asset loaders
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    if (file.type.includes("svg")) {
      reader.onload = (event) => {
        const svgString = event.target?.result as string;
        if (svgString) onAddSVG(svgString);
      };
      reader.readAsText(file);
    } else {
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (dataUrl) onAddImage(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  if (!isLeftSidebarOpen) {
    return (
      <button
        id="sidebar-trigger-open"
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
      {/* Tab Selectors */}
      <div className="flex border-b border-[#222] p-2 gap-1.5 bg-[#0a0a0a] items-center">
        <div className="relative flex-1">
          <button
            id="tab-projects"
            onClick={() => setActiveTab("projects")}
            className={`relative z-10 w-full flex items-center justify-center gap-2 py-1.5 px-3 text-xs font-semibold rounded-md transition-colors ${
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
              className="absolute inset-0 bg-[#161616] border border-white/5 rounded-md"
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            />
          )}
        </div>

        <div className="relative flex-1">
          <button
            id="tab-assets"
            onClick={() => setActiveTab("assets")}
            className={`relative z-10 w-full flex items-center justify-center gap-2 py-1.5 px-3 text-xs font-semibold rounded-md transition-colors ${
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
              className="absolute inset-0 bg-[#161616] border border-white/5 rounded-md"
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            />
          )}
        </div>

        <button
          id="sidebar-trigger-close"
          onClick={() => setLeftSidebarOpen(false)}
          className="flex h-7 w-7 items-center justify-center rounded text-[#707070] hover:bg-[#1a1a1a] hover:text-white shrink-0 cursor-pointer"
          title="Collapse Sidebar"
        >
          <ChevronLeft size={16} />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 scrollbar-none relative">
        <AnimatePresence mode="wait">
          {activeTab === "projects" ? (
            <motion.div
              key="projects-panel"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-widest font-bold text-[#555]">
                  Local Storage
                </span>
                <button
                  id="btn-new-project"
                  onClick={() => handleCreateNew("Untitled Graphic", 1200, 630)}
                  className="flex items-center gap-1 py-1 px-2.5 text-xs font-bold rounded bg-white text-black hover:bg-[#e0e0e0] transition-colors cursor-pointer"
                >
                  <Plus size={12} />
                  New Asset
                </button>
              </div>

              {/* Project list */}
              <div className="space-y-2">
                {projects.length === 0 ? (
                  <div className="text-center py-8 px-4 rounded border border-dashed border-[#222] bg-[#1a1a1a]/10">
                    <FileText className="mx-auto text-[#555] mb-2" size={24} />
                    <p className="text-xs text-[#707070] font-medium">
                      No assets created yet.
                    </p>
                    <button
                      onClick={() =>
                        handleCreateNew("Untitled Graphic", 1200, 630)
                      }
                      className="mt-3 text-xs text-white hover:underline font-semibold cursor-pointer"
                    >
                      Create your first project &rarr;
                    </button>
                  </div>
                ) : (
                  projects.map((proj) => (
                    <div
                      key={proj.id}
                      id={`project-card-${proj.id}`}
                      onClick={() => {
                        if (deletingId === proj.id) return;
                        useEditorStore.getState().setCurrentProjectId(proj.id);
                        useEditorStore.getState().setCurrentProject(proj);
                        void onLoadProject(proj.id);
                      }}
                      className={`group relative flex flex-col p-3 rounded-lg border cursor-pointer transition-all ${
                        currentProjectId === proj.id
                          ? "border-white/10 bg-[#141414] shadow-md"
                          : "border-transparent bg-transparent hover:bg-[#1a1a1a]/30"
                      }`}
                    >
                      {deletingId === proj.id ? (
                        <div
                          className="flex flex-col gap-2 py-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="text-xs font-semibold text-red-400">
                            Delete this project?
                          </span>
                          <span className="text-[10px] text-[#707070] leading-relaxed">
                            This action is irreversible and cannot be undone.
                          </span>
                          <div className="flex gap-2 mt-1">
                            <button
                              id={`confirm-del-${proj.id}`}
                              onClick={async () => {
                                try {
                                  await onDeleteProject(proj.id);
                                } finally {
                                  setDeletingId(null);
                                  loadProjects();
                                }
                              }}
                              className="px-2.5 py-1 text-[10px] font-bold bg-red-600 hover:bg-red-700 text-white rounded transition-colors cursor-pointer"
                            >
                              Delete
                            </button>
                            <button
                              id={`cancel-del-${proj.id}`}
                              onClick={() => setDeletingId(null)}
                              className="px-2.5 py-1 text-[10px] font-semibold bg-[#1a1a1a]/80 hover:bg-[#1a1a1a] text-[#707070] hover:text-white rounded border border-[#333] transition-colors cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start justify-between">
                            {editingId === proj.id ? (
                              <input
                                id={`rename-input-${proj.id}`}
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") saveRename(proj);
                                  if (e.key === "Escape") setEditingId(null);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                autoFocus
                                className="w-[70%] bg-[#1a1a1a] text-xs font-semibold text-white border border-[#333] rounded px-1.5 py-0.5 focus:outline-none"
                              />
                            ) : (
                              <span
                                onDoubleClick={(e) => startRename(proj, e)}
                                className="text-xs font-semibold text-white truncate pr-6 transition-colors"
                              >
                                {proj.name}
                              </span>
                            )}

                            {/* Quick actions hover */}
                            <div className="absolute right-2 top-2.5 flex items-center opacity-0 group-hover:opacity-100 gap-1 transition-opacity bg-[#0a0a0a]/95 pl-2 rounded py-0.5 border border-white/5 shadow-lg">
                              <button
                                id={`btn-dup-${proj.id}`}
                                title="Duplicate project"
                                onClick={(e) => handleDuplicate(proj, e)}
                                className="p-1 text-[#707070] hover:text-white hover:bg-[#1a1a1a] rounded transition-colors"
                              >
                                <Copy size={12} />
                              </button>
                              <button
                                id={`btn-rename-${proj.id}`}
                                title="Rename"
                                onClick={(e) => startRename(proj, e)}
                                className="p-1 text-[#707070] hover:text-white hover:bg-[#1a1a1a] rounded text-[9px] font-mono transition-colors"
                              >
                                RENAME
                              </button>
                              <button
                                id={`btn-del-${proj.id}`}
                                title="Delete"
                                onClick={(e) => handleDelete(proj.id, e)}
                                className="p-1 text-[#707070] hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>

                          <div className="flex justify-between items-center mt-3 text-[10px] text-[#707070]">
                            <span>
                              {proj.width} × {proj.height} px
                            </span>
                            <span>
                              {new Date(proj.updatedAt).toLocaleDateString(
                                undefined,
                                { month: "short", day: "numeric" },
                              )}
                            </span>
                          </div>

                          {proj.thumbnail && (
                            <div className="mt-2.5 aspect-[1.91/1] rounded-md overflow-hidden bg-[#141414] border border-[#222]">
                              <img
                                src={proj.thumbnail}
                                alt={proj.name}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity"
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
              {/* Presets & Starter Dimensions */}
              <div className="space-y-3">
                <span className="text-[10px] uppercase tracking-widest font-bold text-[#555]">
                  Starter Presets
                </span>
                <div className="grid grid-cols-1 gap-2">
                  {PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      id={`preset-${preset.name.replace(/\s+/g, "-").toLowerCase()}`}
                      onClick={() =>
                        handleCreateNew(
                          preset.name,
                          preset.width,
                          preset.height,
                        )
                      }
                      className="flex items-center text-left p-2.5 rounded-lg border border-transparent hover:bg-[#161616]/70 transition-all cursor-pointer group"
                    >
                      <div className="p-2 bg-[#1a1a1a] rounded mr-3 text-[#707070] group-hover:text-white transition-colors border border-white/5">
                        <preset.icon size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-white truncate">
                          {preset.name}
                        </div>
                        <div className="text-[10px] text-[#707070] mt-0.5">
                          {preset.width} × {preset.height} px •{" "}
                          {preset.category}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Asset Dropzone */}
              <div className="space-y-3">
                <span className="text-[10px] uppercase tracking-widest font-bold text-[#555]">
                  Import Assets
                </span>
                <div
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center py-6 px-4 rounded-lg border border-dashed border-[#222] bg-[#1a1a1a]/10 hover:border-white/10 hover:bg-[#1a1a1a]/20 transition-all cursor-pointer text-center"
                >
                  <Upload className="text-[#555] mb-2" size={24} />
                  <span className="text-xs font-semibold text-[#a1a1a1]">
                    Drag & Drop Image
                  </span>
                  <span className="text-[10px] text-[#707070] mt-1">
                    PNG, JPG, SVG, or WebP
                  </span>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
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
