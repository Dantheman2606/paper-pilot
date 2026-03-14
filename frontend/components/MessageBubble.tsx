'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, User } from 'lucide-react';

interface MessageBubbleProps {
    role: 'user' | 'assistant';
    content: string;
}

export default function MessageBubble({ role, content }: MessageBubbleProps) {
    const isUser = role === 'user';

    return (
        <div className={`flex gap-3 px-4 py-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
            {/* Avatar */}
            <div
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${isUser ? 'bg-white' : 'bg-[#111] border border-[#222]'
                    }`}
            >
                {isUser ? (
                    <User size={13} className="text-black" />
                ) : (
                    <Bot size={13} className="text-white/60" />
                )}
            </div>

            {/* Bubble */}
            <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${isUser
                        ? 'bg-white text-black rounded-tr-sm'
                        : 'bg-[#0d0d0d] border border-[#1a1a1a] text-white/90 rounded-tl-sm'
                    }`}
            >
                {isUser ? (
                    <span className="whitespace-pre-wrap">{content}</span>
                ) : (
                    <div className="prose prose-invert prose-sm max-w-none">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                                code: ({ children, className }) => {
                                    const isInline = !className;
                                    if (isInline) {
                                        return (
                                            <code className="bg-white/10 rounded px-1 py-0.5 text-xs font-mono text-white/80">
                                                {children}
                                            </code>
                                        );
                                    }
                                    return (
                                        <pre className="bg-black/60 border border-[#222] rounded-lg p-3 overflow-x-auto my-2">
                                            <code className="text-xs font-mono text-white/70">{children}</code>
                                        </pre>
                                    );
                                },
                                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
                                ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
                                li: ({ children }) => <li className="text-white/80">{children}</li>,
                                strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
                                blockquote: ({ children }) => (
                                    <blockquote className="border-l-2 border-white/20 pl-3 text-white/50 italic my-2">
                                        {children}
                                    </blockquote>
                                ),
                            }}
                        >
                            {content}
                        </ReactMarkdown>
                    </div>
                )}
            </div>
        </div>
    );
}
