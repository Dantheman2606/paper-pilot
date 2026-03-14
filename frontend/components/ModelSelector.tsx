'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export type AIModel =
    | 'gemini-2.5-flash'
    | 'gemini-2.5-pro'
    | 'gemini-2.0-flash-lite'
    | 'gpt-4o-mini'
    | 'gpt-4o'
    | 'gpt-4.1-mini';

const MODELS: { value: AIModel; label: string; provider: 'gemini' | 'openai' }[] = [
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', provider: 'gemini' },
    { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', provider: 'gemini' },
    { value: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite', provider: 'gemini' },
    { value: 'gpt-4o-mini', label: 'ChatGPT GPT-4o Mini', provider: 'openai' },
    { value: 'gpt-4o', label: 'ChatGPT GPT-4o', provider: 'openai' },
    { value: 'gpt-4.1-mini', label: 'ChatGPT GPT-4.1 Mini', provider: 'openai' },
];

interface ModelSelectorProps {
    value: AIModel;
    onChange: (model: AIModel) => void;
    disabled?: boolean;
}

export default function ModelSelector({ value, onChange, disabled }: ModelSelectorProps) {
    const [open, setOpen] = useState(false);
    const current = MODELS.find((m) => m.value === value) || MODELS[0];

    return (
        <div className="relative">
            <button
                type="button"
                disabled={disabled}
                onClick={() => setOpen(!open)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10 text-xs text-white/50 hover:text-white/80 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
                <span
                    className={`w-1.5 h-1.5 rounded-full ${current.provider === 'gemini' ? 'bg-blue-400' : 'bg-green-400'
                        }`}
                />
                {current.label}
                <ChevronDown size={10} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                    <div className="absolute bottom-full mb-1 left-0 z-20 bg-[#0d0d0d] border border-[#1f1f1f] rounded-xl overflow-hidden shadow-2xl shadow-black/50 min-w-[160px]">
                        {Object.entries(
                            MODELS.reduce(
                                (acc, m) => {
                                    acc[m.provider] = acc[m.provider] || [];
                                    acc[m.provider].push(m);
                                    return acc;
                                },
                                {} as Record<string, typeof MODELS>
                            )
                        ).map(([provider, models]) => (
                            <div key={provider}>
                                <div className="px-3 py-1.5 text-[10px] text-white/20 uppercase tracking-widest border-b border-[#1a1a1a]">
                                    {provider}
                                </div>
                                {models.map((m) => (
                                    <button
                                        key={m.value}
                                        onClick={() => {
                                            onChange(m.value);
                                            setOpen(false);
                                        }}
                                        className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors ${m.value === value
                                                ? 'text-white bg-white/5'
                                                : 'text-white/50 hover:text-white hover:bg-white/[0.04]'
                                            }`}
                                    >
                                        <span
                                            className={`w-1.5 h-1.5 rounded-full ${m.provider === 'gemini' ? 'bg-blue-400' : 'bg-green-400'
                                                }`}
                                        />
                                        {m.label}
                                        {m.value === value && (
                                            <span className="ml-auto text-white/30 text-[10px]">✓</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
