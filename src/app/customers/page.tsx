"use client";
import { useState, useEffect } from "react";
import { db, Customer } from "../../lib/db";
import { Plus, Trash2, User, Pencil } from "lucide-react";

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  // Form State
  const [form, setForm] = useState({ name: "", phone: "", vehicle_plate: "", notes: "" });

  useEffect(() => { loadCustomers(); }, []);

  const loadCustomers = async () => {
    const list = await db.customers.toArray();
    setCustomers(list.reverse());
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = { ...form, updated_at: Date.now() };
    
    if (editingId) {
      await db.customers.update(editingId, data);
    } else {
      await db.customers.add(data);
    }
    
    resetForm();
    loadCustomers();
  };

   const handleEdit = (c: Customer) => {
    setEditingId(c.id || null);
    // Tambahkan || "" pada name dan phone
    setForm({ 
      name: c.name || "", 
      phone: c.phone || "", 
      vehicle_plate: c.vehicle_plate || "", 
      notes: c.notes || "" 
    });
    setIsFormOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm("Hapus pelanggan ini?")) {
      await db.customers.delete(id);
      loadCustomers();
    }
  };

  const resetForm = () => {
    setForm({ name: "", phone: "", vehicle_plate: "", notes: "" });
    setEditingId(null);
    setIsFormOpen(false);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2"><User className="w-6 h-6"/> Data Pelanggan</h1>
        <button onClick={() => { resetForm(); setIsFormOpen(true); }} className="bg-blue-600 text-white px-4 py-2 rounded flex gap-2">
          <Plus className="w-4 h-4"/> Tambah Pelanggan
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {customers.map(c => (
          <div key={c.id} className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-bold text-lg text-slate-800 dark:text-white">{c.name}</h3>
              <div className="flex gap-2">
                <button onClick={() => handleEdit(c)} className="text-blue-500 hover:bg-blue-50 p-1 rounded"><Pencil className="w-4 h-4"/></button>
                <button onClick={() => handleDelete(c.id!)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 className="w-4 h-4"/></button>
              </div>
            </div>
            <div className="text-sm text-slate-500 space-y-1">
              <p>📞 {c.phone}</p>
              {c.vehicle_plate && <p>🚗 {c.vehicle_plate}</p>}
              {c.notes && <p className="italic text-xs text-slate-400">{c.notes}</p>}
            </div>
          </div>
        ))}
      </div>

      {/* FORM MODAL */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl w-full max-w-md">
            <h2 className="text-lg font-bold mb-4 dark:text-white">{editingId ? "Edit" : "Tambah"} Pelanggan</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <input required placeholder="Nama Pelanggan" value={form.name} onChange={e=>setForm({...form, name: e.target.value})} className="w-full p-2 border rounded dark:bg-slate-900 dark:border-slate-700 dark:text-white" />
              <input required placeholder="No. HP / WA" value={form.phone} onChange={e=>setForm({...form, phone: e.target.value})} className="w-full p-2 border rounded dark:bg-slate-900 dark:border-slate-700 dark:text-white" />
              <input placeholder="Plat Nomor (Opsional)" value={form.vehicle_plate} onChange={e=>setForm({...form, vehicle_plate: e.target.value})} className="w-full p-2 border rounded dark:bg-slate-900 dark:border-slate-700 dark:text-white" />
              <textarea placeholder="Catatan (Opsional)" value={form.notes} onChange={e=>setForm({...form, notes: e.target.value})} className="w-full p-2 border rounded dark:bg-slate-900 dark:border-slate-700 dark:text-white" />
              
              <div className="flex gap-3">
                <button type="button" onClick={resetForm} className="flex-1 py-2 bg-slate-200 dark:bg-slate-700 rounded">Batal</button>
                <button type="submit" className="flex-1 py-2 bg-blue-600 text-white rounded">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}