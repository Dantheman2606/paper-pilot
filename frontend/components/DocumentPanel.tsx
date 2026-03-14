'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  FileText,
  Upload,
  Trash2,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  File
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
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasProcessingRef = useRef(false);

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await api.get(`/chats/${chatId}/documents`);
      setDocuments(res.data);
    } catch {
      // silent
    }
  }, [chatId]);

  hasProcessingRef.current = documents.some(
    (d) => d.embedding_status === 'processing' || d.embedding_status === 'pending'
  );

  useEffect(() => {
    fetchDocuments();
    const interval = setInterval(() => {
      if (hasProcessingRef.current) {
        fetchDocuments();
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [fetchDocuments]);

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
    <div className="flex flex-col h-full bg-black p-8 max-w-4xl mx-auto w-full animate-in fade-in duration-300">
      <div className="mb-8">
        <h2 className="text-xl font-medium text-white/90">Knowledge Base</h2>
        <p className="text-sm text-white/40 mt-1">
          Upload PDFs, Markdown, or Text files. The AI will use these documents to answer your questions.
        </p>
      </div>

      {/* Upload area */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-4 h-48 rounded-2xl border-2 border-dashed cursor-pointer transition-all mb-10 ${
          dragging
            ? 'border-white/40 bg-white/[0.06]'
            : 'border-[#1f1f1f] hover:border-white/20 hover:bg-white/[0.03]'
        } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {uploading ? (
          <>
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
              <Loader2 size={24} className="text-yellow-400 animate-spin" />
            </div>
            <span className="text-sm font-medium text-white/60">Uploading & Processing...</span>
          </>
        ) : (
          <>
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white/30">
              <Upload size={24} />
            </div>
            <div className="text-center">
              <span className="text-sm font-medium text-white/70 block">
                Click to upload or drag & drop
              </span>
              <span className="text-xs text-white/30 mt-1 block">
                Supports PDF, TXT, MD (Max 10MB)
              </span>
            </div>
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
      <div className="flex items-center gap-2 mb-4">
        <File size={16} className="text-white/40" />
        <h3 className="text-sm font-medium text-white/70">Uploaded Documents</h3>
        {documents.length > 0 && (
          <span className="text-xs bg-white/10 text-white/50 rounded-full px-2 py-0.5 ml-2">
            {documents.length}
          </span>
        )}
      </div>

      {documents.length > 0 ? (
        <div className="grid gap-3 overflow-y-auto pb-8">
          {documents.map((doc) => {
            const { icon: StatusIcon, color, label, spin } = STATUS_CONFIG[doc.embedding_status];
            return (
              <div
                key={doc.id}
                className="flex items-center gap-4 px-5 py-4 rounded-xl bg-white/[0.02] border border-[#181818] group hover:bg-white/[0.04] transition-colors"
              >
                {/* Status icon */}
                <div className="w-10 h-10 rounded-full bg-black border border-[#222] flex items-center justify-center shrink-0">
                  <StatusIcon
                    size={18}
                    className={`${color} ${spin ? 'animate-spin' : ''}`}
                  />
                </div>

                {/* File info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white/80 truncate">{doc.original_name}</p>
                  <p className="text-xs text-white/40 mt-0.5">
                    {label}
                    {doc.embedding_status === 'ready' && doc.chunk_count
                      ? ` · ${doc.chunk_count} chunk(s) indexed`
                      : ''}
                    {' · '}{formatBytes(doc.size_bytes)}
                    {' · '}{new Date(doc.created_at).toLocaleDateString()}
                  </p>
                </div>

                {/* Delete */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(doc.id, doc.original_name);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-2 text-white/30 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all shrink-0"
                  title="Delete Document"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-12 text-center border border-dashed border-[#1f1f1f] rounded-xl bg-white/[0.01]">
          <p className="text-sm text-white/40">
            No documents uploaded yet.
          </p>
        </div>
      )}
    </div>
  );
}
