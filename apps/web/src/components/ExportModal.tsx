'use client';

import React, { useState } from 'react';
import { X, FileCode, FileText, Image as ImageIcon, Database, CheckCircle2, Loader2, Download } from 'lucide-react';
import { useCanvasStore } from '../store/canvasStore';
import { ExportFormat } from '@collabflow/shared';

interface ExportModalProps {
  boardId: string;
}

export const ExportModal: React.FC<ExportModalProps> = ({ boardId }) => {
  const { exportModalOpen, setExportModalOpen } = useCanvasStore();
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('svg');
  const [isExporting, setIsExporting] = useState(false);
  const [exportStage, setExportStage] = useState<'idle' | 'queuing' | 'rendering' | 'ready'>('idle');
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
      desc: 'Crisp scalable vector graphic with preserved shapes & colors',
      icon: FileCode,
    },
    {
      id: 'pdf',
      label: 'PDF Document',
      desc: 'Formatted printable PDF generated server-side via pdf-lib',
      icon: FileText,
    },
    {
      id: 'png',
      label: 'PNG Image',
      desc: 'High-resolution raster graphic for presentations and slides',
      icon: ImageIcon,
    },
    {
      id: 'json',
      label: 'JSON Snapshot',
      desc: 'Raw serialized CRDT node tree for backup and versioning',
      icon: Database,
    },
  ];

  const handleStartExport = async () => {
    setIsExporting(true);
    setExportStage('queuing');
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
        throw new Error('Failed to submit export job to background queue');
      }

      const { job } = await res.json();
      setExportStage('rendering');

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
      }, 400);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 select-none relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white">Export Canvas</h3>
            <p className="text-xs text-slate-400">Processed by BullMQ background worker engine</p>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Format Selector */}
        <div className="mt-4 space-y-2">
          {formats.map((fmt) => {
            const Icon = fmt.icon;
            const isSelected = selectedFormat === fmt.id;
            return (
              <button
                key={fmt.id}
                disabled={isExporting}
                onClick={() => setSelectedFormat(fmt.id)}
                className={`w-full p-3 rounded-xl border flex items-start space-x-3 text-left transition ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-500/10 ring-1 ring-indigo-500'
                    : 'border-slate-800 hover:border-slate-700 bg-slate-800/40'
                }`}
              >
                <div
                  className={`p-2 rounded-lg ${
                    isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-white">{fmt.label}</span>
                    {isSelected && <span className="w-2 h-2 rounded-full bg-indigo-500" />}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{fmt.desc}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Error message */}
        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            {error}
          </div>
        )}

        {/* Action Button & Status */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex flex-col space-y-3">
          {exportStage === 'ready' && downloadUrl ? (
            <a
              href={downloadUrl}
              download
              onClick={handleClose}
              className="w-full py-2.5 px-4 rounded-xl font-semibold text-sm bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/20 transition"
            >
              <Download className="w-4 h-4" />
              <span>Download Exported File</span>
            </a>
          ) : (
            <button
              disabled={isExporting}
              onClick={handleStartExport}
              className="w-full py-2.5 px-4 rounded-xl font-semibold text-sm bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/30 transition"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>
                    {exportStage === 'queuing' ? 'Enqueuing Job in Redis...' : 'Worker Rendering Canvas...'}
                  </span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Generate {selectedFormat.toUpperCase()} Export</span>
                </>
              )}
            </button>
          )}

          <p className="text-[11px] text-center text-slate-500">
            Export jobs are processed asynchronously with exponential backoff & DLQ guarantees.
          </p>
        </div>
      </div>
    </div>
  );
};
