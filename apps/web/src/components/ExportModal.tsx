'use client';

import React, { useState } from 'react';
import { X, FileCode, FileText, Image as ImageIcon, Database, Loader2, Download, Check } from 'lucide-react';
import { useCanvasStore } from '../store/canvasStore';
import { ExportFormat } from '@collabflow/shared';

interface ExportModalProps {
  boardId: string;
}

export const ExportModal: React.FC<ExportModalProps> = ({ boardId }) => {
  const { exportModalOpen, setExportModalOpen } = useCanvasStore();
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('svg');
  const [isExporting, setIsExporting] = useState(false);
  const [exportStage, setExportStage] = useState<'idle' | 'processing' | 'ready'>('idle');
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!exportModalOpen) return null;

  const formats: Array<{
    id: ExportFormat;
    label: string;
    desc: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    {
      id: 'svg',
      label: 'SVG Vector',
      desc: 'Scalable vector graphic with preserved text and layers',
      icon: FileCode,
    },
    {
      id: 'pdf',
      label: 'PDF Document',
      desc: 'Print-ready vector document with multi-line text',
      icon: FileText,
    },
    {
      id: 'png',
      label: 'PNG Image',
      desc: 'High-resolution raster graphic',
      icon: ImageIcon,
    },
    {
      id: 'json',
      label: 'JSON Snapshot',
      desc: 'Raw node tree data for backups and version control',
      icon: Database,
    },
  ];

  const handleStartExport = async () => {
    setIsExporting(true);
    setExportStage('processing');
    setError(null);
    setDownloadUrl(null);

    try {
      const serverUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const res = await fetch(`${serverUrl}/api/boards/${boardId}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format: selectedFormat }),
      });

      if (!res.ok) {
        throw new Error('Failed to initiate export');
      }

      const { job } = await res.json();

      // Poll for job completion
      const pollInterval = setInterval(async () => {
        try {
          const pollRes = await fetch(`${serverUrl}/api/exports/${job.id}`);
          if (pollRes.ok) {
            const data = await pollRes.json();
            if (data.job.status === 'completed') {
              clearInterval(pollInterval);
              setDownloadUrl(`${serverUrl}${data.job.downloadUrl}`);
              setExportStage('ready');
              setIsExporting(false);
            } else if (data.job.status === 'failed') {
              clearInterval(pollInterval);
              setError(data.job.error || 'Export failed during rendering');
              setIsExporting(false);
              setExportStage('idle');
            }
          }
        } catch (err: any) {
          clearInterval(pollInterval);
          setError(err.message || 'Error checking export status');
          setIsExporting(false);
          setExportStage('idle');
        }
      }, 350);
    } catch (err: any) {
      setError(err.message || 'Failed to trigger export');
      setIsExporting(false);
      setExportStage('idle');
    }
  };

  const handleClose = () => {
    setExportModalOpen(false);
    setIsExporting(false);
    setExportStage('idle');
    setDownloadUrl(null);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-100">
      <div className="w-full max-w-sm bg-[#121316] border border-white/[0.08] rounded-xl shadow-[0_16px_48px_rgba(0,0,0,0.6)] p-5 select-none relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
          <div>
            <h3 className="text-sm font-semibold text-neutral-100">Export Canvas</h3>
            <p className="text-[11px] text-neutral-500">Choose file format for export</p>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded text-neutral-400 hover:text-white hover:bg-white/[0.06] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Format Selector */}
        <div className="mt-3.5 space-y-1.5">
          {formats.map((fmt) => {
            const Icon = fmt.icon;
            const isSelected = selectedFormat === fmt.id;
            return (
              <button
                key={fmt.id}
                disabled={isExporting}
                onClick={() => setSelectedFormat(fmt.id)}
                className={`w-full p-2.5 rounded-lg border flex items-center space-x-3 text-left transition ${
                  isSelected
                    ? 'border-white/20 bg-white/[0.06]'
                    : 'border-white/[0.04] hover:border-white/[0.08] hover:bg-white/[0.02]'
                }`}
              >
                <div
                  className={`p-1.5 rounded ${
                    isSelected ? 'bg-white text-neutral-950' : 'bg-white/[0.04] text-neutral-400'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-neutral-200">{fmt.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                  </div>
                  <p className="text-[11px] text-neutral-500 truncate">{fmt.desc}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Error message */}
        {error && (
          <div className="mt-3 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            {error}
          </div>
        )}

        {/* Action Button */}
        <div className="mt-5 pt-3 border-t border-white/[0.06]">
          {exportStage === 'ready' && downloadUrl ? (
            <a
              href={downloadUrl}
              download
              onClick={handleClose}
              className="w-full py-2 px-3 rounded-lg font-medium text-xs bg-white hover:bg-neutral-200 text-neutral-950 flex items-center justify-center space-x-2 transition shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download File</span>
            </a>
          ) : (
            <button
              disabled={isExporting}
              onClick={handleStartExport}
              className="w-full py-2 px-3 rounded-lg font-medium text-xs bg-white hover:bg-neutral-200 disabled:opacity-50 text-neutral-950 flex items-center justify-center space-x-2 transition shadow-sm"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Generating {selectedFormat.toUpperCase()}...</span>
                </>
              ) : (
                <span>Generate {selectedFormat.toUpperCase()}</span>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
