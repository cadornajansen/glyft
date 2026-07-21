import React from "react";
import logo from "../../assets/logo.png";
import editorPreview from "../../assets/landing/editor-preview.png";
import { ArrowRight, Github, Code2, Database, ShieldCheck, Heart } from "lucide-react";
import "./landing.css";

export default function LandingPage() {
  return (
    <div className="min-h-screen md:h-dvh md:max-h-dvh md:overflow-hidden bg-[#050505] text-zinc-300 flex flex-col justify-between font-sans selection:bg-indigo-500/30 selection:text-indigo-200 relative landing-grid">
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-indigo-500/10 to-violet-500/10 rounded-full blur-[120px] animate-ambient -z-10" />
      
      {/* Film grain effect */}
      <div className="absolute inset-0 landing-grain -z-10" />

      {/* Header */}
      <header className="px-6 md:px-12 py-4 flex items-center justify-between border-b border-zinc-900/60 bg-black/20 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Glyft Logo" className="h-7 w-7 object-contain" />
          <span className="font-semibold text-white tracking-wide text-lg">Glyft</span>
          <span className="text-[10px] uppercase font-mono tracking-widest px-2 py-0.5 bg-zinc-900 text-zinc-400 border border-zinc-800 rounded">
            v0.1.0
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse ml-1" title="Online & Sandbox Secure" />
        </div>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
          <a href="#docs" className="hover:text-zinc-100 transition-colors pointer-events-none opacity-50 cursor-not-allowed">Docs</a>
          <a href="#changelog" className="hover:text-zinc-100 transition-colors pointer-events-none opacity-50 cursor-not-allowed">Changelog</a>
          <a 
            href="https://github.com/cadornajansen/glyft" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-zinc-100 transition-colors"
          >
            <Github className="h-4 w-4" />
            GitHub
          </a>
          <a href="#about" className="hover:text-zinc-100 transition-colors pointer-events-none opacity-50 cursor-not-allowed">About</a>
        </nav>

        <a 
          href="/editor" 
          className="px-4 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 hover:text-white hover:bg-zinc-800 hover:border-zinc-700 text-sm font-semibold transition-all"
        >
          Open Editor
        </a>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 min-h-0 flex flex-col justify-center items-center px-6 py-4 md:py-6 max-w-6xl mx-auto w-full text-center gap-6 md:gap-8">
        
        {/* Hero Section */}
        <div className="space-y-4 max-w-2xl shrink-0">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/5 border border-indigo-500/10">
            <span className="h-2 w-2 rounded-full bg-indigo-500" />
            <span className="text-[10px] uppercase font-mono tracking-widest text-indigo-400 font-semibold">
              DESIGN TOOLING FOR DEVELOPERS
            </span>
          </div>

          <h2 className="text-white font-extrabold tracking-tight leading-[1.1] clamp-title">
            Create polished web graphics, <span className="bg-gradient-to-r from-indigo-200 via-indigo-400 to-violet-300 bg-clip-text text-transparent">locally.</span>
          </h2>

          <p className="text-zinc-400 font-normal leading-relaxed max-w-xl mx-auto clamp-desc">
            Glyft is an open-source graphics editor for developers and makers — built for OG images, banners, social visuals, and fast browser-based design.
          </p>

          <div className="flex flex-row justify-center items-center gap-4 pt-2">
            <a
              href="/editor"
              className="group flex items-center gap-2 px-6 py-2.5 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-500 hover:shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all transform hover:-translate-y-0.5"
            >
              Open Editor
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </a>
            <a
              href="https://github.com/cadornajansen/glyft"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white transition-all transform hover:-translate-y-0.5"
            >
              <Github className="h-4 w-4" />
              Star on GitHub
            </a>
          </div>
        </div>

        {/* Product Showcase */}
        <div className="flex-1 min-h-0 w-full flex items-center justify-center relative max-h-[460px] md:max-h-[500px]">
          {/* Subtle showcase ambient glow shadow */}
          <div className="absolute -inset-4 bg-gradient-to-tr from-indigo-500/10 to-violet-500/10 rounded-xl blur-3xl opacity-75 -z-10" />

          {/* Browser Mockup Window */}
          <div className="relative w-full max-w-4xl h-full flex flex-col rounded-xl border border-zinc-800/80 bg-zinc-950 shadow-[0_30px_70px_rgba(0,0,0,0.85)] ring-1 ring-white/5 overflow-hidden hover-shine group transition-all duration-500 hover:scale-[1.005] hover:border-zinc-700/80">
            {/* Browser Header Bar */}
            <div className="h-9 shrink-0 bg-[#0d0d0f] border-b border-zinc-900 flex items-center px-4 justify-between select-none">
              {/* Window Controls */}
              <div className="flex items-center gap-1.5 w-16">
                <span className="h-2.5 w-2.5 rounded-full bg-zinc-800" />
                <span className="h-2.5 w-2.5 rounded-full bg-zinc-800" />
                <span className="h-2.5 w-2.5 rounded-full bg-zinc-800" />
              </div>

              {/* URL Address Bar */}
              <div className="flex-1 max-w-sm h-6 rounded bg-[#161619] border border-zinc-800/60 flex items-center justify-center text-[10px] font-mono text-zinc-500 tracking-wide">
                glyft.app/editor · local session
              </div>

              {/* Window Status / Badges */}
              <div className="flex items-center justify-end gap-3 w-16 text-[10px] font-mono text-zinc-600">
                <span>main</span>
              </div>
            </div>

            {/* Browser Content */}
            <div className="flex-1 min-h-0 bg-[#0a0a0c] relative">
              <img 
                src={editorPreview} 
                alt="Glyft Editor Interface Preview" 
                className="w-full h-full object-cover object-top opacity-90 group-hover:opacity-95 transition-opacity duration-300"
              />
              
              {/* Interactive Hover Vignette / Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/20 via-transparent to-transparent pointer-events-none" />
              
              {/* Monospace floating tech annotations */}
              <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded bg-black/60 backdrop-blur border border-zinc-800/80 text-[10px] font-mono text-zinc-400 tracking-wider hidden sm:block">
                engine: Fabric.js + React
              </div>
              <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded bg-black/60 backdrop-blur border border-zinc-800/80 text-[10px] font-mono text-zinc-400 tracking-wider hidden sm:block">
                db: dexie (indexeddb)
              </div>
            </div>
          </div>
        </div>

      </main>

      {/* Footer / Creator & Trust Section */}
      <footer className="px-6 md:px-12 py-4 flex flex-col md:flex-row items-center justify-between border-t border-zinc-900/60 bg-black/20 backdrop-blur-md gap-4 shrink-0 text-xs text-zinc-500 font-mono">
        <div className="flex items-center gap-3">
          <Code2 className="h-4 w-4 text-zinc-600" />
          <span>MIT Licensed</span>
          <span className="text-zinc-800">•</span>
          <div className="flex items-center gap-1.5">
            <Database className="h-3.5 w-3.5 text-zinc-600" />
            <span>Runs entirely in-browser</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span>Designed & built by</span>
          <a 
            href="https://github.com/cadornajansen" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-zinc-400 hover:text-indigo-400 font-semibold transition-colors flex items-center gap-1"
          >
            Jansen Cadorna
            <Heart className="h-3 w-3 fill-zinc-600 text-zinc-600 group-hover:fill-red-500/20 group-hover:text-red-400 transition-colors" />
          </a>
        </div>

        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-600/80" />
          <span className="text-zinc-600">Local project storage (Dexie)</span>
        </div>
      </footer>
    </div>
  );
}
