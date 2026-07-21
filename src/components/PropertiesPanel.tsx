import { useEffect, useState } from 'react';
import { 
  Type, 
  Paintbrush, 
  Layers, 
  Lock, 
  Unlock, 
  Trash2, 
  Copy, 
  Bold, 
  Italic, 
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Sparkles,
  Layers3
} from 'lucide-react';
import { useEditorStore, type ActiveProperties } from '../stores/editorStore';

const FONTS = [
  { name: 'Inter', value: 'Inter, sans-serif' },
  { name: 'Space Grotesk', value: 'Space Grotesk, sans-serif' },
  { name: 'JetBrains Mono', value: 'JetBrains Mono, monospace' },
  { name: 'Playfair Display', value: 'Playfair Display, serif' },
  { name: 'Plus Jakarta Sans', value: 'Plus Jakarta Sans, sans-serif' },
];

const WEIGHTS = [
  { name: 'Light', value: '300' },
  { name: 'Regular', value: '400' },
  { name: 'Medium', value: '500' },
  { name: 'SemiBold', value: '600' },
  { name: 'Bold', value: '700' },
  { name: 'Black', value: '900' },
];

const PRESETS_COLORS = [
  '#ffffff', '#000000', '#f1f5f9', '#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6'
];

interface PropertiesPanelProps {
  onSetProperty: (key: keyof ActiveProperties, value: any) => void;
  onSetArtboardProperty: (key: 'width' | 'height' | 'fill', value: any) => void;
  onDeleteSelected: () => void;
  onDuplicateSelected: () => void;
  onGroupSelected: () => void;
  onUngroupSelected: () => void;
  onLockSelected: () => void;
  onUnlockSelected: (id?: string) => void;
}

export function PropertiesPanel({
  onSetProperty,
  onSetArtboardProperty,
  onDeleteSelected,
  onDuplicateSelected,
  onGroupSelected,
  onUngroupSelected,
  onLockSelected,
  onUnlockSelected,
}: PropertiesPanelProps) {
  const { activeProperties, selectedObjectCount, currentProject } = useEditorStore();

  // Temporary local states to allow smooth input scrubbing/typing
  const [localWidth, setLocalWidth] = useState(currentProject?.width || 1200);
  const [localHeight, setLocalHeight] = useState(currentProject?.height || 630);

  useEffect(() => {
    if (currentProject) {
      setLocalWidth(currentProject.width);
      setLocalHeight(currentProject.height);
    }
  }, [currentProject?.width, currentProject?.height]);

  const handleArtboardWidthChange = (val: string) => {
    const num = parseInt(val) || 0;
    setLocalWidth(num);
    onSetArtboardProperty('width', num);
  };

  const handleArtboardHeightChange = (val: string) => {
    const num = parseInt(val) || 0;
    setLocalHeight(num);
    onSetArtboardProperty('height', num);
  };

  return (
    <div 
      id="properties-sidebar"
      className="flex flex-col h-full bg-[#0a0a0a] w-full overflow-y-auto scrollbar-none"
    >
      <div className="flex items-center gap-2 border-b border-[#222] px-4 py-3 bg-[#0a0a0a]">
        <Paintbrush size={14} className="text-[#707070]" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#a1a1a1]">Properties</span>
      </div>

      <div className="flex-1 p-4 space-y-6">
        {selectedObjectCount === 0 ? (
          /* ARTBOARD PROPERTY SETTINGS */
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#a1a1a1]">Artboard Sizing</span>
                <span className="text-[10px] text-[#555] font-mono">No Selection</span>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[9px] text-[#555] font-bold uppercase tracking-widest">Width (px)</label>
                  <input
                    id="artboard-width"
                    type="number"
                    value={localWidth}
                    onChange={(e) => handleArtboardWidthChange(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-[#333] text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-white/20 font-mono text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] text-[#555] font-bold uppercase tracking-widest">Height (px)</label>
                  <input
                    id="artboard-height"
                    type="number"
                    value={localHeight}
                    onChange={(e) => handleArtboardHeightChange(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-[#333] text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-white/20 font-mono text-white"
                  />
                </div>
              </div>
            </div>

            {/* Document Background Fill Color */}
            <div className="space-y-3">
              <label className="text-[9px] text-[#555] font-bold uppercase tracking-widest">Artboard Color</label>
              <div className="flex gap-2">
                <input
                  id="artboard-bg-picker"
                  type="color"
                  value={currentProject?.canvasData ? '#ffffff' : '#ffffff'} // default mock fallback
                  onChange={(e) => onSetArtboardProperty('fill', e.target.value)}
                  className="h-8 w-8 cursor-pointer rounded border border-[#333] bg-transparent p-0"
                />
                <input
                  type="text"
                  placeholder="#ffffff"
                  onChange={(e) => onSetArtboardProperty('fill', e.target.value)}
                  className="flex-1 bg-[#1a1a1a] border border-[#333] text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-white/20 font-mono text-white"
                />
              </div>
              <div className="grid grid-cols-5 gap-1.5 pt-1">
                {PRESETS_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => onSetArtboardProperty('fill', c)}
                    className="h-5 rounded border border-[#222] transition-transform hover:scale-105 cursor-pointer"
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            {/* Empty Selection helper */}
            <div className="rounded border border-[#222] bg-[#1a1a1a]/10 p-4 text-center mt-6">
              <Sparkles className="mx-auto text-[#555] mb-2" size={20} />
              <p className="text-[11px] text-[#707070] leading-relaxed">
                Select an object on the canvas to configure its color fills, borders, typography styles, shadows, and reordering.
              </p>
            </div>
          </div>
        ) : (
          /* ACTIVE SELECTION PROPERTIES */
          <div className="space-y-6">
            
            {/* Quick Actions Bar */}
            <div className="flex items-center justify-between border-b border-[#222] pb-4 gap-1.5">
              <button
                id="prop-btn-duplicate"
                onClick={onDuplicateSelected}
                title="Duplicate"
                className="flex flex-1 items-center justify-center gap-1 py-1.5 px-2 bg-[#1a1a1a] border border-[#333] hover:bg-[#222] rounded text-[10px] font-semibold text-[#a1a1a1] hover:text-white transition-colors cursor-pointer"
              >
                <Copy size={11} />
                Dup
              </button>
              {selectedObjectCount > 1 ? (
                <button
                  id="prop-btn-group"
                  onClick={onGroupSelected}
                  className="flex flex-1 items-center justify-center gap-1 py-1.5 px-2 bg-[#1a1a1a] border border-[#333] hover:bg-[#222] rounded text-[10px] font-semibold text-[#a1a1a1] hover:text-white transition-colors cursor-pointer"
                >
                  <Layers size={11} />
                  Group
                </button>
              ) : activeProperties?.type === 'group' ? (
                <button
                  id="prop-btn-ungroup"
                  onClick={onUngroupSelected}
                  className="flex flex-1 items-center justify-center gap-1 py-1.5 px-2 bg-[#1a1a1a] border border-[#333] hover:bg-[#222] rounded text-[10px] font-semibold text-[#a1a1a1] hover:text-white transition-colors cursor-pointer"
                >
                  <Layers3 size={11} />
                  Ungroup
                </button>
              ) : null}
              <button
                id="prop-btn-lock"
                onClick={onLockSelected}
                title="Lock object"
                className="flex items-center justify-center p-1.5 bg-[#1a1a1a] border border-[#333] hover:bg-[#222] rounded text-[#a1a1a1] hover:text-white transition-colors cursor-pointer"
              >
                <Lock size={12} />
              </button>
              <button
                id="prop-btn-delete"
                onClick={onDeleteSelected}
                title="Delete Object"
                className="flex items-center justify-center p-1.5 bg-[#1a1a1a] border border-[#333] hover:bg-red-950 hover:border-red-900/50 hover:text-red-400 rounded text-[#a1a1a1] transition-colors cursor-pointer"
              >
                <Trash2 size={12} />
              </button>
            </div>

            {/* Typography Controls (Only if selected is Text) */}
            {activeProperties?.type === 'itext' && (
              <div className="space-y-4 border-b border-[#222] pb-5">
                <div className="flex items-center gap-1.5">
                  <Type size={12} className="text-[#707070]" />
                  <span className="text-[9px] font-bold text-[#a1a1a1] tracking-widest uppercase">Typography</span>
                </div>

                {/* Font Family Selection */}
                <div className="space-y-1.5">
                  <label className="text-[9px] text-[#555] font-bold uppercase tracking-widest">Font Family</label>
                  <select
                    id="prop-font-family"
                    value={activeProperties.fontFamily}
                    onChange={(e) => onSetProperty('fontFamily', e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-[#333] text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-white/20 text-white"
                  >
                    {FONTS.map((font) => (
                      <option key={font.name} value={font.value}>{font.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Font Size */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] text-[#555] font-bold uppercase tracking-widest">Size (px)</label>
                    <input
                      id="prop-font-size"
                      type="number"
                      value={activeProperties.fontSize || 24}
                      onChange={(e) => onSetProperty('fontSize', parseInt(e.target.value) || 12)}
                      className="w-full bg-[#1a1a1a] border border-[#333] text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-white/20 font-mono text-white"
                    />
                  </div>
                  {/* Font Weight */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] text-[#555] font-bold uppercase tracking-widest">Weight</label>
                    <select
                      id="prop-font-weight"
                      value={activeProperties.fontWeight}
                      onChange={(e) => onSetProperty('fontWeight', e.target.value)}
                      className="w-full bg-[#1a1a1a] border border-[#333] text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-white/20 text-white"
                    >
                      {WEIGHTS.map((w) => (
                        <option key={w.name} value={w.value}>{w.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Letter Spacing */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] text-[#555] font-bold uppercase tracking-widest">Letter Spacing</label>
                    <input
                      id="prop-letter-spacing"
                      type="number"
                      value={activeProperties.charSpacing || 0}
                      onChange={(e) => onSetProperty('charSpacing', parseInt(e.target.value) || 0)}
                      className="w-full bg-[#1a1a1a] border border-[#333] text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-white/20 font-mono text-white"
                    />
                  </div>
                  {/* Line Height */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] text-[#555] font-bold uppercase tracking-widest">Line Height</label>
                    <input
                      id="prop-line-height"
                      type="number"
                      step="0.1"
                      value={activeProperties.lineHeight || 1.15}
                      onChange={(e) => onSetProperty('lineHeight', parseFloat(e.target.value) || 1.15)}
                      className="w-full bg-[#1a1a1a] border border-[#333] text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-white/20 font-mono text-white"
                    />
                  </div>
                </div>

                {/* Typography formatting (Align, Underline, Style) */}
                <div className="space-y-1.5">
                  <label className="text-[9px] text-[#555] font-bold uppercase tracking-widest">Formatting</label>
                  <div className="flex gap-1 border border-[#333] bg-[#1a1a1a]/40 p-1 rounded">
                    <button
                      onClick={() => onSetProperty('textAlign', 'left')}
                      className={`flex-1 py-1 rounded flex items-center justify-center text-[#707070] hover:bg-[#222] hover:text-white ${
                        activeProperties.textAlign === 'left' ? 'bg-[#222] text-white font-bold' : ''
                      }`}
                    >
                      <AlignLeft size={13} />
                    </button>
                    <button
                      onClick={() => onSetProperty('textAlign', 'center')}
                      className={`flex-1 py-1 rounded flex items-center justify-center text-[#707070] hover:bg-[#222] hover:text-white ${
                        activeProperties.textAlign === 'center' ? 'bg-[#222] text-white font-bold' : ''
                      }`}
                    >
                      <AlignCenter size={13} />
                    </button>
                    <button
                      onClick={() => onSetProperty('textAlign', 'right')}
                      className={`flex-1 py-1 rounded flex items-center justify-center text-[#707070] hover:bg-[#222] hover:text-white ${
                        activeProperties.textAlign === 'right' ? 'bg-[#222] text-white font-bold' : ''
                      }`}
                    >
                      <AlignRight size={13} />
                    </button>
                    <button
                      onClick={() => onSetProperty('fontStyle', activeProperties.fontStyle === 'italic' ? 'normal' : 'italic')}
                      className={`flex-1 py-1 rounded flex items-center justify-center text-[#707070] hover:bg-[#222] hover:text-white ${
                        activeProperties.fontStyle === 'italic' ? 'bg-[#222] text-white font-bold' : ''
                      }`}
                    >
                      <Italic size={13} />
                    </button>
                    <button
                      onClick={() => onSetProperty('underline', !activeProperties.underline)}
                      className={`flex-1 py-1 rounded flex items-center justify-center text-[#707070] hover:bg-[#222] hover:text-white ${
                        activeProperties.underline ? 'bg-[#222] text-white font-bold' : ''
                      }`}
                    >
                      <Underline size={13} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* COLOR AND FILL */}
            {activeProperties?.type !== 'line' && activeProperties?.type !== 'path' && (
              <div className="space-y-3">
                <label className="text-[9px] text-[#555] font-bold uppercase tracking-widest">Fill Color</label>
                <div className="flex gap-2">
                  <input
                    id="prop-fill-picker"
                    type="color"
                    value={activeProperties?.fill && activeProperties.fill.startsWith('#') ? activeProperties.fill : '#3b82f6'}
                    onChange={(e) => onSetProperty('fill', e.target.value)}
                    className="h-8 w-8 cursor-pointer rounded border border-[#333] bg-transparent p-0"
                  />
                  <input
                    id="prop-fill-text"
                    type="text"
                    value={activeProperties?.fill || ''}
                    onChange={(e) => onSetProperty('fill', e.target.value)}
                    className="flex-1 bg-[#1a1a1a] border border-[#333] text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-white/20 font-mono text-white"
                  />
                </div>
                <div className="grid grid-cols-5 gap-1 pt-1">
                  {PRESETS_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => onSetProperty('fill', c)}
                      className="h-5 rounded border border-[#222] transition-transform hover:scale-105 cursor-pointer"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* BORDER AND STROKE */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[9px] text-[#555] font-bold uppercase tracking-widest">Stroke Color</label>
                <div className="flex gap-2">
                  <input
                    id="prop-stroke-picker"
                    type="color"
                    value={activeProperties?.stroke && activeProperties.stroke.startsWith('#') ? activeProperties.stroke : '#000000'}
                    onChange={(e) => onSetProperty('stroke', e.target.value)}
                    className="h-8 w-8 cursor-pointer rounded border border-[#333] bg-transparent p-0"
                  />
                  <input
                    id="prop-stroke-text"
                    type="text"
                    value={activeProperties?.stroke || ''}
                    onChange={(e) => onSetProperty('stroke', e.target.value)}
                    placeholder="None"
                    className="flex-1 bg-[#1a1a1a] border border-[#333] text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-white/20 font-mono text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Stroke Width */}
                <div className="space-y-1.5">
                  <label className="text-[9px] text-[#555] font-bold uppercase tracking-widest">Stroke Width</label>
                  <input
                    id="prop-stroke-width"
                    type="number"
                    min="0"
                    max="50"
                    value={activeProperties?.strokeWidth || 0}
                    onChange={(e) => onSetProperty('strokeWidth', parseInt(e.target.value) || 0)}
                    className="w-full bg-[#1a1a1a] border border-[#333] text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-white/20 font-mono text-white"
                  />
                </div>
                {/* Corner Radius (Only if selected is Rectangle) */}
                {activeProperties?.type === 'rect' && (
                  <div className="space-y-1.5">
                    <label className="text-[9px] text-[#555] font-bold uppercase tracking-widest">Corner Radius</label>
                    <input
                      id="prop-corner-radius"
                      type="number"
                      min="0"
                      max="100"
                      value={activeProperties.rx || 0}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        onSetProperty('rx', val);
                        onSetProperty('ry', val);
                      }}
                      className="w-full bg-[#1a1a1a] border border-[#333] text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-white/20 font-mono text-white"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* OPACITY CONTROLLER */}
            <div className="space-y-2 border-t border-[#222] pt-4">
              <div className="flex items-center justify-between">
                <label className="text-[9px] text-[#555] font-bold uppercase tracking-widest">Opacity</label>
                <span className="text-[10px] text-[#a1a1a1] font-mono">
                  {Math.round((activeProperties?.opacity ?? 1) * 100)}%
                </span>
              </div>
              <input
                id="prop-opacity-slider"
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={activeProperties?.opacity ?? 1}
                onChange={(e) => onSetProperty('opacity', parseFloat(e.target.value))}
                className="w-full accent-white h-1 bg-[#1a1a1a] rounded cursor-pointer"
              />
            </div>

            {/* SHADOW EFFECTS */}
            <div className="space-y-4 border-t border-[#222] pt-4">
              <label className="text-[9px] text-[#555] font-bold uppercase tracking-widest">Shadow Effects</label>
              <div className="space-y-2.5">
                <div className="flex gap-2">
                  <input
                    id="prop-shadow-color"
                    type="color"
                    value={activeProperties?.shadowColor && activeProperties.shadowColor.startsWith('#') ? activeProperties.shadowColor : '#000000'}
                    onChange={(e) => onSetProperty('shadowColor', e.target.value)}
                    className="h-8 w-8 cursor-pointer rounded border border-[#333] bg-transparent p-0"
                  />
                  <input
                    id="prop-shadow-color-text"
                    type="text"
                    value={activeProperties?.shadowColor || ''}
                    placeholder="Shadow color"
                    onChange={(e) => onSetProperty('shadowColor', e.target.value)}
                    className="flex-1 bg-[#1a1a1a] border border-[#333] text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-white/20 font-mono text-white"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <span className="text-[9px] text-[#555] font-bold uppercase tracking-widest">Blur</span>
                    <input
                      id="prop-shadow-blur"
                      type="number"
                      min="0"
                      value={activeProperties?.shadowBlur || 0}
                      onChange={(e) => onSetProperty('shadowBlur', parseInt(e.target.value) || 0)}
                      className="w-full bg-[#1a1a1a] border border-[#333] text-[11px] rounded px-2 py-1 focus:outline-none focus:border-white/20 font-mono text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] text-[#555] font-bold uppercase tracking-widest">Offset X</span>
                    <input
                      id="prop-shadow-offset-x"
                      type="number"
                      value={activeProperties?.shadowOffsetX || 0}
                      onChange={(e) => onSetProperty('shadowOffsetX', parseInt(e.target.value) || 0)}
                      className="w-full bg-[#1a1a1a] border border-[#333] text-[11px] rounded px-2 py-1 focus:outline-none focus:border-white/20 font-mono text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] text-[#555] font-bold uppercase tracking-widest">Offset Y</span>
                    <input
                      id="prop-shadow-offset-y"
                      type="number"
                      value={activeProperties?.shadowOffsetY || 0}
                      onChange={(e) => onSetProperty('shadowOffsetY', parseInt(e.target.value) || 0)}
                      className="w-full bg-[#1a1a1a] border border-[#333] text-[11px] rounded px-2 py-1 focus:outline-none focus:border-white/20 font-mono text-white"
                    />
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
