"use client";
import { useState, useEffect } from "react";
import { db, Transaction, ServiceRecord } from "../../lib/db";
import { jsPDF } from "jspdf";
import { Calendar, TrendingUp, DollarSign, Users, FileText, AlertCircle, Wrench, Download, Trash2 } from "lucide-react";
import { exportBackup, importBackup, getLastBackupTime, type BackupData } from "../../lib/backup";

export default function Dashboard() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [serviceRecords, setServiceRecords] = useState<ServiceRecord[]>([]);
  const [monthFilter, setMonthFilter] = useState(new Date().toISOString().slice(0, 7));
  const [opex, setOpex] = useState(0); 

  // 🆕 State untuk Backup & Restore
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState<string>("");
  const [lastBackupTime, setLastBackupTime] = useState<number | null>(null);

  useEffect(() => { 
    loadData();
    setLastBackupTime(getLastBackupTime());
  }, []);

  const loadData = async () => {
    const allTx = await db.transactions.toArray();
    const allServis = await db.riwayat_servis.toArray();
    
    const filteredTx = allTx.filter(t => {
      const d = new Date(t.date);
      const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return m === monthFilter;
    });
    
    setTransactions(filteredTx);
    setServiceRecords(allServis);
  };

  // --- ANALYTICS ---
  const totalRevenue = transactions.reduce((s, t) => s + t.total_amount, 0);
  const totalCost = transactions.reduce((s, t) => s + (t.total_cost || 0), 0);
  const grossProfit = totalRevenue - totalCost;
  const netProfit = grossProfit - opex;

  // Reminder Logic
  const getReminders = () => {
    const now = Date.now();
    const ninetyDays = 90 * 24 * 60 * 60 * 1000;
    const grouped: Record<string, { plate: string, lastDate: number, name: string }> = {};
    
    serviceRecords.forEach(r => {
      if (!grouped[r.vehicle_plate] || r.date > grouped[r.vehicle_plate].lastDate) {
        grouped[r.vehicle_plate] = { plate: r.vehicle_plate, lastDate: r.date, name: r.customer_name };
      }
    });

    return Object.values(grouped)
      .filter(g => (now - g.lastDate) > ninetyDays)
      .map(g => ({ ...g, daysSince: Math.floor((now - g.lastDate) / (1000 * 60 * 60 * 24)) }));
  };
  const reminders = getReminders();

  const generateReportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`Laporan Laba Rugi - ${monthFilter}`, 14, 22);
    doc.setFontSize(12);
    doc.text(`Pendapatan: Rp ${totalRevenue.toLocaleString('id-ID')}`, 14, 40);
    doc.text(`HPP (Modal Barang): Rp ${totalCost.toLocaleString('id-ID')}`, 14, 50);
    doc.text(`Laba Kotor: Rp ${grossProfit.toLocaleString('id-ID')}`, 14, 60);
    doc.text(`Biaya Operasional: Rp ${opex.toLocaleString('id-ID')}`, 14, 70);
    doc.setTextColor(0, 100, 0);
    doc.text(`LABA BERSIH: Rp ${netProfit.toLocaleString('id-ID')}`, 14, 85);
    doc.save(`Laporan_LabaRugi_${monthFilter}.pdf`);
  };

  // 🆕 FUNGSI BACKUP & RESTORE
  const handleExportBackup = async () => {
    setIsBackingUp(true);
    try {
      const backup = await exportBackup();
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_bengkel_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setLastBackupTime(backup.timestamp);
      localStorage.setItem('last_backup_timestamp', backup.timestamp.toString());
      alert("✅ Backup berhasil diunduh!");
    } catch (error) {
      console.error("Backup error:", error);
      alert("❌ Gagal membuat backup!");
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!confirm("⚠️ PERINGATAN: Restore akan MENIMPA semua data yang ada!\n\nPastikan Anda sudah backup data terbaru sebelum melanjutkan.\n\nLanjutkan restore?")) {
      e.target.value = '';
      return;
    }
    
    setIsRestoring(true);
    setRestoreMessage("");
    
    try {
      const text = await file.text();
      const backupData = JSON.parse(text) as BackupData;
      
      if (!backupData.tables || !backupData.version) {
        throw new Error("File backup tidak valid!");
      }
      
      const result = await importBackup(backupData);
      setRestoreMessage(result.message);
      
      if (result.success) {
        setTimeout(() => {
          alert("🔄 Data berhasil dipulihkan! Silakan refresh halaman.");
          window.location.reload();
        }, 1500);
      }
    } catch (error: any) {
      console.error("Restore error:", error);
      setRestoreMessage(`❌ Gagal restore: ${error.message}`);
    } finally {
      setIsRestoring(false);
      e.target.value = '';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-800 via-gray-900 to-black min-h-screen text-slate-100">
      
      {/* HEADER DASHBOARD */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <h1 className="text-3xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-yellow-500">
          DASHBOARD & LAPORAN
        </h1>
        <div className="flex gap-2 items-center">
          <input type="month" value={monthFilter} onChange={e => { setMonthFilter(e.target.value); }} className="p-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:ring-2 focus:ring-orange-500 outline-none shadow-inner" />
          <button onClick={loadData} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl shadow-[0_4px_0_rgb(30,64,175)] active:shadow-none active:translate-y-[4px] transition-all font-bold">Refresh</button>
        </div>
      </div>

      {/* 1. REMINDER SERVIS */}
      {reminders.length > 0 && (
        <div className="bg-gradient-to-r from-orange-900/40 to-gray-900 border border-orange-500/30 p-6 rounded-2xl shadow-lg backdrop-blur-md">
          <h3 className="font-bold text-orange-400 flex items-center gap-2 mb-4 text-xl">
            <AlertCircle className="w-6 h-6" /> Reminder Servis Berkala ({reminders.length} Kendaraan)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reminders.map((r, i) => (
              <div key={i} className="bg-gray-800/80 p-4 rounded-xl border border-orange-500/20 flex justify-between items-center shadow-md hover:border-orange-500 transition-colors">
                <div>
                  <p className="font-bold text-white text-lg">{r.name}</p>
                  <p className="text-xs text-slate-400 font-mono mt-1">{r.plate}</p>
                </div>
                <span className="text-sm bg-red-900/50 text-red-300 px-3 py-1 rounded-full border border-red-800 font-bold">{r.daysSince} hari lalu</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. KARTU STATISTIK (3D CARDS) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard title="Pendapatan" value={`Rp ${totalRevenue.toLocaleString('id-ID')}`} icon={<DollarSign className="text-green-500"/>} />
        <StatCard title="Laba Kotor" value={`Rp ${grossProfit.toLocaleString('id-ID')}`} icon={<TrendingUp className="text-blue-500"/>} />
        <StatCard title="Biaya Operasional" value={`Rp ${opex.toLocaleString('id-ID')}`} icon={<Wrench className="text-red-500"/>} isInput onChange={v => setOpex(v)} />
        <StatCard title="Laba Bersih" value={`Rp ${netProfit.toLocaleString('id-ID')}`} icon={<TrendingUp className={netProfit >= 0 ? "text-green-600" : "text-red-600"}/>} />
      </div>

      {/* TABEL LABA RUGI DETAIL - FULL WIDTH */}
      <div className="bg-gray-900/60 backdrop-blur-md p-6 rounded-2xl border border-orange-500/20 shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-orange-400 text-lg uppercase tracking-wider">Detail Laba Rugi</h3>
          <button onClick={generateReportPDF} className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-xl shadow-[0_4px_0_rgb(153,27,27)] active:shadow-none active:translate-y-[4px] transition-all flex gap-2 font-bold text-sm">
            <Download className="w-4 h-4"/> Download PDF
          </button>
        </div>
        <div className="space-y-4 text-sm bg-gray-800/50 p-6 rounded-xl border border-white/5">
          <Row label="Total Transaksi" value={`${transactions.length} x`} />
          <div className="h-px bg-gray-700 my-2"></div>
          <Row label="Total Pendapatan (Omzet)" value={`Rp ${totalRevenue.toLocaleString('id-ID')}`} highlight />
          <Row label="HPP (Harga Pokok Penjualan)" value={`- Rp ${totalCost.toLocaleString('id-ID')}`} />
          <Row label="Laba Kotor" value={`= Rp ${grossProfit.toLocaleString('id-ID')}`} bold />
          <div className="h-px bg-gray-700 my-2"></div>
          <Row label="Biaya Operasional" value={`- Rp ${opex.toLocaleString('id-ID')}`} />
          <div className="border-t border-orange-500/30 pt-4 mt-4">
            <Row label="LABA BERSIH" value={`Rp ${netProfit.toLocaleString('id-ID')}`} bold color={netProfit >= 0 ? "text-green-400" : "text-red-400"} size="text-2xl" />
          </div>
        </div>
      </div>

      {/* ======================================== */}
      {/* 🔐 BACKUP & RESTORE SECTION (BOTTOM) */}
      {/* ======================================== */}
      <div className="mt-12 bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-2xl p-6 border border-orange-500/20">
        <h3 className="text-xl font-black text-orange-400 mb-4 flex items-center gap-2">
          🔐 Backup & Restore Data
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* EXPORT BACKUP */}
          <div className="bg-gray-900/60 p-4 rounded-xl border border-gray-700">
            <h4 className="font-bold text-white mb-3 flex items-center gap-2">
              📤 Export Backup
            </h4>
            <p className="text-sm text-slate-400 mb-4">
              Download semua data bengkel ke file JSON untuk cadangan.
            </p>
            <button
              onClick={handleExportBackup}
              disabled={isBackingUp}
              className="w-full py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 disabled:from-gray-700 disabled:to-gray-800 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2"
            >
              {isBackingUp ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" /> Download Backup
                </>
              )}
            </button>
            <p className="text-xs text-slate-500 mt-3 text-center">
              File akan bernama: backup_bengkel_YYYY-MM-DD.json
            </p>
          </div>

          {/* IMPORT RESTORE */}
          <div className="bg-gray-900/60 p-4 rounded-xl border border-gray-700">
            <h4 className="font-bold text-white mb-3 flex items-center gap-2">
              📥 Restore Backup
            </h4>
            <p className="text-sm text-slate-400 mb-4">
              Pulihkan data dari file backup JSON. <span className="text-red-400 font-bold">⚠️ Data lama akan ditimpa!</span>
            </p>
            
            <input
              type="file"
              accept=".json"
              onChange={handleImportBackup}
              disabled={isRestoring}
              className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer disabled:opacity-50"
            />
            
            {restoreMessage && (
              <p className={`text-sm mt-3 font-bold ${restoreMessage.includes('✅') ? 'text-green-400' : 'text-red-400'}`}>
                {restoreMessage}
              </p>
            )}
          </div>
        </div>

        {/* LAST BACKUP INFO */}
        <div className="mt-6 pt-4 border-t border-gray-700 flex items-center justify-between text-sm">
          <div className="text-slate-400">
            Backup terakhir:{" "}
            <span className="text-white font-bold">
              {lastBackupTime 
                ? new Date(lastBackupTime).toLocaleString('id-ID') 
                : 'Belum pernah'}
            </span>
          </div>
          <button
            onClick={() => {
              if (confirm("Yakin ingin menghapus semua data dan mulai dari awal?")) {
                db.delete().then(() => {
                  alert("Database direset! Refresh halaman untuk mulai dari awal.");
                  window.location.reload();
                });
              }
            }}
            className="text-red-500 hover:text-red-400 font-bold text-xs flex items-center gap-1"
          >
            <Trash2 className="w-4 h-4" /> Reset Database
          </button>
        </div>
      </div>

    </div>
  );
}

function StatCard({ title, value, icon, isInput, onChange }: any) {
  return (
    <div className="bg-gray-900/60 backdrop-blur-md p-6 rounded-2xl border border-white/10 shadow-lg hover:border-orange-500/50 transition-all group">
      <div className="flex items-center gap-4 mb-4">
        <div className="p-3 bg-gray-800 rounded-xl group-hover:bg-orange-900/30 transition-colors">{icon}</div>
        <div className="flex-1">
          <p className="text-sm text-slate-400 uppercase tracking-wider font-bold">{title}</p>
          {isInput ? (
            <input type="number" placeholder="0" onChange={e => onChange(Number(e.target.value))} className="font-bold text-2xl bg-transparent border-b border-slate-600 w-full focus:outline-none text-white py-1 focus:border-orange-500" />
          ) : (
            <p className="text-2xl font-black text-white mt-1">{value}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, highlight, bold, color, size }: any) {
  return (
    <div className={`flex justify-between ${highlight ? 'bg-gray-700/30 p-3 rounded-lg' : ''}`}>
      <span className={`${bold ? "font-bold text-slate-200" : "text-slate-400"} ${size || 'text-sm'}`}>{label}</span>
      <span className={`font-medium ${bold ? "text-base" : ""} ${color || "text-slate-200"} ${size || 'text-sm'}`}>{value}</span>
    </div>
  );
}