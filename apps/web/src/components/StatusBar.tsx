'use client';

import React from 'react';
import { Minus, Plus, RotateCcw } from 'lucide-react';
import { useCanvasStore } from '../store/canvasStore';

interface StatusBarProps {
  nodeCount: number;
}

export const StatusBar: React.FC<StatusBarProps> = ({ nodeCount }) => {
  const { zoom, setZoom, resetViewport, mousePos, selectedNodeIds } = useCanvasStore();

  const zoomPercent = Math.round(zoom * 100);

  return (
    <footer className="absolute bottom-3 left-3.5 right-3.5 z-20 flex items-center justify-between pointer-events-none select-none">
      {/* Left: Element & Selection Count */}
      <div className="pointer-events-auto flex items-center space-x-2 bg-[#111215]/80 backdrop-blur-md border border-white/[0.08] rounded-lg px-2.5 py-1 text-[11px] text-neutral-400 shadow-sm">
        <span className="text-neutral-200 font-medium">
          {selectedNodeIds.length > 0
            ? `${selectedNodeIds.length} selected`
            : `${nodeCount} ${nodeCount === 1 ? 'item' : 'items'}`}
        </span>
        <span className="text-neutral-700">•</span>
        <span className="font-mono text-neutral-500">
          {Math.round(mousePos.x)}, {Math.round(mousePos.y)}
        </span>
      </div>

      {/* Right: Minimal Zoom Stepper */}
      <div className="pointer-events-auto flex items-center space-x-1 bg-[#111215]/80 backdrop-blur-md border border-white/[0.08] rounded-lg p-0.5 shadow-sm text-xs text-neutral-300">
        <button
          onClick={() => setZoom((prev) => Math.max(0.2, prev - 0.1))}
          className="p-1 rounded hover:bg-white/[0.08] text-neutral-400 hover:text-white transition"
          title="Zoom out"
        >
          <Minus className="w-3 h-3" />
        </button>

        <button
          onClick={resetViewport}
          className="px-1.5 py-0.5 rounded hover:bg-white/[0.08] font-mono text-[11px] text-neutral-300 hover:text-white transition"
          title="Reset zoom"
        >
          {zoomPercent}%
        </button>

        <button
          onClick={() => setZoom((prev) => Math.min(3.0, prev + 0.1))}
          className="p-1 rounded hover:bg-white/[0.08] text-neutral-400 hover:text-white transition"
          title="Zoom in"
        >
          <Plus className="w-3 h-3" />
        </button>

        <button
          onClick={resetViewport}
          className="p-1 rounded hover:bg-white/[0.08] text-neutral-500 hover:text-neutral-300 transition"
          title="Reset viewport"
        >
          <RotateCcw className="w-3 h-3" />
        </button>
      </div>
    </footer>
  );
};
