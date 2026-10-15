'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Share2, Download, ChevronRight, Check } from 'lucide-react';
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
    <header className="h-12 border-b border-white/[0.08] bg-[#0A0B0D]/90 backdrop-blur-md px-3.5 flex items-center justify-between z-20 select-none">
      {/* Left: Minimal Breadcrumb & Editable Title */}
      <div className="flex items-center space-x-2">
        <Link
          href="/"
          className="flex items-center space-x-2 text-neutral-400 hover:text-white transition px-1.5 py-1 rounded"
          title="Return to workspaces"
        >
          {/* Minimalist Vector Logo */}
          <div className="w-5 h-5 rounded-[4px] bg-white flex items-center justify-center">
            <div className="w-2.5 h-2.5 bg-neutral-950 rounded-[1px]" />
          </div>
          <span className="text-xs font-semibold tracking-tight text-neutral-200">
            Collabflow
          </span>
        </Link>

        <ChevronRight className="w-3.5 h-3.5 text-neutral-600" />

        {isEditingTitle ? (
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleSubmit}
            onKeyDown={(e) => e.key === 'Enter' && handleTitleSubmit()}
            autoFocus
            className="bg-neutral-900 text-white font-medium text-xs px-2 py-0.5 rounded border border-white/20 focus:outline-none"
          />
        ) : (
          <button
            onClick={() => setIsEditingTitle(true)}
            className="text-neutral-300 font-medium text-xs hover:text-white hover:bg-white/[0.04] px-2 py-1 rounded transition text-left truncate max-w-[200px] md:max-w-[320px]"
            title="Click to rename"
          >
            {title}
          </button>
        )}

        {/* Minimal Quiet Status Dot */}
        <div className="hidden md:flex items-center space-x-1.5 pl-2 text-[11px] font-mono text-neutral-500">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              syncStatus === 'connected'
                ? 'bg-emerald-500'
                : syncStatus === 'syncing'
                ? 'bg-amber-500 animate-pulse'
                : 'bg-neutral-600'
            }`}
          />
          <span>{syncStatus === 'connected' ? `${latencyMs}ms` : syncStatus}</span>
        </div>
      </div>

      {/* Right: Presence Avatars & Clean Actions */}
      <div className="flex items-center space-x-2.5">
        {/* Collaborators */}
        <div className="flex items-center -space-x-1.5 mr-1">
          {onlineUsers.slice(0, 4).map((user) => (
            <div
              key={user.userId}
              title={`${user.name}`}
              className="w-6 h-6 rounded-full border border-[#0A0B0D] flex items-center justify-center text-[10px] font-medium text-white shadow-sm"
              style={{ backgroundColor: user.color }}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
          ))}
          {onlineUsers.length > 4 && (
            <div className="w-6 h-6 rounded-full border border-[#0A0B0D] bg-neutral-800 flex items-center justify-center text-[10px] font-medium text-neutral-300">
              +{onlineUsers.length - 4}
            </div>
          )}
        </div>

        {/* Share Button */}
        <button
          onClick={handleShare}
          className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-neutral-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5 text-neutral-400" />}
          <span>{copied ? 'Copied' : 'Share'}</span>
        </button>

        {/* Export Button - Clean Monochrome Contrast */}
        <button
          onClick={() => setExportModalOpen(true)}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-neutral-950 bg-white hover:bg-neutral-200 transition shadow-sm"
        >
          <Download className="w-3.5 h-3.5 text-neutral-900" />
          <span>Export</span>
        </button>
      </div>
    </header>
  );
};
