'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import { CanvasNode, NodeType } from '@collabflow/shared';
import { YjsCanvasClient } from '../lib/yjsClient';

interface CanvasProps {
  client: YjsCanvasClient | null;
  nodes: CanvasNode[];
}

export const Canvas: React.FC<CanvasProps> = ({ client, nodes }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    pan,
    zoom,
    setPan,
    setZoom,
    setMousePos,
    activeTool,
    setActiveTool,
    activeColor,
    activeStroke,
    activeStrokeWidth,
    selectedNodeIds,
    setSelectedNodeIds,
    editingNodeId,
    setEditingNodeId,
    onlineUsers,
  } = useCanvasStore();

  const [isDraggingNode, setIsDraggingNode] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const isSpacePressed = useRef(false);

  // Track spacebar for panning
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') isSpacePressed.current = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') isSpacePressed.current = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Convert screen coordinates to canvas world coordinates
  const screenToWorld = useCallback(
    (screenX: number, screenY: number) => {
      const rect = containerRef.current?.getBoundingClientRect() || { left: 0, top: 0 };
      const x = (screenX - rect.left - pan.x) / zoom;
      const y = (screenY - rect.top - pan.y) / zoom;
      return { x, y };
    },
    [pan, zoom]
  );

  // Convert world coordinates to screen coordinates
  const worldToScreen = useCallback(
    (worldX: number, worldY: number) => {
      return {
        x: worldX * zoom + pan.x,
        y: worldY * zoom + pan.y,
      };
    },
    [pan, zoom]
  );

  // Handle Wheel: zoom centered on mouse pointer or pan with touchpad
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();

    if (e.ctrlKey || e.metaKey) {
      // Pinch-to-zoom or Ctrl+Wheel
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      const newZoom = Math.min(3.0, Math.max(0.2, zoom * zoomFactor));

      const rect = containerRef.current?.getBoundingClientRect() || { left: 0, top: 0 };
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Adjust pan so mouse point remains stationary
      setPan({
        x: mouseX - (mouseX - pan.x) * (newZoom / zoom),
        y: mouseY - (mouseY - pan.y) * (newZoom / zoom),
      });
      setZoom(newZoom);
    } else {
      // 2D Pan with touchpad or wheel
      setPan((prev) => ({
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY,
      }));
    }
  };

  // Handle Mouse Down on Canvas Background
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && isSpacePressed.current)) {
      // Middle click or Space+Click: Pan
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    if (e.target !== containerRef.current && (e.target as HTMLElement).tagName !== 'svg') {
      return;
    }

    const { x, y } = screenToWorld(e.clientX, e.clientY);

    if (activeTool === 'select') {
      setSelectedNodeIds([]);
      setEditingNodeId(null);
      client?.updateSelectedNodes([]);
      return;
    }

    // Creating new node based on active tool
    if (activeTool !== 'eraser') {
      const newNodeId = `node_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      let newNode: CanvasNode;

      const baseNode = {
        id: newNodeId,
        x: Math.round(x),
        y: Math.round(y),
        stroke: activeStroke,
        strokeWidth: activeStrokeWidth,
        zIndex: nodes.length + 1,
        updatedBy: client?.currentUser.name || 'User',
        updatedAt: Date.now(),
      };

      if (activeTool === 'sticky') {
        newNode = {
          ...baseNode,
          type: 'sticky',
          width: 200,
          height: 180,
          fill: activeColor,
          stroke: '#E2E8F0',
          strokeWidth: 1,
          text: 'New thought or task...',
          fontSize: 15,
          textColor: '#1E293B',
        };
      } else if (activeTool === 'rectangle') {
        newNode = {
          ...baseNode,
          type: 'rectangle',
          width: 180,
          height: 120,
          fill: activeColor,
          text: 'Rectangle',
          fontSize: 14,
          textColor: '#1E293B',
        };
      } else if (activeTool === 'circle') {
        newNode = {
          ...baseNode,
          type: 'circle',
          width: 140,
          height: 140,
          fill: activeColor,
          text: 'Circle',
          fontSize: 14,
          textColor: '#1E293B',
        };
      } else if (activeTool === 'text') {
        newNode = {
          ...baseNode,
          type: 'text',
          width: 220,
          height: 50,
          fill: 'transparent',
          stroke: 'transparent',
          strokeWidth: 0,
          text: 'Header or Annotation',
          fontSize: 22,
          textColor: '#F8FAFC',
        };
      } else {
        // Arrow
        newNode = {
          ...baseNode,
          type: 'arrow',
          width: 160,
          height: 80,
          fill: 'transparent',
          stroke: '#64748B',
          strokeWidth: 3,
        };
      }

      client?.addNode(newNode);
      setSelectedNodeIds([newNodeId]);
      client?.updateSelectedNodes([newNodeId]);
      setActiveTool('select');
    }
  };

  // Mouse Move
  const handleMouseMove = (e: React.MouseEvent) => {
    const { x, y } = screenToWorld(e.clientX, e.clientY);
    setMousePos({ x, y });

    // Broadcast cursor position via Yjs awareness protocol
    client?.updateCursor(Math.round(x), Math.round(y));

    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
      return;
    }

    if (isDraggingNode && selectedNodeIds.length > 0 && client) {
      const primaryId = selectedNodeIds[0];
      client.updateNode(primaryId, {
        x: Math.round(x - dragOffset.x),
        y: Math.round(y - dragOffset.y),
      });
    }
  };

  // Mouse Up
  const handleMouseUp = () => {
    setIsPanning(false);
    setIsDraggingNode(false);
  };

  // Node Interaction Handlers
  const handleNodeMouseDown = (e: React.MouseEvent, node: CanvasNode) => {
    e.stopPropagation();

    if (activeTool === 'eraser') {
      client?.deleteNode(node.id);
      setSelectedNodeIds([]);
      return;
    }

    const { x, y } = screenToWorld(e.clientX, e.clientY);
    setSelectedNodeIds([node.id]);
    client?.updateSelectedNodes([node.id]);

    setIsDraggingNode(true);
    setDragOffset({
      x: x - node.x,
      y: y - node.y,
    });
  };

  // Keyboard Shortcuts: Delete, Undo, Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingNodeId) return; // Typing in input

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodeIds.length > 0 && client) {
          client.deleteNodes(selectedNodeIds);
          setSelectedNodeIds([]);
          client.updateSelectedNodes([]);
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          client?.redo();
        } else {
          client?.undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        client?.redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeIds, editingNodeId, client, setSelectedNodeIds]);

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className="relative w-full h-full overflow-hidden canvas-grid bg-slate-950 cursor-crosshair select-none"
    >
      {/* World Transform Layer */}
      <div
        className="absolute origin-top-left"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
        }}
      >
        {/* Render Canvas Nodes */}
        {nodes.map((node) => {
          const isSelected = selectedNodeIds.includes(node.id);
          const isEditing = editingNodeId === node.id;

          return (
            <div
              key={node.id}
              onMouseDown={(e) => handleNodeMouseDown(e, node)}
              onDoubleClick={(e) => {
                e.stopPropagation();
                setEditingNodeId(node.id);
              }}
              style={{
                position: 'absolute',
                left: `${node.x}px`,
                top: `${node.y}px`,
                width: `${node.width}px`,
                height: `${node.height}px`,
                zIndex: node.zIndex,
              }}
              className={`group transition-all cursor-move rounded-lg ${
                isSelected
                  ? 'ring-1 ring-blue-500/90 shadow-[0_2px_12px_rgba(0,0,0,0.15)]'
                  : 'hover:ring-1 hover:ring-white/20'
              }`}
            >
              {/* Sticky Note */}
              {node.type === 'sticky' && (
                <div
                  className="w-full h-full rounded-lg p-3.5 flex flex-col justify-between shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)] border border-black/[0.08]"
                  style={{
                    backgroundColor: node.fill,
                  }}
                >
                  {isEditing ? (
                    <textarea
                      value={node.text || ''}
                      onChange={(e) => client?.updateNode(node.id, { text: e.target.value })}
                      onBlur={() => setEditingNodeId(null)}
                      autoFocus
                      className="w-full h-full bg-transparent resize-none border-none outline-none font-normal text-[13px] leading-relaxed text-neutral-800"
                    />
                  ) : (
                    <div className="font-normal text-[13px] leading-relaxed text-neutral-800 whitespace-pre-wrap select-none overflow-hidden">
                      {node.text || ''}
                    </div>
                  )}
                  <div className="text-[10px] text-neutral-500/70 font-mono flex items-center justify-end pt-1">
                    <span>{node.updatedBy}</span>
                  </div>
                </div>
              )}

              {/* Rectangle */}
              {node.type === 'rectangle' && (
                <div
                  className="w-full h-full rounded-md flex items-center justify-center p-3 text-center shadow-sm font-medium text-xs border border-white/[0.1]"
                  style={{
                    backgroundColor: node.fill,
                    borderColor: node.stroke,
                    color: node.textColor || '#1E293B',
                  }}
                >
                  {isEditing ? (
                    <input
                      type="text"
                      value={node.text || ''}
                      onChange={(e) => client?.updateNode(node.id, { text: e.target.value })}
                      onBlur={() => setEditingNodeId(null)}
                      autoFocus
                      className="w-full bg-transparent text-center border-none outline-none font-medium text-xs text-neutral-900"
                    />
                  ) : (
                    node.text || ''
                  )}
                </div>
              )}

              {/* Circle */}
              {node.type === 'circle' && (
                <div
                  className="w-full h-full rounded-full flex items-center justify-center p-3 text-center shadow-sm font-medium text-xs border border-white/[0.1]"
                  style={{
                    backgroundColor: node.fill,
                    borderColor: node.stroke,
                    color: node.textColor || '#1E293B',
                  }}
                >
                  {isEditing ? (
                    <input
                      type="text"
                      value={node.text || ''}
                      onChange={(e) => client?.updateNode(node.id, { text: e.target.value })}
                      onBlur={() => setEditingNodeId(null)}
                      autoFocus
                      className="w-full bg-transparent text-center border-none outline-none font-medium text-xs text-neutral-900"
                    />
                  ) : (
                    node.text || ''
                  )}
                </div>
              )}

              {/* Text Element */}
              {node.type === 'text' && (
                <div
                  className="w-full h-full flex items-center font-bold tracking-tight"
                  style={{
                    color: node.textColor || '#F8FAFC',
                    fontSize: `${node.fontSize || 20}px`,
                  }}
                >
                  {isEditing ? (
                    <input
                      type="text"
                      value={node.text || ''}
                      onChange={(e) => client?.updateNode(node.id, { text: e.target.value })}
                      onBlur={() => setEditingNodeId(null)}
                      autoFocus
                      className="w-full bg-transparent border-none outline-none font-bold text-white"
                    />
                  ) : (
                    node.text || 'Double-click to type'
                  )}
                </div>
              )}

              {/* Arrow Connector */}
              {node.type === 'arrow' && (
                <svg className="w-full h-full overflow-visible pointer-events-none">
                  <defs>
                    <marker
                      id={`arrowhead-${node.id}`}
                      markerWidth="10"
                      markerHeight="7"
                      refX="10"
                      refY="3.5"
                      orient="auto"
                    >
                      <polygon points="0 0, 10 3.5, 0 7" fill={node.stroke} />
                    </marker>
                  </defs>
                  <line
                    x1="0"
                    y1="0"
                    x2={node.width}
                    y2={node.height}
                    stroke={node.stroke}
                    strokeWidth={node.strokeWidth}
                    markerEnd={`url(#arrowhead-${node.id})`}
                  />
                </svg>
              )}
            </div>
          );
        })}

        {/* Remote Collaborator Cursors with smooth live presence */}
        {onlineUsers.map((user) => {
          if (!user.cursor) return null;
          return (
            <div
              key={user.userId}
              className="remote-cursor z-40"
              style={{
                position: 'absolute',
                left: `${user.cursor.x}px`,
                top: `${user.cursor.y}px`,
              }}
            >
              {/* Pointer Icon */}
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
              >
                <path
                  d="M5.65 2.15a1 1 0 0 0-1.4 1.15l4.5 16.5a1 1 0 0 0 1.9.1l3.5-7 7-3.5a1 1 0 0 0 .1-1.9L5.65 2.15z"
                  fill={user.color}
                  stroke="#000000"
                  strokeWidth="1.2"
                />
              </svg>

              {/* User Name Badge */}
              <div
                className="ml-3 -mt-0.5 px-1.5 py-0.5 rounded-[3px] text-[10px] font-medium text-white shadow-sm whitespace-nowrap"
                style={{ backgroundColor: user.color }}
              >
                {user.name}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
