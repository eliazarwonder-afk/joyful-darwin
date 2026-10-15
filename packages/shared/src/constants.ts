export const USER_COLORS = [
  '#2563EB', // Cobalt
  '#059669', // Emerald
  '#D97706', // Amber
  '#7C3AED', // Violet
  '#DC2626', // Crimson
  '#0D9488', // Teal
  '#475569', // Slate
  '#BE185D', // Rose
];

export const STICKY_COLORS = [
  '#FEF9C3', // Warm Cream
  '#E0F2FE', // Pale Ice Blue
  '#DCFCE7', // Pale Sage
  '#F3E8FF', // Soft Lavender
  '#FFE4E6', // Muted Blush
  '#F1F5F9', // Crisp Minimalist White
];

export const WS_EVENTS = {
  // Yjs Sync protocol
  SYNC_STEP_1: 0,
  SYNC_STEP_2: 1,
  SYNC_UPDATE: 2,
  // Awareness
  AWARENESS_UPDATE: 3,
  // Custom Board events
  BOARD_JOIN: 'board:join',
  BOARD_LEAVE: 'board:leave',
  EXPORT_STATUS: 'export:status',
  ERROR: 'error',
} as const;

export const DEFAULT_CANVAS_CONFIG = {
  gridSize: 20,
  minZoom: 0.1,
  maxZoom: 5.0,
  zoomStep: 0.1,
};
