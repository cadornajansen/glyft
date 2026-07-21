import { 
  Keyboard, 
  RefreshCw, 
  Check, 
  MapPin, 
  MousePointer, 
  Space 
} from 'lucide-react';
import { useEditorStore } from '../stores/editorStore';

interface StatusBarProps {
  isSaving: boolean;
}

export function StatusBar({ isSaving }: StatusBarProps) {
  const { zoom, activeTool, currentProject, layers } = useEditorStore();

  const getToolLabel = () => {
    switch (activeTool) {
      case 'select': return 'Select Mode';
      case 'rectangle': return 'Rectangle Tool';
      case 'circle': return 'Circle Tool';
      case 'line': return 'Line Tool';
      case 'arrow': return 'Arrow Tool';
      case 'text': return 'Text Block Tool';
      default: return 'Idle';
    }
  };

  return (
    <div 
      id="bottom-status-bar"
      className="z-20 flex h-8 w-full items-center justify-between border-t border-[#222] bg-[#0a0a0a] px-4 text-[10px] font-semibold text-[#707070] select-none"
    >
      {/* Tool state and project details */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-[#a1a1a1]">
          <MousePointer size={11} />
          <span>{getToolLabel()}</span>
        </div>
        
        {currentProject && (
          <div className="flex items-center gap-1.5 border-l border-[#222] pl-4 text-[#707070]">
            <span>Layers: <strong className="text-[#a1a1a1] font-mono">{layers.length}</strong></span>
          </div>
        )}
      </div>

      {/* Keyboard Shortcuts Cheatsheet */}
      <div className="hidden md:flex items-center gap-4 text-[#707070] font-medium">
        <div className="flex items-center gap-1">
          <Keyboard size={11} className="text-[#555]" />
          <span className="text-[#555] uppercase tracking-wider text-[9px] font-bold">Shortcuts:</span>
        </div>
        <div className="flex items-center gap-3">
          <span><kbd className="bg-[#1a1a1a] border border-[#333] rounded px-1 text-[#a1a1a1] font-mono">V</kbd> Select</span>
          <span><kbd className="bg-[#1a1a1a] border border-[#333] rounded px-1 text-[#a1a1a1] font-mono">R</kbd> Rect</span>
          <span><kbd className="bg-[#1a1a1a] border border-[#333] rounded px-1 text-[#a1a1a1] font-mono">C</kbd> Circle</span>
          <span><kbd className="bg-[#1a1a1a] border border-[#333] rounded px-1 text-[#a1a1a1] font-mono">T</kbd> Text</span>
          <span><kbd className="bg-[#1a1a1a] border border-[#333] rounded px-1 text-[#a1a1a1] font-mono">I</kbd> Image</span>
          <span><kbd className="bg-[#1a1a1a] border border-[#333] rounded px-1 text-[#a1a1a1] font-mono">Space + Drag</kbd> Pan</span>
          <span><kbd className="bg-[#1a1a1a] border border-[#333] rounded px-1 text-[#a1a1a1] font-mono">Del</kbd> Delete</span>
        </div>
      </div>

      {/* Persistence and Autosave Feedback */}
      <div className="flex items-center gap-2">
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
    </div>
  );
}
