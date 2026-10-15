import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CollabFlow — Real-Time Collaborative Canvas',
  description: 'Production-grade collaborative workspace with CRDT sync and background export engine',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full">
      <body className="h-full bg-slate-950 font-sans antialiased text-slate-100 overflow-hidden">
        {children}
      </body>
    </html>
  );
}
