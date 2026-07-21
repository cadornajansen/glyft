import React, { useState } from 'react';
import { 
  Eye, 
  EyeOff, 
  Lock, 
  Unlock, 
  ChevronUp, 
  ChevronDown, 
  Type, 
  Square, 
  Circle as CircleIcon, 
  Minus, 
  Image as ImageIcon,
  Layers,
  Edit2,
  GripVertical
} from 'lucide-react';
import { useEditorStore } from '../stores/editorStore';

interface LayersPanelProps {
  onReorderLayer: (id: string, dir: 'up' | 'down') => void;
  onRenameLayer: (id: string, name: string) => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onDragReorder?: (sourceIndex: number, targetIndex: number) => void;
  onSelectLayer?: (id: string) => void;
}

export function LayersPanel({
  onReorderLayer,
  onRenameLayer,
  onToggleVisibility,
  onToggleLock,
  onDragReorder,
  onSelectLayer,
}: LayersPanelProps) {
  const { layers, activeProperties } = useEditorStore();
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [tempName, setTempName] = useState('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const getLayerIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'rect':
        return <Square size={12} className="text-blue-400" />;
      case 'circle':
        return <CircleIcon size={12} className="text-emerald-400" />;
      case 'line':
        return <Minus size={12} className="text-red-400" />;
      case 'path':
        return <Minus size={12} className="text-amber-400 rotate-45" />;
      case 'itext':
        return <Type size={12} className="text-purple-400" />;
      case 'image':
        return <ImageIcon size={12} className="text-pink-400" />;
      default:
        return <Layers size={12} className="text-zinc-400" />;
    }
  };

  const handleStartRename = (id: string, currentName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingId(id);
    setTempName(currentName);
  };

  const handleFinishRename = (id: string) => {
    if (tempName.trim()) {
      onRenameLayer(id, tempName.trim());
    }
    setRenamingId(null);
  };

  // Drag and Drop reordering logic
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      onDragReorder?.(draggedIndex, index);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div 
      id="layers-sidebar"
      className="flex flex-col bg-[#0a0a0a] h-full w-full overflow-hidden"
    >
      {/* Panel Header */}
      <div className="flex items-center gap-2 border-b border-[#222] px-4 py-2.5 bg-[#0a0a0a]">
        <Layers size={13} className="text-[#707070]" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#a1a1a1]">Layers</span>
        <span className="ml-auto text-[9px] bg-[#1a1a1a] border border-[#333] text-[#707070] rounded px-1.5 py-0.5 font-mono">
          {layers.length} Total
        </span>
      </div>

      {/* Layers List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-none">
        {layers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-[#555]">
            <Layers size={20} className="mb-2 text-[#222]" />
            <p className="text-[10px] font-semibold uppercase tracking-wider">No objects on the canvas</p>
          </div>
        ) : (
          layers.map((layer, index) => {
            const isSelected = activeProperties?.id === layer.id;
            return (
              <div
                key={layer.id}
                id={`layer-row-${layer.id}`}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                onClick={() => onSelectLayer?.(layer.id)}
                className={`group flex items-center gap-1 px-2 py-1.5 rounded transition-all cursor-grab active:cursor-grabbing ${
                  isSelected 
                    ? 'bg-[#18181b] border border-white/5 text-white' 
                    : 'text-[#888] hover:bg-[#151515] hover:text-white'
                } ${
                  draggedIndex === index ? 'opacity-30 bg-[#222]' : ''
                } ${
                  dragOverIndex === index ? 'border-t-2 border-white/50 bg-[#1a1a1a]' : ''
                }`}
              >
                {/* Drag Handle */}
                <div className="text-[#444] group-hover:text-[#707070] cursor-grab active:cursor-grabbing mr-0.5">
                  <GripVertical size={11} />
                </div>

                {/* Type Icon */}
                <div className="flex items-center justify-center w-5 h-5 bg-[#141414] border border-[#333]/30 rounded">
                  {getLayerIcon(layer.type)}
                </div>

                {/* Editable Name */}
                <div className="flex-1 min-w-0 ml-1">
                  {renamingId === layer.id ? (
                    <input
                      id={`layer-rename-${layer.id}`}
                      type="text"
                      value={tempName}
                      onChange={(e) => setTempName(e.target.value)}
                      onBlur={() => handleFinishRename(layer.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleFinishRename(layer.id);
                        if (e.key === 'Escape') setRenamingId(null);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                      className="w-full bg-[#18181b] text-xs text-white border border-[#333] rounded px-1.5 py-0.5 focus:outline-none"
                    />
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span 
                        onDoubleClick={(e) => handleStartRename(layer.id, layer.name, e)}
                        className="text-xs font-medium truncate cursor-pointer select-none"
                      >
                        {layer.name}
                      </span>
                      <button
                        onClick={(e) => handleStartRename(layer.id, layer.name, e)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-[#555] hover:text-[#a1a1a1] transition-opacity cursor-pointer"
                        title="Rename Layer"
                      >
                        <Edit2 size={9} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Controls */}
                <div className="flex items-center gap-0.5 opacity-40 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                  {/* Reorder Up */}
                  <button
                    id={`layer-up-${layer.id}`}
                    onClick={() => onReorderLayer(layer.id, 'up')}
                    disabled={index === 0}
                    className={`p-1 rounded text-[#707070] hover:text-white hover:bg-[#1a1a1a] cursor-pointer ${
                      index === 0 ? 'opacity-20 cursor-not-allowed' : ''
                    }`}
                    title="Move layer up"
                  >
                    <ChevronUp size={11} />
                  </button>
                  {/* Reorder Down */}
                  <button
                    id={`layer-down-${layer.id}`}
                    onClick={() => onReorderLayer(layer.id, 'down')}
                    disabled={index === layers.length - 1}
                    className={`p-1 rounded text-[#707070] hover:text-white hover:bg-[#1a1a1a] cursor-pointer ${
                      index === layers.length - 1 ? 'opacity-20 cursor-not-allowed' : ''
                    }`}
                    title="Move layer down"
                  >
                    <ChevronDown size={11} />
                  </button>
                  {/* Toggle Visibility */}
                  <button
                    id={`layer-vis-${layer.id}`}
                    onClick={() => onToggleVisibility(layer.id)}
                    className="p-1 rounded text-[#707070] hover:text-white hover:bg-[#1a1a1a] cursor-pointer"
                    title="Toggle Layer Visibility"
                  >
                    {layer.visible ? <Eye size={11} /> : <EyeOff size={11} className="text-[#555]" />}
                  </button>
                  {/* Toggle Lock */}
                  <button
                    id={`layer-lock-${layer.id}`}
                    onClick={() => onToggleLock(layer.id)}
                    className="p-1 rounded text-[#707070] hover:text-white hover:bg-[#1a1a1a] cursor-pointer"
                    title="Toggle Layer Lock"
                  >
                    {layer.locked ? <Lock size={11} className="text-amber-500" /> : <Unlock size={11} />}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
