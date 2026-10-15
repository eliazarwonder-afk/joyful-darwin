import { create } from 'zustand';
import { CanvasNode, NodeType, UserPresence, STICKY_COLORS } from '@collabflow/shared';

interface CanvasState {
  // Viewport
  pan: { x: number; y: number };
  zoom: number;
  mousePos: { x: number; y: number };

  // Tool & Creation
  activeTool: NodeType | 'select' | 'eraser';
  activeColor: string;
  activeStroke: string;
  activeStrokeWidth: number;
  activeFontSize: number;

  // Selection
  selectedNodeIds: string[];
  editingNodeId: string | null;

  // Collaboration & Network
  onlineUsers: UserPresence[];
  syncStatus: 'connected' | 'syncing' | 'offline';
  latencyMs: number;

  // UI Modals
  exportModalOpen: boolean;

  // Actions
  setPan: (pan: { x: number; y: number } | ((prev: { x: number; y: number }) => { x: number; y: number })) => void;
  setZoom: (zoom: number | ((prev: number) => number)) => void;
  setMousePos: (pos: { x: number; y: number }) => void;
  setActiveTool: (tool: NodeType | 'select' | 'eraser') => void;
  setActiveColor: (color: string) => void;
  setSelectedNodeIds: (ids: string[]) => void;
  setEditingNodeId: (id: string | null) => void;
  setOnlineUsers: (users: UserPresence[]) => void;
  setSyncStatus: (status: 'connected' | 'syncing' | 'offline') => void;
  setLatencyMs: (ms: number) => void;
  setExportModalOpen: (open: boolean) => void;
  resetViewport: () => void;
}

export const useCanvasStore = create<CanvasState>((set) => ({
  pan: { x: 0, y: 0 },
  zoom: 1.0,
  mousePos: { x: 0, y: 0 },

  activeTool: 'select',
  activeColor: STICKY_COLORS[0],
  activeStroke: '#475569',
  activeStrokeWidth: 2,
  activeFontSize: 16,

  selectedNodeIds: [],
  editingNodeId: null,

  onlineUsers: [],
  syncStatus: 'syncing',
  latencyMs: 12,

  exportModalOpen: false,

  setPan: (pan) =>
    set((state) => ({
      pan: typeof pan === 'function' ? pan(state.pan) : pan,
    })),
  setZoom: (zoom) =>
    set((state) => ({
      zoom: Math.min(3.0, Math.max(0.2, typeof zoom === 'function' ? zoom(state.zoom) : zoom)),
    })),
  setMousePos: (mousePos) => set({ mousePos }),
  setActiveTool: (activeTool) => set({ activeTool }),
  setActiveColor: (activeColor) => set({ activeColor }),
  setSelectedNodeIds: (selectedNodeIds) => set({ selectedNodeIds }),
  setEditingNodeId: (editingNodeId) => set({ editingNodeId }),
  setOnlineUsers: (onlineUsers) => set({ onlineUsers }),
  setSyncStatus: (syncStatus) => set({ syncStatus }),
  setLatencyMs: (latencyMs) => set({ latencyMs }),
  setExportModalOpen: (exportModalOpen) => set({ exportModalOpen }),
  resetViewport: () => set({ pan: { x: 0, y: 0 }, zoom: 1.0 }),
}));
