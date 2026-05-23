"use client";
import { useState, useEffect } from "react";
import { db, Vehicle } from "../../lib/db";
import { Plus, Search, Trash2, Pencil, Car, User, Calendar, Ruler } from "lucide-react";

export default function Vehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [form, setForm] = useState({
    plate_number: "", brand: "", model: "", year: 2024, owner_name: ""
  });

  useEffect(() => { loadVehicles(); }, []);

  const loadVehicles = async () => {
    const list = await db.vehicles.toArray();
    setVehicles(list.reverse());
  };

  const filteredVehicles = vehicles.filter(v => 
    v.plate_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.owner_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = { ...form, updated_at: Date.now() };
    
    // Format Plat Nomor menjadi Uppercase
    data.plate_number = data.plate_number.toUpperCase();

    if (editingId) {
      await db.vehicles.update(editingId, data);
    } else {
      await db.vehicles.add(data);
    }
    
    resetForm();
    loadVehicles();
  };

  const handleEdit = (v: Vehicle) => {
    setEditingId(v.id || null);
    setForm({ 
      plate_number: v.plate_number, 
      brand: v.brand, 
      model: v.model, 
      year: v.year, 
      owner_name: v.owner_name 
    });
    setIsFormOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm("Hapus data kendaraan ini?")) {
      await db.vehicles.delete(id);
      loadVehicles();
    }
  };

  const resetForm = () => {
    setForm({ plate_number: "", brand: "", model: "", year: 2024, owner_name: "" });
    setEditingId(null);
    setIsFormOpen(false);
  };

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-6 min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-800 via-gray-900 to-black text-slate-100">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
            DATABASE KENDARAAN
          </h1>
          <p className="text-slate-400 mt-1">Kelola data kendaraan & plat nomor pelanggan</p>
        </div>
        <button onClick={() => { resetForm(); setIsFormOpen(true); }} className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg transition-all font-bold">
          <Plus className="w-4 h-4" /> Tambah Kendaraan
        </button>
      </div>

      {/* SEARCH BAR */}
      <div className="bg-gray-900/50 backdrop-blur-xl border border-white/10 p-4 rounded-2xl flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-3.5 w-5 h-5 text-cyan-500" />
          <input 
            type="text" 
            placeholder="Cari plat nomor atau nama pemilik..." 
            className="w-full pl-12 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:ring-2 focus:ring-cyan-500 outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* LIST KENDARAAN (GRID) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredVehicles.map(v => (
          <div key={v.id} className="bg-gray-800/60 border border-gray-700 rounded-2xl p-5 hover:border-cyan-500/50 transition-all group">
            <div className="flex justify-between items-start mb-3">
              <div className="bg-gray-900 text-white px-3 py-1 rounded-lg font-mono font-bold text-lg border border-gray-600 group-hover:border-cyan-500 transition-colors">
                {v.plate_number}
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleEdit(v)} className="text-blue-400 hover:text-white p-2 rounded-lg hover:bg-blue-900/50"><Pencil className="w-4 h-4"/></button>
                <button onClick={() => handleDelete(v.id!)} className="text-red-400 hover:text-white p-2 rounded-lg hover:bg-red-900/50"><Trash2 className="w-4 h-4"/></button>
              </div>
            </div>

            <h3 className="font-bold text-white text-lg mb-1">{v.brand} {v.model}</h3>
            
            <div className="space-y-2 text-sm text-slate-400 mt-4">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-cyan-500" />
                <span>{v.owner_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-cyan-500" />
                <span>Tahun: {v.year}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL FORM */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl shadow-2xl w-full max-w-md p-6 border border-cyan-500/30">
            <h2 className="text-xl font-black mb-6 text-white flex items-center gap-2">
              <Car className="w-6 h-6 text-cyan-500"/> {editingId ? "Edit" : "Tambah"} Kendaraan
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Plat Nomor</label>
                <input required value={form.plate_number} onChange={e=>setForm({...form, plate_number: e.target.value.toUpperCase()})} className="w-full p-3 bg-gray-800 border border-gray-700 rounded-xl text-white font-mono text-lg focus:border-cyan-500 outline-none" placeholder="B 1234 XX" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Merek</label>
                  <input required value={form.brand} onChange={e=>setForm({...form, brand: e.target.value})} className="w-full p-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:border-cyan-500 outline-none" placeholder="Toyota" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Model</label>
                  <input required value={form.model} onChange={e=>setForm({...form, model: e.target.value})} className="w-full p-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:border-cyan-500 outline-none" placeholder="Avanza" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Tahun</label>
                  <input type="number" value={form.year} onChange={e=>setForm({...form, year: Number(e.target.value)})} className="w-full p-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:border-cyan-500 outline-none" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Nama Pemilik</label>
                  <input required value={form.owner_name} onChange={e=>setForm({...form, owner_name: e.target.value})} className="w-full p-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:border-cyan-500 outline-none" placeholder="Budi" />
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={resetForm} className="flex-1 py-3 text-slate-400 hover:text-white bg-gray-800 rounded-xl font-bold">Batal</button>
                <button type="submit" className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}