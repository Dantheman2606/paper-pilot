'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Square } from 'lucide-react';
import ModelSelector, { type AIModel } from './ModelSelector';

interface ChatInputProps {
    onSend: (message: string, model: AIModel) => Promise<void>;
    loading: boolean;
    onStop?: () => void;
    initialModel?: AIModel;
}

export default function ChatInput({ onSend, loading, onStop, initialModel }: ChatInputProps) {
    const [message, setMessage] = useState('');
    const [model, setModel] = useState<AIModel>(initialModel || 'gemini-1.5-flash');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-resize textarea
    useEffect(() => {
        const ta = textareaRef.current;
        if (!ta) return;
        ta.style.height = 'auto';
        ta.style.height = Math.min(ta.scrollHeight, 200) + 'px';
    }, [message]);

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        const trimmed = message.trim();
        if (!trimmed || loading) return;
        setMessage('');
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
        await onSend(trimmed, model);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <div className="px-4 pb-4 pt-2">
            <div className="max-w-3xl mx-auto">
                <form
                    onSubmit={handleSubmit}
                    className="flex flex-col gap-2 bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl p-3 focus-within:border-[#2a2a2a] transition-colors"
                >
                    <textarea
                        ref={textareaRef}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask anything about your documents… (Shift+Enter for new line)"
                        rows={1}
                        disabled={loading}
                        className="w-full bg-transparent text-white/90 placeholder:text-white/20 text-sm resize-none focus:outline-none leading-relaxed max-h-[200px] overflow-y-auto disabled:opacity-50"
                    />

                    <div className="flex items-center justify-between">
                        <ModelSelector value={model} onChange={setModel} disabled={loading} />

                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-white/20">
                                {message.length > 0 ? `${message.length}` : 'Enter to send'}
                            </span>

                            {loading ? (
                                <button
                                    type="button"
                                    onClick={onStop}
                                    className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                                >
                                    <Square size={10} className="text-white/60 fill-white/60" />
                                </button>
                            ) : (
                                <button
                                    type="submit"
                                    disabled={!message.trim()}
                                    className="w-7 h-7 rounded-lg bg-white flex items-center justify-center hover:bg-white/90 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                                >
                                    <Send size={11} className="text-black" />
                                </button>
                            )}
                        </div>
                    </div>
                </form>

                <p className="text-center text-[10px] text-white/15 mt-2">
                    AI can make mistakes. Always verify important information.
                </p>
            </div>
        </div>
    );
}
