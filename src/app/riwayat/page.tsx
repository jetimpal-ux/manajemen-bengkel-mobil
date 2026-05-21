"use client";
import { useState, useEffect } from "react";
import { db, ServiceRecord } from "../../lib/db";
import { Search, Wrench, Calendar, User, Car, DollarSign, Filter } from "lucide-react";

export default function RiwayatServis() {
  const [records, setRecords] = useState<ServiceRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadRecords(); }, [statusFilter]);

  const loadRecords = async () => {
    setLoading(true);
    let data = await db.riwayat_servis.toArray();
    
    // Filter status
    if (statusFilter !== "all") {
      data = data.filter(r => r.status === statusFilter);
    }
    
    // Filter search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      data = data.filter(r => 
        r.customer_name.toLowerCase().includes(term) || 
        r.vehicle_plate.toLowerCase().includes(term)
      );
    }
    
    // Sort terbaru
    data.sort((a, b) => b.date - a.date);
    setRecords(data);
    setLoading(false);
  };

  const formatRupiah = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(n);
  const formatDate = (ts: number) => new Date(ts).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className="p-6 max-w-7xl mx-auto min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-800 via-gray-900 to-black text-slate-100">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-yellow-500">
            RIWAYAT SERVIS
          </h1>
          <p className="text-slate-400 mt-1">Catatan perbaikan & perawatan kendaraan pelanggan</p>
        </div>
      </div>

      {/* FILTER & SEARCH */}
      <div className="bg-gray-900/50 backdrop-blur-xl border border-white/10 p-4 rounded-2xl mb-6 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-3.5 w-5 h-5 text-orange-500" />
          <input 
            type="text" 
            placeholder="Cari nama pelanggan atau plat nomor..." 
            className="w-full pl-12 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:ring-2 focus:ring-orange-500 outline-none"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); loadRecords(); }}
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="pl-10 pr-8 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:ring-2 focus:ring-orange-500 outline-none appearance-none cursor-pointer"
          >
            <option value="all">Semua Status</option>
            <option value="completed">Selesai</option>
            <option value="in_progress">Dikerjakan</option>
          </select>
        </div>
      </div>

      {/* LOADING & EMPTY STATE */}
      {loading ? (
        <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div></div>
      ) : records.length === 0 ? (
        <div className="text-center py-20 bg-gray-900/30 rounded-2xl border border-dashed border-gray-700">
          <Wrench className="w-16 h-16 mx-auto text-slate-600 mb-4" />
          <p className="text-slate-400 text-lg">Belum ada riwayat servis.</p>
          <p className="text-slate-500 text-sm mt-2">Data akan muncul otomatis setelah transaksi di Kasir lunas.</p>
        </div>
      ) : (
        /* GRID RIWAYAT */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {records.map((rec) => (
            <div key={rec.id} className="bg-gray-800/60 border border-orange-500/20 rounded-2xl p-5 hover:border-orange-500/50 transition-all">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-white text-lg">{rec.customer_name}</h3>
                  <p className="text-xs text-slate-400 font-mono mt-1">{rec.vehicle_plate}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${rec.status === 'completed' ? 'bg-green-900/50 text-green-300' : 'bg-blue-900/50 text-blue-300'}`}>
                  {rec.status === 'completed' ? '✅ Selesai' : '🔧 Dikerjakan'}
                </span>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2 text-slate-300">
                  <Wrench className="w-4 h-4 text-orange-400" />
                  <span>{rec.service_type}</span>
                </div>
                {rec.description && (
                  <p className="text-slate-400 italic bg-gray-900/50 p-2 rounded-lg border-l-2 border-orange-500">
                    "{rec.description}"
                  </p>
                )}
                <div className="flex items-center gap-2 text-slate-400">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(rec.date)}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <DollarSign className="w-4 h-4 text-green-400" />
                  <span className="font-bold text-white text-base">{formatRupiah(rec.cost)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}