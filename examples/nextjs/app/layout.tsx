import type { Metadata } from 'next';
import { Locator } from 'click-to-agent';
import './globals.css';

export const metadata: Metadata = {
  title: 'click-to-agent — Next.js example',
  description: 'Local playground for testing click-to-agent',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        {/* Default editors: Cursor + VS Code. Pass editor={['zed']} etc. to customize. */}
        <Locator />
      </body>
    </html>
  );
}
