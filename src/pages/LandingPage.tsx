import React from "react";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#050505] text-zinc-100 font-sans p-6">
      <div className="max-w-md text-center space-y-6">
        <h1 className="text-4xl font-extrabold tracking-tight text-white">Glyft</h1>
        <p className="text-lg text-zinc-400">
          A local-first browser graphics editor for developer-focused visual assets.
        </p>
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-4">
          <a
            href="/editor"
            className="px-6 py-2.5 rounded-lg bg-zinc-100 text-zinc-950 font-semibold hover:bg-zinc-200 transition-colors"
          >
            Open Editor
          </a>
          <a
            href="https://github.com/cadornajansen/glyft"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 font-medium hover:bg-zinc-800 transition-colors"
          >
            Star on GitHub
          </a>
        </div>
      </div>
    </div>
  );
}
