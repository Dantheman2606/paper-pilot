'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FileText, Upload } from 'lucide-react';
import api from '@/lib/api';
import MessageBubble from '@/components/MessageBubble';
import ChatInput from '@/components/ChatInput';
import DocumentPanel from '@/components/DocumentPanel';
import type { AIModel } from '@/components/ModelSelector';
import toast from 'react-hot-toast';

interface Message {
    id: string;
    chat_id: string;
    role: 'user' | 'assistant';
    content: string;
    created_at: string;
}

interface Chat {
    id: string;
    title: string;
    model: string;
    updated_at: string;
}

export default function ChatPage() {
    const params = useParams();
    const router = useRouter();
    const chatId = params.id as string;

    const [chat, setChat] = useState<Chat | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetchingMessages, setFetchingMessages] = useState(true);
    const [showDocuments, setShowDocuments] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const abortRef = useRef<AbortController | null>(null);

    const scrollToBottom = useCallback(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    useEffect(() => {
        setFetchingMessages(true);
        Promise.all([api.get(`/chats/${chatId}`), api.get(`/chats/${chatId}/messages`)])
            .then(([chatRes, msgRes]) => {
                setChat(chatRes.data);
                setMessages(msgRes.data);
            })
            .catch(() => {
                toast.error('Chat not found');
                router.push('/chat');
            })
            .finally(() => setFetchingMessages(false));
    }, [chatId, router]);

    const handleSend = async (message: string, model: AIModel) => {
        // Optimistically add user message
        const userMsg: Message = {
            id: `temp-${Date.now()}`,
            chat_id: chatId,
            role: 'user',
            content: message,
            created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, userMsg]);
        setLoading(true);

        try {
            const res = await api.post('/ai/chat', { chatId, message, model });
            const assistantMsg: Message = {
                id: `temp-assistant-${Date.now()}`,
                chat_id: chatId,
                role: 'assistant',
                content: res.data.message.content,
                created_at: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, assistantMsg]);

            // Update chat title if it changed (auto-title on first message)
            if (chat?.title === 'New Chat') {
                const updatedChat = await api.get(`/chats/${chatId}`);
                setChat(updatedChat.data);
            }
        } catch (err: unknown) {
            const msg =
                (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
                'AI request failed';
            toast.error(msg);
            // Remove optimistic user message on error
            setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
        } finally {
            setLoading(false);
            abortRef.current = null;
        }
    };

    const handleStop = () => {
        abortRef.current?.abort();
        setLoading(false);
    };

    if (fetchingMessages) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-black">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#111] shrink-0 bg-[#050505]">
                <div className="flex items-center gap-3">
                    <div>
                        <h1 className="text-sm font-medium text-white truncate max-w-xs">
                            {chat?.title || 'Chat'}
                        </h1>
                        <p className="text-xs text-white/30 mt-0.5">{chat?.model}</p>
                    </div>
                </div>

                <button
                    onClick={() => setShowDocuments(!showDocuments)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                        showDocuments 
                            ? 'bg-white/10 text-white border-white/20' 
                            : 'bg-transparent text-white/50 border-transparent hover:bg-white/[0.04] hover:text-white/80'
                    }`}
                >
                    <FileText size={14} />
                    {showDocuments ? 'Back to Chat' : 'Documents'}
                </button>
            </div>

            {showDocuments ? (
                <div className="flex-1 overflow-y-auto">
                    <DocumentPanel chatId={chatId} />
                </div>
            ) : (
                <>
                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto py-4">
                        {messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center px-4 gap-4">
                                <div className="w-12 h-12 rounded-xl bg-white/5 border border-[#1a1a1a] flex items-center justify-center">
                                    <FileText size={20} className="text-white/30" />
                                </div>
                                <div>
                                    <p className="text-white/60 text-base font-medium">Start the conversation</p>
                                    <p className="text-white/30 text-sm mt-1 max-w-xs mx-auto">
                                        Upload documents to enable grounded RAG answering, or just chat.
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowDocuments(true)}
                                    className="mt-2 text-xs font-medium bg-white border border-white/10 hover:bg-white/90 text-black px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                                >
                                    <Upload size={14} />
                                    Upload Documents
                                </button>
                            </div>
                        ) : (
                    <div className="max-w-3xl mx-auto w-full space-y-1">
                        {messages.map((msg) => (
                            <MessageBubble key={msg.id} role={msg.role} content={msg.content} />
                        ))}

                        {/* Typing indicator */}
                        {loading && (
                            <div className="flex gap-3 px-4 py-2">
                                <div className="w-7 h-7 rounded-full bg-[#111] border border-[#222] flex items-center justify-center shrink-0 mt-0.5">
                                    <span className="text-white/40 text-xs">✦</span>
                                </div>
                                <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-2xl rounded-tl-sm px-4 py-3">
                                    <div className="flex gap-1 items-center">
                                        <div className="w-1.5 h-1.5 bg-white/30 rounded-full animate-bounce [animation-delay:0ms]" />
                                        <div className="w-1.5 h-1.5 bg-white/30 rounded-full animate-bounce [animation-delay:150ms]" />
                                        <div className="w-1.5 h-1.5 bg-white/30 rounded-full animate-bounce [animation-delay:300ms]" />
                                    </div>
                                </div>
                            </div>
                            )}

                            <div ref={bottomRef} />
                        </div>
                    )}
                    </div>

                    {/* Input */}
                    <ChatInput
                        onSend={handleSend}
                        loading={loading}
                        onStop={handleStop}
                        initialModel={(chat?.model as AIModel) || 'gemini-2.5-flash'}
                    />
                </>
            )}
        </div>
    );
}
