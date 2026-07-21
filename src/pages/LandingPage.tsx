import React, { useState } from "react";
import logo from "../../assets/logo.png";
import editorPreview from "../../assets/preview-editor.png";
import { 
  ArrowRight, 
  Github, 
  Code2, 
  Database, 
  ShieldCheck, 
  Heart,
  Layers,
  Sliders,
  Download,
  Key,
  FolderLock,
  Globe,
  Settings,
  Cpu
} from "lucide-react";
import "./landing.css";

type SiteLink = {
  label: string;
  href?: string;
  enabled: boolean;
  external?: boolean;
  status?: "soon" | "planned";
};

const navigationItems: SiteLink[] = [
  { label: "Docs", href: "/docs", enabled: false, status: "soon" },
  { label: "Features", href: "/features", enabled: false, status: "soon" },
  { label: "Templates", href: "/templates", enabled: false, status: "soon" },
  {
    label: "GitHub",
    href: "https://github.com/cadornajansen/glyft",
    enabled: true,
    external: true,
  },
];

const projectLinks: SiteLink[] = [
  {
    label: "GitHub",
    href: "https://github.com/cadornajansen/glyft",
    enabled: true,
    external: true,
  },
  {
    label: "GitHub Issues",
    href: "https://github.com/cadornajansen/glyft/issues",
    enabled: true,
    external: true,
  },
  {
    label: "Contributing",
    href: "https://github.com/cadornajansen/glyft/blob/main/CONTRIBUTING.md",
    enabled: false,
    status: "planned",
  },
  {
    label: "Releases",
    href: "https://github.com/cadornajansen/glyft/releases",
    enabled: true,
    external: true,
  },
  {
    label: "License",
    href: "https://github.com/cadornajansen/glyft/blob/main/LICENSE",
    enabled: false,
    status: "planned",
  },
];

const resourceLinks: SiteLink[] = [
  { label: "Documentation", href: "/docs", enabled: false },
  {
    label: "Changelog",
    href: "https://github.com/cadornajansen/glyft/releases",
    enabled: true,
    external: true,
  },
  { label: "Case Study", href: "/case-study", enabled: false },
  { label: "Roadmap", href: "/roadmap", enabled: false },
  { label: "Security", href: "/security", enabled: false },
];

export default function LandingPage() {
  const [activeFeature, setActiveFeature] = useState<number>(0);

  const renderNavLink = (link: SiteLink) => {
    if (link.enabled && link.href) {
      return (
        <a
          key={link.label}
          href={link.href}
          target={link.external ? "_blank" : undefined}
          rel={link.external ? "noopener noreferrer" : undefined}
          className="hover:text-zinc-100 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 rounded px-1.5 py-0.5"
        >
          {link.label}
        </a>
      );
    }

    return (
      <div key={link.label} className="relative group flex items-center">
        <span
          aria-disabled="true"
          role="link"
          className="text-zinc-650 cursor-not-allowed select-none text-sm font-normal"
        >
          {link.label}
        </span>
        {link.status && (
          <span className="absolute left-1/2 -translate-x-1/2 -top-7 scale-0 group-hover:scale-100 transition-all duration-150 ease-out bg-zinc-900 border border-white/5 text-zinc-400 text-[9px] font-mono tracking-wider px-2 py-0.5 rounded shadow-lg whitespace-nowrap pointer-events-none select-none">
            Soon
          </span>
        )}
      </div>
    );
  };

  const renderFooterLink = (link: SiteLink) => {
    if (link.enabled && link.href) {
      return (
        <a
          href={link.href}
          target={link.external ? "_blank" : undefined}
          rel={link.external ? "noreferrer noopener" : undefined}
          className="text-zinc-450 hover:text-zinc-200 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 rounded px-0.5"
        >
          {link.label}
        </a>
      );
    }

    return (
      <span
        aria-disabled="true"
        className="text-zinc-650 cursor-not-allowed select-none block"
      >
        {link.label}
      </span>
    );
  };

  const features = [
    {
      id: 0,
      title: "Local-First Canvas",
      description: "Performant vector editing built on Fabric.js and React. Create, group, lock, and order elements with high frame rates.",
      icon: Cpu,
      tag: "CORE ENGINE"
    },
    {
      id: 1,
      title: "Nested Layers Panel",
      description: "Manage complex graphics easily. Supports deep nesting, groups, visibility toggles, and drag-and-drop layer reordering.",
      icon: Layers,
      tag: "LAYERS SYSTEM"
    },
    {
      id: 2,
      title: "Contextual Properties",
      description: "Polish typography, custom fonts, borders, shadow offsets, gradients, and element dimensions dynamically as you select them.",
      icon: Sliders,
      tag: "PROPERTIES"
    },
    {
      id: 3,
      title: "Multi-Format Export",
      description: "Export high-resolution raster or clean vector code. Supports PNG, JPEG, WebP, and fully structured standalone SVG.",
      icon: Download,
      tag: "PIPELINE"
    }
  ];

  return (
    <div className="min-h-screen bg-[#030303] text-zinc-400 font-sans selection:bg-indigo-500/20 selection:text-indigo-200 relative overflow-x-hidden">
      {/* Background technical grid and film grain overlays */}
      <div className="absolute inset-0 landing-grid pointer-events-none -z-20" />
      <div className="absolute inset-0 landing-grain pointer-events-none -z-20" />

      {/* Header */}
      <header className="sticky top-0 z-50 px-6 md:px-12 py-4 flex items-center justify-between border-b border-white/5 bg-[#030303]/60 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Glyft Logo" className="h-6 w-6 object-contain opacity-90" />
          <span className="font-medium text-white tracking-tight text-base">Glyft</span>
          <span className="text-[10px] uppercase font-mono tracking-widest px-1.5 py-0.5 bg-zinc-900 text-zinc-500 border border-zinc-800/40 rounded">
            v0.1.0
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse ml-0.5" title="Sandbox Active" />
        </div>

        <nav className="hidden md:flex items-center gap-8 text-sm font-normal text-zinc-400">
          {navigationItems.map(renderNavLink)}
        </nav>

        <div className="flex items-center gap-4">
          <a 
            href="/editor" 
            className="px-3.5 py-1.5 rounded-md bg-zinc-900 border border-white/5 hover:border-white/10 text-zinc-200 hover:text-white hover:bg-zinc-800 text-xs font-semibold transition-all"
          >
            Open Editor
          </a>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-16 md:pt-28 md:pb-24 px-6 max-w-5xl mx-auto text-center flex flex-col items-center">
        {/* Soft centered ambient glow behind the text */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none -z-10" />

        <div className="inline-flex items-center gap-2 px-3 rounded-full  mb-3 shrink-0">
          <span className="text-[10px] uppercase font-mono tracking-widest text-indigo-400 font-semibold">
            DESIGN YOUR FIRST .GLYFT FILE
          </span>
        </div>

        <h1 className="text-white font-light tracking-tight leading-[1.08] clamp-title mb-6 max-w-3xl">
          Create polished web graphics, <span className="bg-gradient-to-r from-zinc-200 via-indigo-200 to-zinc-400 bg-clip-text text-transparent font-medium">locally.</span>
        </h1>

        <p className="text-zinc-400 font-light leading-relaxed max-w-xl mb-8 clamp-desc">
          An open-source, local-first graphics editor built for non-designer developers. Build OG images, banners, and social graphics directly in your browser.
        </p>

        <div className="flex flex-row justify-center items-center gap-4 mb-16 shrink-0">
          <a
            href="/editor"
            className="group flex items-center gap-2 px-5 py-2.5 rounded-lg bg-zinc-100 text-zinc-950 font-semibold hover:bg-white transition-all transform hover:-translate-y-0.5"
          >
            Open Editor
            <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
          </a>
          <a
            href="https://github.com/cadornajansen/glyft"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-zinc-900 border border-white/5 hover:border-white/10 hover:bg-zinc-800/80 text-zinc-300 hover:text-white transition-all transform hover:-translate-y-0.5"
          >
            <Github className="h-4 w-4" />
            GitHub Repo
          </a>
        </div>

        {/* Staged Screenshot */}
        <div className="w-full relative mt-4 max-w-4xl group">
          {/* Broad, expensive backlight bloom */}
          <div className="absolute -inset-10 bg-gradient-to-tr from-indigo-500/5 to-violet-500/5 rounded-2xl blur-[120px] opacity-80 pointer-events-none -z-10" />

          {/* Elevated browser preview wrapper */}
          <div className="relative rounded-xl border border-white/5 bg-[#0a0a0c] shadow-[0_35px_80px_-15px_rgba(0,0,0,0.95)] overflow-hidden transition-all duration-500 hover:scale-[1.005] hover:border-white/10 hover-shine">
            {/* Window chrome header */}
            <div className="h-9 bg-[#08080a] border-b border-white/5 flex items-center px-4 justify-between">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-zinc-800" />
                <span className="h-2 w-2 rounded-full bg-zinc-800" />
                <span className="h-2 w-2 rounded-full bg-zinc-800" />
              </div>
              <div className="text-[10px] font-mono text-zinc-650">
                glyft.app/editor
              </div>
              <div className="w-10" />
            </div>

            {/* Editor Image */}
            <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#0d0d0f]">
              <img 
                src={editorPreview} 
                alt="Glyft Editor Dashboard" 
                className="w-full h-full object-cover object-top opacity-90 group-hover:opacity-95 transition-all duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
            </div>
          </div>
        </div>
      </section>

      <div className="border-fade-h" />

      {/* Section 2: Features Showcase (Product Led) */}
      <section id="features" className="py-20 max-w-5xl mx-auto px-6">
        <div className="max-w-2xl mb-12">
          <span className="text-xs uppercase font-mono tracking-widest text-indigo-500 font-semibold mb-2 block">
            EDITOR ARCHITECTURE
          </span>
          <h2 className="text-white text-xl md:text-2xl font-light tracking-tight">
            A practical developer workflow tool.
          </h2>
          <p className="text-zinc-450 mt-3 text-xs md:text-sm leading-relaxed">
            Glyft packages a complete, browser-native canvas pipeline designed to give you direct creative control without designer overhead. No backend accounts, no paywalls.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {features.map((feat) => {
            const Icon = feat.icon;
            return (
              <div 
                key={feat.id} 
                onClick={() => setActiveFeature(feat.id)}
                className={`p-5 rounded-lg border text-left cursor-pointer transition-all ${
                  activeFeature === feat.id 
                    ? "border-indigo-500/20 bg-indigo-500/[0.02]" 
                    : "border-white/5 hover:border-white/10 bg-zinc-900/10"
                }`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className={`p-1.5 rounded ${
                    activeFeature === feat.id ? "bg-indigo-500/10 text-indigo-400" : "bg-zinc-800 text-zinc-500"
                  }`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-[9px] font-mono text-zinc-500 tracking-wider uppercase">
                    {feat.tag}
                  </span>
                </div>
                <h3 className="text-white font-medium text-sm mb-1.5">{feat.title}</h3>
                <p className="text-zinc-500 text-xs leading-relaxed">{feat.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      <div className="border-fade-h" />

      {/* Section 3: What It Is For */}
      <section id="usecases" className="py-20 max-w-5xl mx-auto px-6 text-center">
        <div className="max-w-xl mx-auto mb-12">
          <span className="text-xs uppercase font-mono tracking-widest text-indigo-500 font-semibold mb-2 block">
            COMMON APPLICATIONS
          </span>
          <h2 className="text-white text-xl md:text-2xl font-light tracking-tight">
            Built for non-designer developers.
          </h2>
          <p className="text-zinc-450 mt-2 text-xs md:text-sm">
            Quickly create key visual assets without opening bloated cloud-based design software.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: OG Social Headers */}
          <div className="group rounded-xl border border-white/5 bg-[#0a0a0c] p-6 text-left relative overflow-hidden transition-all duration-300 hover:border-white/10 hover:bg-zinc-900/10">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/[0.015] rounded-full blur-xl pointer-events-none" />
            <span className="text-[10px] font-mono text-zinc-650 tracking-widest block mb-1">1200 × 630 px</span>
            <h3 className="text-white font-medium text-base mb-2">OG Meta Graphics</h3>
            <p className="text-zinc-500 text-xs leading-relaxed mb-6">
              Create structured social cards and open-graph previews that look perfect when shared on GitHub, Twitter, or Discord.
            </p>
            {/* Visual preview widget */}
            <div className="rounded border border-white/5 bg-zinc-950 p-2.5 flex items-center gap-3">
              <div className="h-8 w-12 rounded bg-zinc-900 border border-white/5 flex items-center justify-center font-bold text-[8px] text-zinc-550 select-none">
                og:image
              </div>
              <div className="flex-1 min-w-0">
                <div className="h-2 w-2/3 rounded bg-zinc-800 mb-1.5" />
                <div className="h-1.5 w-1/3 rounded bg-zinc-900" />
              </div>
            </div>
          </div>

          {/* Card 2: Developer Blog Thumbnails */}
          <div className="group rounded-xl border border-white/5 bg-[#0a0a0c] p-6 text-left relative overflow-hidden transition-all duration-300 hover:border-white/10 hover:bg-zinc-900/10">
            <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/[0.015] rounded-full blur-xl pointer-events-none" />
            <span className="text-[10px] font-mono text-zinc-650 tracking-widest block mb-1">1920 × 1080 px</span>
            <h3 className="text-white font-medium text-base mb-2">Article Thumbnails</h3>
            <p className="text-zinc-500 text-xs leading-relaxed mb-6">
              Design clean post headers and cover artwork for Hashnode, Dev.to, or custom personal markdown-driven portfolio sites.
            </p>
            <div className="rounded border border-white/5 bg-zinc-950 p-2.5 flex items-center gap-3">
              <div className="h-8 w-12 rounded bg-zinc-900 border border-white/5 flex items-center justify-center font-bold text-[8px] text-zinc-550 select-none">
                header
              </div>
              <div className="flex-1 min-w-0">
                <div className="h-2 w-1/2 rounded bg-zinc-800 mb-1.5" />
                <div className="h-1.5 w-2/3 rounded bg-zinc-900" />
              </div>
            </div>
          </div>

          {/* Card 3: GitHub Repository Banners */}
          <div className="group rounded-xl border border-white/5 bg-[#0a0a0c] p-6 text-left relative overflow-hidden transition-all duration-300 hover:border-white/10 hover:bg-zinc-900/10">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/[0.015] rounded-full blur-xl pointer-events-none" />
            <span className="text-[10px] font-mono text-zinc-650 tracking-widest block mb-1">1280 × 640 px</span>
            <h3 className="text-white font-medium text-base mb-2">Readme Headers</h3>
            <p className="text-zinc-500 text-xs leading-relaxed mb-6">
              Make repository landing README.md banners that show code layouts, keyboard shortcuts, or project branding.
            </p>
            <div className="rounded border border-white/5 bg-zinc-950 p-2.5 flex items-center gap-3">
              <div className="h-8 w-12 rounded bg-zinc-900 border border-white/5 flex items-center justify-center font-bold text-[8px] text-zinc-550 select-none">
                readme
              </div>
              <div className="flex-1 min-w-0">
                <div className="h-2 w-3/4 rounded bg-zinc-800 mb-1.5" />
                <div className="h-1.5 w-1/2 rounded bg-zinc-900" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="border-fade-h" />

      {/* Section 4: Developer Workflow & Local Storage */}
      <section id="workflow" className="py-20 max-w-5xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-xs uppercase font-mono tracking-widest text-indigo-500 font-semibold mb-2 block">
              WORKFLOW INTEGRATION
            </span>
            <h2 className="text-white text-xl md:text-2xl font-light tracking-tight mb-4">
              Local sandbox privacy by design.
            </h2>
            <p className="text-zinc-450 text-xs md:text-sm leading-relaxed mb-6">
              Unlike cloud SaaS editors that route your asset data to backend servers, Glyft operates entirely within your client browser environment.
            </p>

            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <div className="mt-0.5 rounded-full p-1 bg-zinc-900 text-indigo-400 border border-white/5">
                  <Database className="h-3.5 w-3.5" />
                </div>
                <div>
                  <span className="text-white font-medium text-xs block">Dexie / IndexedDB Database</span>
                  <span className="text-zinc-500 text-xs">All projects are auto-saved locally in IndexedDB using transactions. Zero backend tracking.</span>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-0.5 rounded-full p-1 bg-zinc-900 text-indigo-400 border border-white/5">
                  <FolderLock className="h-3.5 w-3.5" />
                </div>
                <div>
                  <span className="text-white font-medium text-xs block">No Accounts, No Tracking</span>
                  <span className="text-zinc-500 text-xs">Open the link and design instantly. Your file assets, imports, and logs never touch our network.</span>
                </div>
              </li>
            </ul>
          </div>

          {/* Graphical representation of the local sandbox */}
          <div className="rounded-xl border border-white/5 bg-[#0a0a0c] p-6 font-mono text-xs text-zinc-650 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4 select-none">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-indigo-500" />
                <span className="text-zinc-400 text-[10px] uppercase font-bold tracking-wider">Storage Architecture</span>
              </div>
              <span className="text-zinc-650 text-[10px]">Client Only</span>
            </div>

            <div className="space-y-3">
              <div className="p-3 rounded bg-zinc-950/80 border border-white/5">
                <div className="text-white font-medium text-[11px] mb-1">Canvas Render Layer</div>
                <div className="text-[10px] text-zinc-500">Fabric.js (Vector Cache) ➔ Canvas Object State</div>
              </div>

              <div className="flex justify-center text-zinc-700 py-1">
                <span>│</span>
              </div>

              <div className="p-3 rounded bg-zinc-950/80 border border-white/5">
                <div className="text-white font-medium text-[11px] mb-1">IndexedDB Persistence</div>
                <div className="text-[10px] text-zinc-500">saveProjectCanvasState() ➔ Transaction (Dexie Table)</div>
              </div>

              <div className="flex justify-center text-zinc-700 py-1">
                <span>│</span>
              </div>

              <div className="p-3 rounded bg-zinc-950/80 border border-white/5">
                <div className="text-white font-medium text-[11px] mb-1">Local Exporter</div>
                <div className="text-[10px] text-zinc-500">2x High-Quality Raster ➔ PNG / SVG Export Pipeline</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="border-fade-h" />

      {/* Section 5: Factual Open Source Section */}
      <section className="py-20 max-w-5xl mx-auto px-6 text-center relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-indigo-500/[0.03] rounded-full blur-[80px] pointer-events-none -z-10" />

        <span className="text-xs uppercase font-mono tracking-widest text-indigo-500 font-semibold mb-2 block">
          MIT LICENSE
        </span>
        <h2 className="text-white text-xl md:text-2xl font-light tracking-tight mb-4">
          Fully inspectable. Fully customisable.
        </h2>
        <p className="text-zinc-450 text-xs md:text-sm leading-relaxed max-w-xl mx-auto mb-8">
          Glyft is built to be a reliable developer workflow tool. Clone the repository, inspect the canvas serialization state, add custom presets, or run it locally in seconds.
        </p>

        <div className="flex justify-center gap-6">
          <div className="flex items-center gap-1.5 text-xs font-mono text-zinc-500">
            <Code2 className="h-4 w-4 text-zinc-650" />
            <span>React 19 + TypeScript</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-mono text-zinc-500">
            <Settings className="h-4 w-4 text-zinc-650" />
            <span>Vite Pipeline</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-mono text-zinc-500">
            <Heart className="h-4 w-4 text-zinc-650" />
            <span>Open Source</span>
          </div>
        </div>
      </section>

      <div className="border-fade-h" />

      {/* Section 6: Sitemap-style Footer */}
      <footer className="bg-black/20 backdrop-blur-md pt-16 pb-12 border-t border-white/5">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-12 pb-12 text-left">
            
            {/* Column 1: Brand Block */}
            <div className="space-y-3 max-w-sm">
              <div className="flex items-center gap-2">
                <img src={logo} alt="Glyft Logo" className="h-5 w-5 object-contain opacity-90" />
                <span className="font-semibold text-white tracking-tight text-sm">Glyft</span>
              </div>
              <p className="text-zinc-550 text-xs leading-relaxed">
                Open-source, local-first graphics editor built for non-designer developers.
              </p>
              <div className="text-[10px] font-mono text-zinc-650 tracking-wider">
                v0.1.0 prerelease
              </div>
            </div>

            {/* Column 2 & 3: Link groups pushed to the right side */}
            <div className="flex flex-col sm:flex-row gap-16 md:gap-24">
              {/* Project Group */}
              <div className="space-y-3.5 min-w-[120px]">
                <h3 className="text-white text-xs font-semibold tracking-wider uppercase">
                  Project
                </h3>
                <div className="flex flex-col gap-2.5 text-xs">
                  {projectLinks.map((link) => (
                    <div key={link.label} className="flex items-center">
                      {renderFooterLink(link)}
                    </div>
                  ))}
                </div>
              </div>

              {/* Resources Group */}
              <div className="space-y-3.5 min-w-[120px]">
                <h3 className="text-white text-xs font-semibold tracking-wider uppercase">
                  Resources
                </h3>
                <div className="flex flex-col gap-2.5 text-xs">
                  {resourceLinks.map((link) => (
                    <div key={link.label} className="flex items-center">
                      {renderFooterLink(link)}
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* Bottom row metadata */}
          <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between text-[11px] text-zinc-600 font-mono gap-4">
            <div className="flex items-center gap-3">
              <span>&copy; {new Date().getFullYear()} Glyft Project.</span>
              <span>•</span>
              <span>MIT Licensed</span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Database className="h-3 w-3 text-zinc-700" />
                Runs entirely in browser
              </span>
            </div>

            <div className="flex items-center gap-1">
              <span>Designed & built by</span>
              <a 
                href="https://github.com/cadornajansen" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-zinc-500 hover:text-indigo-400 font-semibold transition-colors flex items-center gap-0.5"
              >
                Jansen Cadorna
                <Heart className="h-3 w-3 fill-zinc-800 text-zinc-800 ml-0.5" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
