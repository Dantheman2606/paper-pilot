'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
    FileText,
    Plus,
    MessageSquare,
    Trash2,
    Pencil,
    Check,
    X,
    LogOut,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface Chat {
    id: string;
    title: string;
    model: string;
    updated_at: string;
    message_count: number;
}

export default function Sidebar() {
    const { user, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [chats, setChats] = useState<Chat[]>([]);
    const [collapsed, setCollapsed] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [loadingChats, setLoadingChats] = useState(true);

    const fetchChats = useCallback(async () => {
        try {
            const res = await api.get('/chats');
            setChats(res.data);
        } catch {
            // silent
        } finally {
            setLoadingChats(false);
        }
    }, []);

    useEffect(() => {
        fetchChats();
    }, [fetchChats, pathname]);

    const createNewChat = async () => {
        try {
            const res = await api.post('/chats', { title: 'New Chat' });
            setChats((prev) => [res.data, ...prev]);
            router.push(`/chat/${res.data.id}`);
        } catch {
            toast.error('Failed to create chat');
        }
    };

    const deleteChat = async (e: React.MouseEvent, chatId: string) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            await api.delete(`/chats/${chatId}`);
            setChats((prev) => prev.filter((c) => c.id !== chatId));
            if (pathname === `/chat/${chatId}`) {
                router.push('/chat');
            }
            toast.success('Chat deleted');
        } catch {
            toast.error('Failed to delete chat');
        }
    };

    const startEdit = (e: React.MouseEvent, chat: Chat) => {
        e.preventDefault();
        e.stopPropagation();
        setEditingId(chat.id);
        setEditTitle(chat.title);
    };

    const saveEdit = async (chatId: string) => {
        if (!editTitle.trim()) return;
        try {
            await api.put(`/chats/${chatId}`, { title: editTitle.trim() });
            setChats((prev) =>
                prev.map((c) => (c.id === chatId ? { ...c, title: editTitle.trim() } : c))
            );
            setEditingId(null);
        } catch {
            toast.error('Failed to rename chat');
        }
    };

    const cancelEdit = () => setEditingId(null);

    const activeChatId = pathname.startsWith('/chat/')
        ? pathname.split('/chat/')[1]
        : null;

    return (
        <div className="flex shrink-0">
        <aside
            className={`flex flex-col border-r border-[#111] bg-black h-screen transition-all duration-200 ${
                collapsed ? 'w-0 overflow-hidden' : 'w-64'
            } relative`}
        >

            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-4 border-b border-[#111]">
                <div className="w-6 h-6 bg-white rounded-sm flex items-center justify-center shrink-0">
                    <FileText size={11} className="text-black" />
                </div>
                <span className="font-semibold text-sm text-white truncate">Paper Pilot</span>
            </div>

            {/* New chat button */}
            <div className="p-3">
                <button
                    onClick={createNewChat}
                    id="new-chat-btn"
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-white/70 hover:text-white transition-colors group border border-transparent hover:border-white/10"
                >
                    <Plus size={14} className="shrink-0" />
                    <span>New chat</span>
                </button>
            </div>

            {/* Chat list */}
            <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
                {loadingChats ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="w-3 h-3 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                    </div>
                ) : chats.length === 0 ? (
                    <div className="text-center py-8 px-4">
                        <MessageSquare size={16} className="mx-auto mb-2 text-white/15" />
                        <p className="text-xs text-white/20">No chats yet</p>
                    </div>
                ) : (
                    chats.map((chat) => (
                        <div key={chat.id} className="group relative">
                            {editingId === chat.id ? (
                                <div className="flex items-center gap-1 px-2 py-1.5">
                                    <input
                                        autoFocus
                                        value={editTitle}
                                        onChange={(e) => setEditTitle(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') saveEdit(chat.id);
                                            if (e.key === 'Escape') cancelEdit();
                                        }}
                                        className="flex-1 bg-[#111] border border-[#333] rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-white/40"
                                    />
                                    <button
                                        onClick={() => saveEdit(chat.id)}
                                        className="text-white/60 hover:text-white p-0.5"
                                    >
                                        <Check size={12} />
                                    </button>
                                    <button onClick={cancelEdit} className="text-white/40 hover:text-white/70 p-0.5">
                                        <X size={12} />
                                    </button>
                                </div>
                            ) : (
                                <Link
                                    href={`/chat/${chat.id}`}
                                    className={`flex items-center gap-2.5 px-3 py-3 rounded-lg transition-colors ${
                                        activeChatId === chat.id
                                            ? 'bg-white/10 text-white'
                                            : 'text-white/50 hover:text-white/80 hover:bg-white/[0.06]'
                                    }`}
                                >
                                    <MessageSquare size={14} className="shrink-0 opacity-60" />
                                    <span className="truncate flex-1 text-sm">{chat.title}</span>

                                    {/* Action buttons (shown on hover) */}
                                    <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
                                        <button
                                            onClick={(e) => startEdit(e, chat)}
                                            className="p-1 rounded text-white/30 hover:text-white/70 transition-colors"
                                        >
                                            <Pencil size={10} />
                                        </button>
                                        <button
                                            onClick={(e) => deleteChat(e, chat.id)}
                                            className="p-1 rounded text-white/30 hover:text-red-400 transition-colors"
                                        >
                                            <Trash2 size={10} />
                                        </button>
                                    </div>
                                </Link>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* User footer */}
            <div className="border-t border-[#111] p-3">
                <div className="flex items-center gap-2 px-2 py-1.5">
                    <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white/60 text-xs font-medium shrink-0">
                        {user?.name?.[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-xs text-white/70 truncate font-medium">{user?.name}</div>
                        <div className="text-[10px] text-white/30 truncate">{user?.email}</div>
                    </div>
                    <button
                        onClick={logout}
                        title="Sign out"
                        className="p-1 text-white/30 hover:text-white/70 transition-colors"
                    >
                        <LogOut size={12} />
                    </button>
                </div>
            </div>
        </aside>

        {/* Toggle button — always visible outside the aside */}
        <button
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="self-start mt-5 -ml-px w-5 h-10 rounded-r-lg bg-[#111] border border-l-0 border-[#222] flex items-center justify-center text-white/30 hover:text-white/70 hover:bg-[#1a1a1a] transition-colors shrink-0 z-20"
        >
            {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
        </div>
    );
}
