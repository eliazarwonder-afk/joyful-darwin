'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Plus,
  ArrowUpRight,
  Clock,
  Trash2,
  FileText,
  Users,
} from 'lucide-react';
import { Board } from '@collabflow/shared';

export default function DashboardPage() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [showModal, setShowModal] = useState(false);

  const serverUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  const fetchBoards = async () => {
    try {
      const res = await fetch(`${serverUrl}/api/boards`);
      if (res.ok) {
        const data = await res.json();
        setBoards(data.boards || []);
      }
    } catch {
      // Offline fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoards();
  }, []);

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const res = await fetch(`${serverUrl}/api/boards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDesc.trim() || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setBoards((prev) => [data.board, ...prev]);
        setShowModal(false);
        setNewTitle('');
        setNewDesc('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteBoard = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Delete this workspace?')) return;

    try {
      await fetch(`${serverUrl}/api/boards/${id}`, { method: 'DELETE' });
      setBoards((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-[#090A0C] text-neutral-100 flex flex-col font-sans select-none">
      {/* Minimal Navbar */}
      <header className="border-b border-white/[0.07] bg-[#090A0C]/80 backdrop-blur-md px-6 py-3.5 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center space-x-2.5">
          <div className="w-5 h-5 rounded-[4px] bg-white flex items-center justify-center">
            <div className="w-2.5 h-2.5 bg-neutral-950 rounded-[1px]" />
          </div>
          <span className="text-xs font-semibold tracking-tight text-neutral-200">
            Collabflow
          </span>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-white hover:bg-neutral-200 text-neutral-950 transition shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Canvas</span>
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-10 space-y-8">
        {/* Header Section */}
        <div className="flex items-end justify-between border-b border-white/[0.06] pb-5">
          <div>
            <h1 className="text-base font-semibold text-neutral-100">Workspaces</h1>
            <p className="text-xs text-neutral-500 mt-0.5">
              Real-time collaborative canvases with CRDT synchronization
            </p>
          </div>
          <span className="text-xs text-neutral-500 font-mono">
            {boards.length} {boards.length === 1 ? 'canvas' : 'canvases'}
          </span>
        </div>

        {/* Canvases List */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-36 rounded-xl bg-white/[0.02] border border-white/[0.06] animate-pulse"
              />
            ))}
          </div>
        ) : boards.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-white/[0.08] rounded-xl p-8 space-y-3">
            <div className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto text-neutral-400">
              <FileText className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-medium text-neutral-200">No canvases created yet</h3>
            <p className="text-[11px] text-neutral-500 max-w-xs mx-auto">
              Create a new workspace to start collaborating with real-time presence.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-white hover:bg-neutral-200 text-neutral-950 transition shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Canvas</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {boards.map((board) => (
              <Link
                key={board.id}
                href={`/board/${board.id}`}
                className="group relative bg-[#111215]/60 hover:bg-[#141519] border border-white/[0.06] hover:border-white/[0.14] rounded-xl p-4 shadow-sm transition flex flex-col justify-between"
              >
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between">
                    <h3 className="font-medium text-xs text-neutral-200 group-hover:text-white transition truncate max-w-[220px]">
                      {board.title}
                    </h3>
                    <button
                      onClick={(e) => handleDeleteBoard(e, board.id)}
                      title="Delete"
                      className="opacity-0 group-hover:opacity-100 p-1 rounded text-neutral-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-[11px] text-neutral-500 line-clamp-2 leading-relaxed">
                    {board.description || 'Infinite canvas with notes, shapes, and live sync.'}
                  </p>
                </div>

                <div className="mt-6 pt-3 border-t border-white/[0.05] flex items-center justify-between text-[11px] text-neutral-500 font-mono">
                  <div className="flex items-center space-x-1.5">
                    <Clock className="w-3 h-3 text-neutral-600" />
                    <span>{new Date(board.updatedAt).toLocaleDateString()}</span>
                  </div>

                  <div className="flex items-center space-x-1 text-neutral-400 group-hover:text-white transition">
                    <span className="text-[11px] font-sans">Open</span>
                    <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Minimal Create Board Dialog */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-100">
          <div className="w-full max-w-sm bg-[#121316] border border-white/[0.08] rounded-xl shadow-[0_16px_48px_rgba(0,0,0,0.6)] p-5 select-none">
            <h3 className="text-sm font-semibold text-neutral-100">New Canvas</h3>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              Create a workspace with real-time CRDT synchronization.
            </p>

            <form onSubmit={handleCreateBoard} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-[11px] font-medium text-neutral-400 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Architecture Sprint"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-white/[0.08] text-white text-xs focus:border-white/20 focus:outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-neutral-400 mb-1">
                  Description <span className="text-neutral-600">(Optional)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Workspace notes..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-white/[0.08] text-white text-xs focus:border-white/20 focus:outline-none resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-400 hover:text-white hover:bg-white/[0.04] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-white hover:bg-neutral-200 text-neutral-950 transition shadow-sm"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
