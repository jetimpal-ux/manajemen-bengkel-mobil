"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Package, Users, BarChart3, Wrench, DollarSign, CreditCard, Car, FileText, ListOrdered } from "lucide-react";

export default function TopNav() {
  const pathname = usePathname();
  const isActive = (path: string) => pathname === path;

  const navItems = [
    { href: "/", label: "Inventaris", icon: Package },
    { href: "/spk", label: "SPK", icon: FileText },
    { href: "/vehicles", label: "Kendaraan", icon: Car },
    { href: "/queue", label: "Antrian", icon: ListOrdered },
    { href: "/customers", label: "Pelanggan", icon: Users },
        { href: "/unpaid", label: "Tagihan", icon: CreditCard },
    { href: "/service-history", label: "Riwayat", icon: Wrench },
    { href: "/expenses", label: "Pengeluaran", icon: DollarSign },
    { href: "/dashboard", label: "Dashboard", icon: BarChart3 },

      ];

  return (
    <nav className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-b border-orange-500/30 sticky top-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto p-4">
        {/* Logo & Judul */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-700 rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-2xl">🔧</span>
          </div>
          <div>
            <h1 className="text-2xl font-black italic tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">
              APK Bengkel Je-Premium V.1.26
            </h1>
            <p className="text-xs text-slate-400">Maintenance - Service - Sparepart</p>
          </div>
        </div>

        {/* Menu Navigation - WRAP MODE */}
        <div className="flex flex-wrap gap-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap ${
                isActive(item.href)
                  ? "bg-orange-600 text-white shadow-lg"
                  : "bg-white/10 text-gray-300 hover:bg-white/20 hover:text-orange-400 border border-white/10"
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}