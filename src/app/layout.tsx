import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import TopNav from "../components/TopNav";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Bengkel Service Pro",
  description: "Sistem Manajemen Bengkel Offline-First",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="dark" suppressHydrationWarning>
      <body className={`${inter.className} bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-screen`}>
        {/* Menu Navigasi Global */}
        <TopNav />
        
        {/* Area Konten Halaman */}
        <main className="p-4 md:p-6">
          {children}
        </main>
      </body>
    </html>
  );
}