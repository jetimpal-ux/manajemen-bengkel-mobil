"use client";
import { useNetwork } from "../hooks/useNetwork"; // Gunakan relative path yang lebih aman
import { Wifi, WifiOff } from "lucide-react";

export default function NetworkStatus() {
  const isOnline = useNetwork();
  return (
    <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg ${isOnline ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
      {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
      {isOnline ? "Online" : "Offline"}
    </div>
  );
}