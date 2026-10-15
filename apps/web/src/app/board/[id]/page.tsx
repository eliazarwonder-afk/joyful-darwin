'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Header } from '@/components/Header';
import { Toolbar } from '@/components/Toolbar';
import { Canvas } from '@/components/Canvas';
import { StatusBar } from '@/components/StatusBar';
import { ExportModal } from '@/components/ExportModal';
import { YjsCanvasClient } from '@/lib/yjsClient';
import { useCanvasStore } from '@/store/canvasStore';
import { CanvasNode } from '@collabflow/shared';

export default function BoardPage() {
  const params = useParams();
  const boardId = (params?.id as string) || 'demo-roadmap-board';

  const [title, setTitle] = useState('Collaborative Canvas');
  const [nodes, setNodes] = useState<CanvasNode[]>([]);
  const [client, setClient] = useState<YjsCanvasClient | null>(null);

  const { setOnlineUsers, setSyncStatus } = useCanvasStore();

  const serverUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4000/ws';

  // Fetch Board Metadata
  useEffect(() => {
    fetch(`${serverUrl}/api/boards/${boardId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.board?.title) {
          setTitle(data.board.title);
        }
      })
      .catch(() => {});
  }, [boardId, serverUrl]);

  // Initialize Yjs WebSocket CRDT Client
  useEffect(() => {
    const yjsClient = new YjsCanvasClient({
      boardId,
      wsUrl,
      onNodesChange: (newNodes) => {
        setNodes(newNodes);
      },
      onAwarenessChange: (users) => {
        setOnlineUsers(users);
      },
      onStatusChange: (status) => {
        setSyncStatus(status);
      },
    });

    setClient(yjsClient);
    setNodes(yjsClient.getNodes());

    return () => {
      yjsClient.destroy();
    };
  }, [boardId, wsUrl, setOnlineUsers, setSyncStatus]);

  const handleTitleChange = async (newTitle: string) => {
    setTitle(newTitle);
    try {
      await fetch(`${serverUrl}/api/boards/${boardId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      });
    } catch (err) {
      console.error('Failed to update title:', err);
    }
  };

  return (
    <div className="relative w-screen h-screen flex flex-col bg-slate-950 overflow-hidden">
      {/* Top Header */}
      <Header
        boardId={boardId}
        initialTitle={title}
        onTitleChange={handleTitleChange}
      />

      {/* Main Interactive Canvas Area */}
      <div className="relative flex-1 w-full h-full">
        {/* Floating Left Toolbar */}
        <Toolbar
          onUndo={() => client?.undo()}
          onRedo={() => client?.redo()}
          onClear={() => client?.clearAllNodes()}
        />

        {/* Viewport & Nodes */}
        <Canvas client={client} nodes={nodes} />

        {/* Bottom Status Bar */}
        <StatusBar nodeCount={nodes.length} />
      </div>

      {/* Background Export Modal */}
      <ExportModal boardId={boardId} />
    </div>
  );
}
