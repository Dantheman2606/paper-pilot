'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, FileText, Zap } from 'lucide-react';
import api from '@/lib/api';
import ChatInput from '@/components/ChatInput';
import type { AIModel } from '@/components/ModelSelector';
import toast from 'react-hot-toast';

export default function NewChatPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const handleSend = async (message: string, model: AIModel) => {
        setLoading(true);
        try {
            // Create a new chat, then send the first message
            const chatRes = await api.post('/chats', { title: 'New Chat', model });
            const chatId = chatRes.data.id;

            await api.post('/ai/chat', { chatId, message, model });
            router.push(`/chat/${chatId}`);
        } catch (err: unknown) {
            const msg =
                (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
                'Failed to create chat';
            toast.error(msg);
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-[#111] shrink-0">
                <h1 className="text-sm font-medium text-white/60">New Chat</h1>
            </div>

            {/* Empty state */}
            <div className="flex-1 flex flex-col items-center justify-center text-center px-6 gap-6">
                <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-[#1a1a1a] flex items-center justify-center">
                    <FileText size={22} className="text-white/20" />
                </div>

                <div>
                    <h2 className="text-lg font-semibold text-white mb-1">What can I help you with?</h2>
                    <p className="text-white/30 text-sm max-w-xs">
                        Ask a question to start a conversation. Upload documents to enable RAG-powered answers.
                    </p>
                </div>

                {/* Quick starter prompts */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-md w-full">
                    {[
                        { icon: <Zap size={12} />, text: 'Summarize my document' },
                        { icon: <Plus size={12} />, text: 'Compare two papers' },
                        { icon: <FileText size={12} />, text: 'Find key insights' },
                        { icon: <Zap size={12} />, text: 'Extract action items' },
                    ].map((s) => (
                        <button
                            key={s.text}
                            className="flex items-center gap-2 text-left px-3 py-2.5 rounded-xl border border-[#1a1a1a] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 text-xs text-white/40 hover:text-white/70 transition-all"
                        >
                            <span className="text-white/20">{s.icon}</span>
                            {s.text}
                        </button>
                    ))}
                </div>
            </div>

            {/* Input */}
            <ChatInput onSend={handleSend} loading={loading} />
        </div>
    );
}
