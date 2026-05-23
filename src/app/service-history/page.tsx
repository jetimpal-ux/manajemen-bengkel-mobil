"use client";
import { useState, useEffect } from "react";
import { db, ServiceRecord } from "../../lib/db";
import { Plus, Search, Trash2, Pencil, Wrench, Calendar, Car, DollarSign, Clock, CheckCircle } from "lucide-react";

export default function ServiceHistory() {
  const [records, setRecords] = useState<ServiceRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("Semua");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ServiceRecord | null>(null);

  const [form, setForm] = useState({
    customer_name: "", vehicle_plate: "", service_type: "Ganti Oli",
    description: "", cost: 0, status: "Selesai"
  });

  useEffect(() => { loadRecords(); }, []);

  const loadRecords = async () => {
    const all = await db.riwayat_servis.toArray();
    setRecords(all.sort((a, b) => b.date - a.date));
  };

  const filteredRecords = records.filter(r => {
    const matchSearch = r.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        r.vehicle_plate.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = filterStatus === "Semua" || r.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = { ...form, date: editingRecord?.date || Date.now(), updated_at: Date.now() };
    if (editingRecord?.id) {
      await db.riwayat_servis.update(editingRecord.id, data);
    } else {
      await db.riwayat_servis.add(data);
    }
    resetForm();
    loadRecords();
  };

const handleEdit = (r: ServiceRecord) => {
  setEditingRecord(r);
  setForm({
    customer_name: r.customer_name || "",
    vehicle_plate: r.vehicle_plate || "",
    service_type: r.service_type || "",
    description: r.description || "",
    cost: r.cost || 0,
    status: r.status || "completed"
  });
  setIsFormOpen(true);
};

  const handleDelete = async (id: number) => {
    if (confirm("Hapus riwayat servis ini?")) {
      await db.riwayat_servis.delete(id);
      loadRecords();
    }
  };

  const resetForm = () => {
    setEditingRecord(null);
    setForm({ customer_name: "", vehicle_plate: "", service_type: "Ganti Oli", description: "", cost: 0, status: "Selesai" });
    setIsFormOpen(false);
  };

  const formatRupiah = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(n);
  const formatDate = (ts: number) => new Date(ts).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Wrench className="w-6 h-6 text-orange-500" /> Riwayat Servis
          </h1>
          <p className="text-slate-500 text-sm">Catatan perbaikan & perawatan kendaraan pelanggan</p>
        </div>
        <button onClick={() => { resetForm(); setIsFormOpen(true); }} className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow">
          <Plus className="w-4 h-4" /> Tambah Servis
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Cari nama pelanggan atau plat nomor..." className="w-full pl-10 pr-4 py-2 border rounded-lg bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:text-white" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <select className="px-4 py-2 border rounded-lg bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:text-white" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="Semua">Semua Status</option>
          <option value="Selesai">Selesai</option>
          <option value="Proses">Dalam Proses</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRecords.length === 0 ? (
          <div className="col-span-full text-center py-12 text-slate-400 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <Wrench className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Belum ada riwayat servis.</p>
          </div>
        ) : (
          filteredRecords.map(r => (
            <div key={r.id} className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition relative">
              <div className="flex justify-between items-start mb-3">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${r.status === 'Selesai' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {r.status === 'Selesai' ? <CheckCircle className="w-3 h-3 inline mr-1"/> : <Clock className="w-3 h-3 inline mr-1"/>} {r.status}
                </span>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(r)} className="text-blue-500 hover:bg-blue-50 p-1 rounded"><Pencil className="w-4 h-4"/></button>
                  <button onClick={() => handleDelete(r.id!)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 className="w-4 h-4"/></button>
                </div>
              </div>
              <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-1">{r.customer_name}</h3>
              <div className="flex items-center gap-2 text-slate-500 text-sm mb-3">
                <Car className="w-4 h-4" /> <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{r.vehicle_plate}</span>
              </div>
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-slate-400" /> {formatDate(r.date)}
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <Wrench className="w-4 h-4 text-slate-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-slate-700 dark:text-slate-200">{r.service_type}</p>
                    {r.description && <p className="text-slate-500 text-xs mt-0.5">{r.description}</p>}
                  </div>
                </div>
              </div>
              <div className="pt-3 border-t dark:border-slate-700 flex justify-between items-center">
                <span className="text-sm text-slate-500">Biaya Servis</span>
                <span className="font-bold text-slate-800 dark:text-white">{formatRupiah(r.cost)}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-700">
            <h2 className="text-lg font-bold mb-4 text-slate-800 dark:text-white flex items-center gap-2">
              {editingRecord ? <Pencil className="w-5 h-5"/> : <Plus className="w-5 h-5"/>}
              {editingRecord ? "Edit Servis" : "Tambah Servis Baru"}
            </h2>
            <form onSubmit={handleSave} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Nama Pelanggan</label>
                  <input required value={form.customer_name} onChange={e=>setForm({...form, customer_name: e.target.value})} className="w-full p-2 border rounded dark:bg-slate-900 dark:border-slate-700 dark:text-white" placeholder="Contoh: Budi" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Plat Nomor</label>
                  <input required value={form.vehicle_plate} onChange={e=>setForm({...form, vehicle_plate: e.target.value.toUpperCase()})} className="w-full p-2 border rounded dark:bg-slate-900 dark:border-slate-700 dark:text-white font-mono" placeholder="B 1234 XX" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">Jenis Servis</label>
                  <select value={form.service_type} onChange={e=>setForm({...form, service_type: e.target.value})} className="w-full p-2 border rounded dark:bg-slate-900 dark:border-slate-700 dark:text-white">
                    <option value="Ganti Oli">Ganti Oli</option>
                    <option value="Servis Berkala">Servis Berkala</option>
                    <option value="Ganti Ban">Ganti Ban</option>
                    <option value="Ganti Aki">Ganti Aki</option>
                    <option value="Spooring/Balancing">Spooring/Balancing</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">Status</label>
                  <select value={form.status} onChange={e=>setForm({...form, status: e.target.value})} className="w-full p-2 border rounded dark:bg-slate-900 dark:border-slate-700 dark:text-white">
                    <option value="Selesai">Selesai</option>
                    <option value="Proses">Dalam Proses</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Deskripsi / Catatan Teknisi</label>
                  <textarea value={form.description} onChange={e=>setForm({...form, description: e.target.value})} className="w-full p-2 border rounded dark:bg-slate-900 dark:border-slate-700 dark:text-white" rows={2} placeholder="Detail pekerjaan..."></textarea>
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Biaya Servis (Rp)</label>
                  <input required type="number" value={form.cost} onChange={e=>setForm({...form, cost: Number(e.target.value)})} className="w-full p-2 border rounded dark:bg-slate-900 dark:border-slate-700 dark:text-white" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={resetForm} className="flex-1 py-2 text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded">Batal</button>
                <button type="submit" className="flex-1 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded font-medium">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}