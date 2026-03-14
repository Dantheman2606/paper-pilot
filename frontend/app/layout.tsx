import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Paper Pilot — AI Research Assistant',
  description: 'Chat with your documents using RAG-powered AI. Supports Gemini and OpenAI models.',
  keywords: ['AI', 'RAG', 'document chat', 'research', 'Gemini', 'OpenAI'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-black text-white antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
