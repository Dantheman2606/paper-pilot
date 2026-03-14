'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { ArrowRight, FileText, Zap, Lock, Globe } from 'lucide-react';

export default function LandingPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Animated dot grid background
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    let frame = 0;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const spacing = 40;
      const cols = Math.ceil(canvas.width / spacing);
      const rows = Math.ceil(canvas.height / spacing);

      for (let i = 0; i <= cols; i++) {
        for (let j = 0; j <= rows; j++) {
          const x = i * spacing;
          const y = j * spacing;
          const dist = Math.sqrt(
            Math.pow(x - canvas.width / 2, 2) + Math.pow(y - canvas.height / 2, 2)
          );
          const pulse = Math.sin(dist / 80 - frame / 60) * 0.5 + 0.5;
          ctx.beginPath();
          ctx.arc(x, y, 0.8, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,255,255,${pulse * 0.08})`;
          ctx.fill();
        }
      }
      frame++;
      requestAnimationFrame(animate);
    };

    animate();
    return () => window.removeEventListener('resize', resize);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col relative overflow-hidden">
      {/* Animated background */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-white rounded-sm flex items-center justify-center">
            <FileText size={14} className="text-black" />
          </div>
          <span className="font-semibold tracking-tight text-white">Paper Pilot</span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-sm text-white/50 hover:text-white transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="text-sm bg-white text-black px-4 py-2 rounded-lg font-medium hover:bg-white/90 transition-colors"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-xs text-white/50 mb-8">
          <Zap size={10} className="fill-white/50" />
          RAG-powered document intelligence
        </div>

        <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-[1.05] max-w-3xl mb-6">
          Chat with your
          <br />
          <span className="text-white/20">documents.</span>
        </h1>

        <p className="text-white/40 text-lg max-w-md mb-10 leading-relaxed">
          Paper Pilot uses retrieval-augmented generation to ground AI responses
          strictly within your documents. No hallucinations, just answers.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Link
            href="/register"
            className="group flex items-center gap-2 bg-white text-black px-6 py-3 rounded-xl font-semibold text-sm hover:bg-white/90 transition-all active:scale-95"
          >
            Start for free
            <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <Link
            href="/login"
            className="text-sm text-white/40 hover:text-white/70 transition-colors"
          >
            Already have an account →
          </Link>
        </div>

        {/* Features */}
        <div className="mt-24 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl w-full">
          {[
            {
              icon: <FileText size={16} />,
              title: 'Document Context',
              desc: 'Upload PDFs, markdown, or text files and ask questions directly.',
            },
            {
              icon: <Zap size={16} />,
              title: 'Multiple Models',
              desc: 'Switch between Gemini 1.5 Pro, GPT-4o, and more with one click.',
            },
            {
              icon: <Lock size={16} />,
              title: 'Private by Design',
              desc: 'Your documents stay local. Nothing is stored in third-party clouds.',
            },
          ].map((f) => (
            <div
              key={f.title}
              className="border border-white/5 rounded-xl p-5 bg-white/[0.02] text-left hover:bg-white/[0.04] transition-colors"
            >
              <div className="text-white/30 mb-3">{f.icon}</div>
              <h3 className="font-medium text-sm text-white mb-1">{f.title}</h3>
              <p className="text-xs text-white/30 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 px-8 py-5 flex items-center justify-between">
        <span className="text-xs text-white/20 flex items-center gap-1.5">
          <Globe size={10} /> Paper Pilot
        </span>
        <span className="text-xs text-white/20">Built with Gemini &amp; OpenAI</span>
      </footer>
    </div>
  );
}
