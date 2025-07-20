
import type { Metadata } from 'next';
// import { Inter } from 'next/font/google'; // Using <link> tags instead
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from '@/context/AuthContext';
import { cognitoUserPoolsTokenProvider } from 'aws-amplify/auth/cognito';

// Configure Amplify Gen2 Auth with localStorage
cognitoUserPoolsTokenProvider.setKeyValueStorage({
  async setItem(key: string, value: string) {
    localStorage.setItem(key, value);
  },
  async getItem(key: string) {
    return localStorage.getItem(key);
  },
  async removeItem(key: string) {
    localStorage.removeItem(key);
  },
  async clear() {
    localStorage.clear();
  },
});

// const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'AccessFlow',
  description: 'Job Management System',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
