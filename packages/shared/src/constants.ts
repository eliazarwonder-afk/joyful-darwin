export const USER_COLORS = [
  '#EF4444', // Red
  '#F97316', // Orange
  '#F59E0B', // Amber
  '#10B981', // Emerald
  '#06B6D4', // Cyan
  '#3B82F6', // Blue
  '#6366F1', // Indigo
  '#8B5CF6', // Violet
  '#EC4899', // Pink
];

export const STICKY_COLORS = [
  '#FEF08A', // Yellow
  '#BAF7D0', // Mint Green
  '#BFDBFE', // Soft Blue
  '#FED7AA', // Peach
  '#FBCFE8', // Light Pink
  '#E9D5FF', // Lavender
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
