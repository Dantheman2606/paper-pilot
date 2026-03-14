'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  FileText,
  Upload,
  Trash2,
  ChevronDown,
  ChevronUp,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface Document {
  id: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  embedding_status: 'pending' | 'processing' | 'ready' | 'failed';
  chunk_count: number | null;
  created_at: string;
}

interface DocumentPanelProps {
  chatId: string;
}

interface StatusConfigItem {
  icon: React.ElementType;
  color: string;
  label: string;
  spin?: boolean;
}

const STATUS_CONFIG: Record<string, StatusConfigItem> = {
  pending:    { icon: Clock,         color: 'text-white/30', label: 'Queued' },
  processing: { icon: Loader2,       color: 'text-yellow-400', label: 'Processing', spin: true },
  ready:      { icon: CheckCircle2,  color: 'text-green-400',  label: 'Ready' },
  failed:     { icon: XCircle,       color: 'text-red-400',    label: 'Failed' },
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentPanel({ chatId }: DocumentPanelProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await api.get(`/chats/${chatId}/documents`);
      setDocuments(res.data);
    } catch {
      // silent
    }
  }, [chatId]);

  // Poll for status updates while any document is processing
  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  useEffect(() => {
    const hasProcessing = documents.some(
      (d) => d.embedding_status === 'processing' || d.embedding_status === 'pending'
    );

    if (hasProcessing && !pollRef.current) {
      pollRef.current = setInterval(fetchDocuments, 3000);
    } else if (!hasProcessing && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [documents, fetchDocuments]);

  const uploadFile = async (file: File) => {
    if (!file) return;

    const allowed = ['.pdf', '.txt', '.md'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowed.includes(ext)) {
      toast.error('Only PDF, TXT, and MD files are supported');
      return;
    }

    const maxBytes = 10 * 1024 * 1024;
    if (file.size > maxBytes) {
      toast.error('File must be under 10 MB');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post(`/chats/${chatId}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setDocuments((prev) => [res.data, ...prev]);
      toast.success(`"${file.name}" uploaded — processing…`);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Upload failed';
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  };

  const handleDelete = async (docId: string, name: string) => {
    try {
      await api.delete(`/chats/${chatId}/documents/${docId}`);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      toast.success(`"${name}" deleted`);
    } catch {
      toast.error('Failed to delete document');
    }
  };

  return (
    <div className="border-b border-[#111] bg-black shrink-0">
      {/* Panel header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2">
          <FileText size={13} className="text-white/30" />
          <span className="text-xs font-medium text-white/50">
            Documents
          </span>
          {documents.length > 0 && (
            <span className="text-[10px] bg-white/10 text-white/40 rounded-full px-1.5 py-0.5 ml-1">
              {documents.length}
            </span>
          )}
          {documents.some((d) => d.embedding_status === 'processing') && (
            <Loader2 size={10} className="text-yellow-400 animate-spin ml-1" />
          )}
        </div>
        {collapsed ? <ChevronDown size={12} className="text-white/20" /> : <ChevronUp size={12} className="text-white/20" />}
      </button>

      {!collapsed && (
        <div className="px-5 pb-3 space-y-2">
          {/* Upload area */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => !uploading && fileInputRef.current?.click()}
            className={`flex items-center justify-center gap-2 h-14 rounded-xl border border-dashed cursor-pointer transition-all ${
              dragging
                ? 'border-white/40 bg-white/[0.06]'
                : 'border-[#1f1f1f] hover:border-white/20 hover:bg-white/[0.03]'
            } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {uploading ? (
              <>
                <Loader2 size={13} className="text-white/30 animate-spin" />
                <span className="text-xs text-white/30">Uploading…</span>
              </>
            ) : (
              <>
                <Upload size={13} className="text-white/20" />
                <span className="text-xs text-white/30">
                  Drop PDF / TXT / MD or <span className="text-white/50">click</span>
                </span>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,.md"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Document list */}
          {documents.length > 0 && (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {documents.map((doc) => {
                const { icon: StatusIcon, color, label, spin } = STATUS_CONFIG[doc.embedding_status];
                return (
                  <div
                    key={doc.id}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-white/[0.02] border border-[#181818] group"
                  >
                    {/* Status icon */}
                    <StatusIcon
                      size={12}
                      className={`${color} shrink-0 ${spin ? 'animate-spin' : ''}`}
                    />

                    {/* File info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white/70 truncate">{doc.original_name}</p>
                      <p className="text-[10px] text-white/25">
                        {label}
                        {doc.embedding_status === 'ready' && doc.chunk_count
                          ? ` · ${doc.chunk_count} chunks`
                          : ''}
                        {' · '}{formatBytes(doc.size_bytes)}
                      </p>
                    </div>

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(doc.id, doc.original_name)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-white/20 hover:text-red-400 transition-all shrink-0"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {documents.length === 0 && (
            <p className="text-[10px] text-white/20 text-center pb-1">
              Upload documents to enable RAG-grounded responses.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
