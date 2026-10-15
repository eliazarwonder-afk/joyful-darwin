'use client';

import React from 'react';
import {
  MousePointer2,
  StickyNote,
  Square,
  Circle,
  Type,
  MoveUpRight,
  Eraser,
  Undo2,
  Redo2,
  Trash2,
  LucideIcon,
} from 'lucide-react';
import { useCanvasStore } from '../store/canvasStore';
import { STICKY_COLORS, NodeType } from '@collabflow/shared';

interface ToolbarProps {
  onUndo?: () => void;
  onRedo?: () => void;
  onClear?: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ onUndo, onRedo, onClear }) => {
  const { activeTool, setActiveTool, activeColor, setActiveColor } = useCanvasStore();

  const tools: Array<{
    id: NodeType | 'select' | 'eraser';
    label: string;
    icon: LucideIcon;
    shortcut: string;
  }> = [
    { id: 'select', label: 'Select (V)', icon: MousePointer2, shortcut: 'V' },
    { id: 'sticky', label: 'Note (S)', icon: StickyNote, shortcut: 'S' },
    { id: 'rectangle', label: 'Rectangle (R)', icon: Square, shortcut: 'R' },
    { id: 'circle', label: 'Circle (C)', icon: Circle, shortcut: 'C' },
    { id: 'text', label: 'Text (T)', icon: Type, shortcut: 'T' },
    { id: 'arrow', label: 'Connector (A)', icon: MoveUpRight, shortcut: 'A' },
    { id: 'eraser', label: 'Eraser (E)', icon: Eraser, shortcut: 'E' },
  ];

  return (
    <aside className="absolute left-3.5 top-16 z-20 flex flex-col items-center bg-[#111215]/90 backdrop-blur-xl border border-white/[0.08] rounded-xl p-1 shadow-[0_4px_24px_rgba(0,0,0,0.5)] select-none space-y-0.5">
      {/* Creation Tools */}
      {tools.map((tool) => {
        const Icon = tool.icon;
        const isActive = activeTool === tool.id;
        return (
          <button
            key={tool.id}
            onClick={() => setActiveTool(tool.id)}
            title={tool.label}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
              isActive
                ? 'bg-white text-neutral-950 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.06]'
            }`}
          >
            <Icon className="w-3.5 h-3.5" strokeWidth={1.75} />
          </button>
        );
      })}

      <div className="w-4 h-px bg-white/[0.08] my-1" />

      {/* Color Swatches */}
      <div className="flex flex-col items-center space-y-1.5 py-1">
        {STICKY_COLORS.map((color) => (
          <button
            key={color}
            onClick={() => setActiveColor(color)}
            className={`w-4 h-4 rounded-full transition-all border border-black/20 ${
              activeColor === color
                ? 'scale-125 ring-1 ring-white ring-offset-1 ring-offset-[#111215]'
                : 'hover:scale-110 opacity-80 hover:opacity-100'
            }`}
            style={{ backgroundColor: color }}
            title={`Color ${color}`}
          />
        ))}
      </div>

      <div className="w-4 h-px bg-white/[0.08] my-1" />

      {/* Undo / Redo Actions */}
      <button
        onClick={onUndo}
        title="Undo (Ctrl+Z)"
        className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.06] transition"
      >
        <Undo2 className="w-3.5 h-3.5" strokeWidth={1.75} />
      </button>

      <button
        onClick={onRedo}
        title="Redo (Ctrl+Y)"
        className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.06] transition"
      >
        <Redo2 className="w-3.5 h-3.5" strokeWidth={1.75} />
      </button>

      <button
        onClick={onClear}
        title="Clear canvas"
        className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
      >
        <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
      </button>
    </aside>
  );
};
