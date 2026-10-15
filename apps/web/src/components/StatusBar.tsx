'use client';

import React from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Activity } from 'lucide-react';
import { useCanvasStore } from '../store/canvasStore';

interface StatusBarProps {
  nodeCount: number;
}

export const StatusBar: React.FC<StatusBarProps> = ({ nodeCount }) => {
  const { zoom, setZoom, resetViewport, mousePos } = useCanvasStore();

  const zoomPercent = Math.round(zoom * 100);

  return (
    <footer className="absolute bottom-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none select-none">
      {/* Left: Element count & Coordinates */}
      <div className="pointer-events-auto flex items-center space-x-2 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl px-3 py-1.5 shadow-lg text-xs text-slate-400">
        <span className="font-semibold text-slate-200">{nodeCount}</span>
        <span>{nodeCount === 1 ? 'element' : 'elements'}</span>
        <span className="text-slate-700">•</span>
        <span>X: {Math.round(mousePos.x)}</span>
        <span>Y: {Math.round(mousePos.y)}</span>
      </div>

      {/* Center: System Design Watermark */}
      <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-800 text-[11px] text-slate-400">
        <Activity className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
        <span>CRDT Yjs Consensus Engine • WebSockets Active</span>
      </div>

      {/* Right: Zoom controls */}
      <div className="pointer-events-auto flex items-center space-x-1 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl p-1 shadow-lg text-xs text-slate-300">
        <button
          onClick={() => setZoom((prev) => Math.max(0.2, prev - 0.1))}
          className="p-1 rounded-lg hover:bg-slate-800 hover:text-white transition"
          title="Zoom Out (Ctrl -)"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={resetViewport}
          className="px-2 py-0.5 rounded-lg hover:bg-slate-800 font-mono text-slate-200 hover:text-white transition"
          title="Reset Viewport to 100%"
        >
          {zoomPercent}%
        </button>

        <button
          onClick={() => setZoom((prev) => Math.min(3.0, prev + 0.1))}
          className="p-1 rounded-lg hover:bg-slate-800 hover:text-white transition"
          title="Zoom In (Ctrl +)"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={resetViewport}
          className="p-1 rounded-lg hover:bg-slate-800 hover:text-white transition text-slate-400"
          title="Reset Pan & Zoom"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </footer>
  );
};
