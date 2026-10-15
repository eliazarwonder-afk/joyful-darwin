'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Share2, Download, ArrowLeft, Check, Sparkles, Wifi, WifiOff } from 'lucide-react';
import { useCanvasStore } from '../store/canvasStore';

interface HeaderProps {
  boardId: string;
  initialTitle: string;
  onTitleChange?: (newTitle: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ boardId, initialTitle, onTitleChange }) => {
  const [title, setTitle] = useState(initialTitle);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [copied, setCopied] = useState(false);

  const { onlineUsers, syncStatus, setExportModalOpen, latencyMs } = useCanvasStore();

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    if (title.trim() && title !== initialTitle) {
      onTitleChange?.(title.trim());
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="h-14 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-4 flex items-center justify-between z-20 select-none">
      {/* Left: Navigation & Title */}
      <div className="flex items-center space-x-3">
        <Link
          href="/"
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          title="Back to Dashboard"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>

        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm tracking-tight text-white hidden sm:inline">
            CollabFlow
          </span>
        </div>

        <div className="h-4 w-px bg-slate-800 mx-1" />

        {isEditingTitle ? (
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleSubmit}
            onKeyDown={(e) => e.key === 'Enter' && handleTitleSubmit()}
            autoFocus
            className="bg-slate-800 text-white font-medium text-sm px-2 py-1 rounded border border-indigo-500 focus:outline-none"
          />
        ) : (
          <button
            onClick={() => setIsEditingTitle(true)}
            className="text-white font-medium text-sm hover:bg-slate-800/80 px-2 py-1 rounded transition text-left truncate max-w-[200px] md:max-w-[320px]"
            title="Click to rename"
          >
            {title}
          </button>
        )}

        {/* Sync Indicator */}
        <div className="hidden lg:flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-slate-800/60 border border-slate-700/50 text-xs text-slate-400">
          {syncStatus === 'connected' ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Synced ({latencyMs}ms)</span>
            </>
          ) : syncStatus === 'syncing' ? (
            <>
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span>Syncing...</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>Offline</span>
            </>
          )}
        </div>
      </div>

      {/* Right: Presence Avatars & Actions */}
      <div className="flex items-center space-x-3">
        {/* Active Collaborators */}
        <div className="flex items-center -space-x-2 mr-2">
          {onlineUsers.slice(0, 4).map((user) => (
            <div
              key={user.userId}
              title={`${user.name} (Active)`}
              className="w-7 h-7 rounded-full border-2 border-slate-900 flex items-center justify-center text-xs font-bold text-white shadow-sm transition-transform hover:scale-110 hover:z-10"
              style={{ backgroundColor: user.color }}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
          ))}
          {onlineUsers.length > 4 && (
            <div className="w-7 h-7 rounded-full border-2 border-slate-900 bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
              +{onlineUsers.length - 4}
            </div>
          )}
        </div>

        {/* Share Button */}
        <button
          onClick={handleShare}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied' : 'Share'}</span>
        </button>

        {/* Export Button */}
        <button
          onClick={() => setExportModalOpen(true)}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/30 transition"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export</span>
        </button>
      </div>
    </header>
  );
};
