import './globals.css';
import { Providers } from './providers';

export const metadata = {
  title: 'AfinityOS — Enterprise Operating System',
  description: 'AfinityOS is the AI-native enterprise platform unifying CRM, AI workforce, marketing, support, insurance, rewards and analytics in one premium workspace.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
