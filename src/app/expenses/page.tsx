"use client";
import { useState, useEffect } from "react";
import { db, Expense } from "../../lib/db";
import { Plus, Trash2, DollarSign, Calendar, TrendingDown, Wallet } from "lucide-react";

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [totalExpense, setTotalExpense] = useState(0);
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  // Filter Bulan
  const [monthFilter, setMonthFilter] = useState(new Date().toISOString().slice(0, 7));

  const [form, setForm] = useState({
    category: "Gaji Karyawan",
    description: "",
    amount: 0
  });

  useEffect(() => { loadExpenses(); }, [monthFilter]);

  const loadExpenses = async () => {
    const all = await db.expenses.toArray();
    // Filter berdasarkan bulan
    const filtered = all.filter(e => {
      const d = new Date(e.date);
      const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return m === monthFilter;
    });
    setExpenses(filtered.sort((a, b) => b.date - a.date));
    
    const total = filtered.reduce((sum, e) => sum + e.amount, 0);
    setTotalExpense(total);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await db.expenses.add({
      ...form,
      date: Date.now(),
      updated_at: Date.now()
    });
    setForm({ category: "Gaji Karyawan", description: "", amount: 0 });
    setIsFormOpen(false);
    loadExpenses();
  };

  const handleDelete = async (id: number) => {
    if (confirm("Hapus data pengeluaran ini?")) {
      await db.expenses.delete(id);
      loadExpenses();
    }
  };

  const formatRupiah = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(n);
  const formatDate = (ts: number) => new Date(ts).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="p-6 max-w-7xl mx-auto min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-800 via-gray-900 to-black text-slate-100">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-red-600">
            PENGELUARAN OPERASIONAL
          </h1>
          <p className="text-slate-400">Catat gaji, listrik, dan biaya lainnya</p>
        </div>
        <div className="flex gap-4 items-center">
           <input type="month" value={monthFilter} onChange={e => setMonthFilter(e.target.value)} className="p-2 bg-gray-800 border border-gray-700 rounded-lg text-white" />
           <button onClick={() => setIsFormOpen(true)} className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-xl shadow-[0_4px_0_rgb(153,27,27)] active:translate-y-[4px] transition-all flex items-center gap-2 font-bold">
            <Plus className="w-4 h-4" /> Tambah Pengeluaran
          </button>
        </div>
      </div>

      {/* TOTAL CARD */}
      <div className="bg-gray-900/60 backdrop-blur-md p-6 rounded-2xl border border-red-500/20 shadow-lg mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-red-900/30 rounded-xl"><TrendingDown className="w-8 h-8 text-red-500"/></div>
          <div>
            <p className="text-slate-400 text-sm font-bold uppercase">Total Pengeluaran Bulan Ini</p>
            <p className="text-3xl font-black text-white mt-1">{formatRupiah(totalExpense)}</p>
          </div>
        </div>
      </div>

      {/* TABEL PENGELUARAN */}
      <div className="bg-gray-900/60 backdrop-blur-md rounded-2xl border border-red-500/20 shadow-[0_10px_40px_rgba(0,0,0,0.5)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gradient-to-r from-red-900/50 to-gray-900 text-red-200 uppercase font-black tracking-wider">
              <tr>
                <th className="px-6 py-4">Tanggal</th>
                <th className="px-6 py-4">Kategori</th>
                <th className="px-6 py-4">Keterangan</th>
                <th className="px-6 py-4 text-right">Jumlah</th>
                <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {expenses.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500">Belum ada pengeluaran di bulan ini.</td></tr>
              ) : (
                expenses.map(exp => (
                  <tr key={exp.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 text-slate-300 font-mono">{formatDate(exp.date)}</td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-gray-800 text-slate-300 rounded-lg border border-gray-700 text-xs font-bold uppercase">
                        {exp.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400 italic">{exp.description}</td>
                    <td className="px-6 py-4 text-right font-bold text-red-400 text-lg">{formatRupiah(exp.amount)}</td>
                    <td className="px-6 py-4 text-center">
                      <button onClick={() => handleDelete(exp.id!)} className="text-red-500 hover:text-red-400 p-2 rounded-lg hover:bg-red-900/30 transition-colors"><Trash2 className="w-5 h-5"/></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL FORM */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl shadow-2xl w-full max-w-md p-6 border border-red-500/30">
            <h2 className="text-xl font-black mb-6 text-white flex items-center gap-2">
              <Wallet className="w-5 h-5 text-red-500"/> CATAT PENGELUARAN
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Kategori Pengeluaran</label>
                <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full p-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:border-red-500 outline-none">
                  <option value="Gaji Karyawan">Gaji Karyawan</option>
                  <option value="Gaji Owner">Gaji Owner (Ambil)</option>
                  <option value="Listrik & Air">Listrik & Air</option>
                  <option value="Sewa Tempat">Sewa Tempat</option>
                  <option value="Operasional Bengkel">Operasional Bengkel (Minyak, dll)</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Keterangan / Detail</label>
                <input required value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full p-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:border-red-500 outline-none" placeholder="Misal: Gaji Budi Bulan Mei" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Jumlah (Rp)</label>
                <input required type="number" value={form.amount} onChange={e => setForm({...form, amount: Number(e.target.value)})} className="w-full p-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:border-red-500 outline-none" placeholder="0" />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsFormOpen(false)} className="flex-1 py-3 text-slate-400 hover:text-white bg-gray-800 rounded-xl font-bold">Batal</button>
                <button type="submit" className="flex-1 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-bold shadow-lg shadow-red-900/50">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}