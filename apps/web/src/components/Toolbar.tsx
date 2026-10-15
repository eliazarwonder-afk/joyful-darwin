'use client';

import React from 'react';
import {
  MousePointer,
  StickyNote,
  Square,
  Circle,
  Type,
  MoveUpRight,
  Eraser,
  Undo2,
  Redo2,
  Trash2,
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
    icon: React.ComponentType<{ className?: string }>;
    shortcut: string;
  }> = [
    { id: 'select', label: 'Select (V)', icon: MousePointer, shortcut: 'V' },
    { id: 'sticky', label: 'Sticky Note (S)', icon: StickyNote, shortcut: 'S' },
    { id: 'rectangle', label: 'Rectangle (R)', icon: Square, shortcut: 'R' },
    { id: 'circle', label: 'Circle (C)', icon: Circle, shortcut: 'C' },
    { id: 'text', label: 'Text (T)', icon: Type, shortcut: 'T' },
    { id: 'arrow', label: 'Arrow (A)', icon: MoveUpRight, shortcut: 'A' },
    { id: 'eraser', label: 'Eraser (E)', icon: Eraser, shortcut: 'E' },
  ];

  return (
    <aside className="absolute left-4 top-20 z-20 flex flex-col items-center bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-2xl p-1.5 shadow-2xl select-none space-y-1">
      {/* Creation Tools */}
      {tools.map((tool) => {
        const Icon = tool.icon;
        const isActive = activeTool === tool.id;
        return (
          <button
            key={tool.id}
            onClick={() => setActiveTool(tool.id)}
            title={tool.label}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition ${
              isActive
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <Icon className="w-4 h-4" />
          </button>
        );
      })}

      <div className="w-6 h-px bg-slate-800 my-1" />

      {/* Color Swatches */}
      <div className="flex flex-col items-center space-y-1.5 py-1">
        {STICKY_COLORS.map((color) => (
          <button
            key={color}
            onClick={() => setActiveColor(color)}
            className={`w-5 h-5 rounded-full transition-transform ${
              activeColor === color ? 'scale-125 ring-2 ring-indigo-500 ring-offset-2 ring-offset-slate-900' : 'hover:scale-110'
            }`}
            style={{ backgroundColor: color }}
            title={`Select Color ${color}`}
          />
        ))}
      </div>

      <div className="w-6 h-px bg-slate-800 my-1" />

      {/* Undo / Redo Actions */}
      <button
        onClick={onUndo}
        title="Undo (Ctrl+Z)"
        className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800/80 transition"
      >
        <Undo2 className="w-4 h-4" />
      </button>

      <button
        onClick={onRedo}
        title="Redo (Ctrl+Y)"
        className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800/80 transition"
      >
        <Redo2 className="w-4 h-4" />
      </button>

      <button
        onClick={onClear}
        title="Clear All Nodes"
        className="w-9 h-9 rounded-xl flex items-center justify-center text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </aside>
  );
};
