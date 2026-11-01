import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MHP3rd Tactical Advisor & Wiki Agent',
  description: 'AI-powered, zero-cost hunter tactical database for Monster Hunter Portable 3rd',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full">
      <body className="bg-[#0c0e12] text-gray-100 h-full overflow-hidden flex flex-col selection:bg-amber-500/30">
        {children}
      </body>
    </html>
  );
}
