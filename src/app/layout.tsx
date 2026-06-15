import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'StudyAI-Plus – Révision Intelligente',
  description: 'PWA de révision intelligente avec IA: PDF, YouTube, Drive, texte, quiz, examens et planning. Inspiré par StudyAI de lucgus11.',
  manifest: '/manifest.json',
  themeColor: '#6366f1',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'StudyAI-Plus',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        {children}
      </body>
    </html>
  );
}
