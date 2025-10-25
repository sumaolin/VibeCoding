import './globals.css';
import type { Metadata } from 'next';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Todolist',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif' }}>
        <Providers>
          <div style={{ maxWidth: 960, margin: '0 auto', padding: 24 }}>
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
