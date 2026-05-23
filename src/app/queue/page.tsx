"use client";
import { useState, useEffect } from "react";
import { db, ServiceQueue as ServiceQueueType } from "../../lib/db";
import { Plus, Clock, CheckCircle, Hammer, Trash2, RefreshCw } from "lucide-react";

export default function ServiceQueueManager() {
  const [queues, setQueues] = useState<ServiceQueueType[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState({
    vehicle_plate: "",
    owner_name: "",
    service_type: "Ganti Oli",
    estimated_time: 30
  });

  useEffect(() => { loadQueue(); }, []);

  const loadQueue = async () => {
    const list = await db.service_queue.toArray();
    // Urutkan: Menunggu -> Diservis -> Selesai
    setQueues(list.sort((a, b) => a.created_at - b.created_at));
  };

  const generateQueueNumber = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const all = await db.service_queue.toArray();
    const countToday = all.filter(q => new Date(q.created_at).toISOString().slice(0, 10) === today).length + 1;
    return `Q-${String(countToday).padStart(2, '0')}`;
  };

  const handleAddQueue = async (e: React.FormEvent) => {
    e.preventDefault();
    const qNo = await generateQueueNumber();
    
    await db.service_queue.add({
      queue_number: qNo,
      vehicle_plate: form.vehicle_plate.toUpperCase(),
      owner_name: form.owner_name,
      service_type: form.service_type,
      status: 'waiting',
      estimated_time: form.estimated_time,
      created_at: Date.now(),
      updated_at: Date.now()
    });

    setIsFormOpen(false);
    setForm({ vehicle_plate: "", owner_name: "", service_type: "Ganti Oli", estimated_time: 30 });
    loadQueue();
  };

  const updateStatus = async (id: number, newStatus: string) => {
  await db.service_queue.update(id, { status: newStatus, updated_at: Date.now() } as any);
  loadQueue();
};

  const deleteQueue = async (id: number) => {
    if (confirm("Hapus antrian ini?")) {
      await db.service_queue.delete(id);
      loadQueue();
    }
  };

  // Filter status
  const waiting = queues.filter(q => q.status === 'waiting');
  const inProgress = queues.filter(q => q.status === 'in_progress');
  const finished = queues.filter(q => q.status === 'completed');

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-800 via-gray-900 to-black text-slate-100">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
            ANTRIAN SERVICE
          </h1>
          <p className="text-slate-400">Monitoring status kendaraan pelanggan secara real-time</p>
        </div>
        <div className="flex gap-3">
          <button onClick={loadQueue} className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button onClick={() => setIsFormOpen(true)} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg">
            <Plus className="w-4 h-4" /> Tambah Antrian
          </button>
        </div>
      </div>

      {/* BOARD ANTRIAN (KANBAN STYLE) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* KOLOM 1: MENUNGGU */}
        <div className="bg-gray-800/50 rounded-2xl p-4 border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-yellow-400 flex items-center gap-2">
              <Clock className="w-5 h-5" /> Menunggu ({waiting.length})
            </h2>
          </div>
          <div className="space-y-3 min-h-[200px]">
            {waiting.map(q => (
              <QueueCard 
                key={q.id} 
                q={q} 
                nextStatus="in_progress" 
                nextLabel="Mulai Service" 
                color="yellow" 
                onStatusChange={updateStatus}
                onDelete={deleteQueue} 
              />
            ))}
            {waiting.length === 0 && <EmptyState text="Tidak ada antrian" />}
          </div>
        </div>

        {/* KOLOM 2: SEDANG DISERVIS */}
        <div className="bg-gray-800/50 rounded-2xl p-4 border border-blue-900/50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-blue-400 flex items-center gap-2">
              <Hammer className="w-5 h-5" /> Diservis ({inProgress.length})
            </h2>
          </div>
          <div className="space-y-3 min-h-[200px]">
            {inProgress.map(q => (
              <QueueCard 
                key={q.id} 
                q={q} 
                nextStatus="completed" 
                nextLabel="Selesai" 
                color="blue" 
                onStatusChange={updateStatus}
                onDelete={deleteQueue} 
              />
            ))}
            {inProgress.length === 0 && <EmptyState text="Mekanik sedang idle" />}
          </div>
        </div>

        {/* KOLOM 3: SELESAI */}
        <div className="bg-gray-800/50 rounded-2xl p-4 border border-green-900/50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-green-400 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" /> Selesai ({finished.length})
            </h2>
          </div>
          <div className="space-y-3 min-h-[200px]">
            {finished.map(q => (
              <QueueCard 
                key={q.id} 
                q={q} 
                nextStatus={null} 
                nextLabel="" 
                color="green" 
                onStatusChange={updateStatus}
                onDelete={deleteQueue}
                onToCashier={() => {
                  // 👈 UPDATED: Simpan data kendaraan lengkap ke sessionStorage
                  sessionStorage.setItem('kasir_vehicle_data', JSON.stringify({
                    plate: q.vehicle_plate,
                    model: q.vehicle_plate,
                    owner: q.owner_name
                  }));
                  sessionStorage.setItem('selected_vehicle_plate', q.vehicle_plate);
                  window.location.href = '/';
                }}
              />
            ))}
            {finished.length === 0 && <EmptyState text="Belum ada selesai" />}
          </div>
        </div>

      </div>

      {/* MODAL TAMBAH ANTRIAN */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-blue-500/30 rounded-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-6 text-white">Tambah Antrian Baru</h2>
            <form onSubmit={handleAddQueue} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 uppercase">Plat Nomor</label>
                <input required value={form.vehicle_plate} onChange={e => setForm({...form, vehicle_plate: e.target.value.toUpperCase()})} className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white font-mono" placeholder="B 1234 XX" />
              </div>
              <div>
                <label className="text-xs text-slate-400 uppercase">Nama Pemilik</label>
                <input required value={form.owner_name} onChange={e => setForm({...form, owner_name: e.target.value})} className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white" placeholder="Budi Santoso" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 uppercase">Jenis Service</label>
                  <select value={form.service_type} onChange={e => setForm({...form, service_type: e.target.value})} className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white">
                    <option>Ganti Oli</option>
                    <option>Servis Ringan</option>
                    <option>Servis Besar</option>
                    <option>Spooring/Balancing</option>
                    <option>Lainnya</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 uppercase">Estimasi (Menit)</label>
                  <input type="number" value={form.estimated_time} onChange={e => setForm({...form, estimated_time: Number(e.target.value)})} className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white" />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsFormOpen(false)} className="flex-1 py-3 bg-gray-800 rounded-lg text-white">Batal</button>
                <button type="submit" className="flex-1 py-3 bg-blue-600 rounded-lg text-white font-bold">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Komponen Kartu Antrian
function QueueCard({ q, nextStatus, nextLabel, color, onStatusChange, onDelete, onToCashier }: { 
  q: ServiceQueueType, 
  nextStatus: string | null, 
  nextLabel: string, 
  color: string, 
  onStatusChange: (id: number, status: string) => void,
  onDelete: (id: number) => void,
  onToCashier?: () => void
}) {
  const colorMap: any = {
    yellow: "border-yellow-500/30 bg-yellow-900/10",
    blue: "border-blue-500/30 bg-blue-900/10",
    green: "border-green-500/30 bg-green-900/10"
  };
  
  return (
    <div className={`p-4 rounded-xl border ${colorMap[color]} hover:scale-[1.02] transition-transform`}>
      <div className="flex justify-between items-start mb-2">
        <span className="font-mono font-bold text-lg text-white">{q.queue_number}</span>
        <button onClick={() => onDelete(q.id)} className="text-slate-600 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>
      </div>
      <h3 className="font-bold text-white">{q.vehicle_plate}</h3>
      <p className="text-sm text-slate-400">{q.owner_name}</p>
      
      <div className="mt-3 flex items-center justify-between">
        <div className="text-xs text-slate-500 bg-gray-800 px-2 py-1 rounded">
          {q.service_type} • {q.estimated_time} min
        </div>
      </div>

      {/* Tombol Ubah Status (Mulai Service / Selesai) */}
      {nextStatus && onStatusChange && (
        <button 
          onClick={() => onStatusChange(q.id, nextStatus)} 
          className={`w-full mt-3 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all
            ${color === 'yellow' ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-green-600 hover:bg-green-500 text-white'}
          `}
        >
          {color === 'yellow' ? <Hammer className="w-4 h-4"/> : <CheckCircle className="w-4 h-4"/>}
          {nextLabel}
        </button>
      )}

      {/* 👈 TOMBOL BARU: Lanjut ke Kasir (Hanya muncul jika status = completed) */}
      {q.status === 'completed' && onToCashier && (
        <button 
          onClick={onToCashier}
          className="w-full mt-2 py-2 rounded-lg text-sm font-bold bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 text-white flex items-center justify-center gap-2 transition-all shadow-lg"
        >
          💰 Lanjut ke Kasir
        </button>
      )}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="text-center py-8 text-slate-600 border-2 border-dashed border-gray-800 rounded-xl">
      {text}
    </div>
  );
}