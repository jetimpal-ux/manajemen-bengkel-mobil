"use client";
import { useState, useEffect } from "react";
import { db, SPK } from "../../lib/db";
import { uploadSPKToSupabase } from "../../lib/spkSync";
import { Plus, Trash2, Save, Search, Car, Wrench, Package, ShoppingCart, Pencil, RefreshCw, CheckCircle2, Clock, FileText, Upload } from "lucide-react";

export default function SPKManager() {
  const [spkList, setSpkList] = useState<SPK[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // 🆕 Filter Status: 'pending' | 'completed' | 'all'
  const [statusFilter, setStatusFilter] = useState<'pending' | 'completed' | 'all'>('pending');

  const [form, setForm] = useState<Partial<SPK>>({
    spk_number: "",
    date: Date.now(),
    vehicle_plate: "",
    vehicle_info: "",
    owner_name: "",
    current_km: 0,
    next_km_service: 0,
    complaints: "",
    mechanic_name: "",
    services: [],
    parts: [],
    total_service_cost: 0,
    total_parts_cost: 0,
    grand_total: 0,
    status: "pending"
  });

  const [tempService, setTempService] = useState({ name: "", duration: 0, price: 0 });
  const [tempPart, setTempPart] = useState({ name: "", qty: 1, price: 0 });

  // Load SPK dari database
  const loadSPK = async () => {
    setIsLoading(true);
    try {
      // Ambil semua data dari IndexedDB
      let list = await db.spk.toArray();
      
      // Filter berdasarkan status
      if (statusFilter === 'pending') {
        list = list.filter(s => s.status === 'pending');
      } else if (statusFilter === 'completed') {
        list = list.filter(s => s.status === 'completed');
      }
      
      // Filter berdasarkan search term
      if (searchTerm) {
        const lowerTerm = searchTerm.toLowerCase();
        list = list.filter(s => 
          s.spk_number.toLowerCase().includes(lowerTerm) ||
          s.vehicle_plate.toLowerCase().includes(lowerTerm) ||
          s.owner_name.toLowerCase().includes(lowerTerm)
        );
      }
      
      // Sort berdasarkan tanggal terbaru
      list.sort((a, b) => b.date - a.date);
      
      setSpkList(list);
      console.log(`✅ Loaded ${list.length} SPK (Filter: ${statusFilter})`);
    } catch (error) {
      console.error("Error loading SPK:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Reload saat filter atau search berubah
  useEffect(() => { 
    loadSPK(); 
  }, [statusFilter, searchTerm]);

  // 🆕 Sinkronisasi dari Supabase ke Lokal
  const syncFromSupabase = async () => {
    setIsSyncing(true);
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        console.warn("⚠️ Supabase credentials tidak ditemukan");
        return;
      }

      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data, error } = await supabase
        .from('spk')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        // Hapus semua data lokal dulu
        await db.spk.clear();
        
        // Masukkan data dari Supabase ke IndexedDB
        await db.spk.bulkAdd(data);
        
        console.log(`✅ Sync berhasil: ${data.length} SPK dari Supabase`);
        loadSPK(); // Reload data
      }
    } catch (error: any) {
      console.error("❌ Error sync dari Supabase:", error.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const generateSPKNumber = async () => {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const all = await db.spk.toArray();
    const countToday = all.filter(s => s.spk_number.startsWith(`SPK-${today}`)).length + 1;
    return `SPK-${today}-${String(countToday).padStart(3, '0')}`;
  };

  // ✅ FUNGSI ADD SERVICE DENGAN FUNCTIONAL UPDATE
  const addService = () => {
    if (!tempService.name || tempService.price <= 0) return;
    
    setForm(prev => {
      const currentServices = prev.services || [];
      const newServices = [...currentServices, { ...tempService }];
      const totalService = newServices.reduce((sum, s) => sum + s.price, 0);
      
      return {
        ...prev,
        services: newServices,
        total_service_cost: totalService,
        grand_total: totalService + (prev.total_parts_cost || 0)
      };
    });
    
    setTempService({ name: "", duration: 0, price: 0 });
  };

  // ✅ FUNGSI ADD PART DENGAN FUNCTIONAL UPDATE
  const addPart = () => {
    if (!tempPart.name || tempPart.price <= 0) return;
    
    setForm(prev => {
      const currentParts = prev.parts || [];
      const newParts = [...currentParts, { ...tempPart }];
      const totalParts = newParts.reduce((sum, p) => sum + (p.price * p.qty), 0);
      
      return {
        ...prev,
        parts: newParts,
        total_parts_cost: totalParts,
        grand_total: totalParts + (prev.total_service_cost || 0)
      };
    });

    setTempPart({ name: "", qty: 1, price: 0 });
  };

  // ✅ FUNGSI REMOVE SERVICE
  const removeService = (index: number) => {
    setForm(prev => {
      const newServices = prev.services?.filter((_, i) => i !== index) || [];
      const totalService = newServices.reduce((sum, s) => sum + s.price, 0);
      
      return {
        ...prev,
        services: newServices,
        total_service_cost: totalService,
        grand_total: totalService + (prev.total_parts_cost || 0)
      };
    });
  };

  // ✅ FUNGSI REMOVE PART
  const removePart = (index: number) => {
    setForm(prev => {
      const newParts = prev.parts?.filter((_, i) => i !== index) || [];
      const totalParts = newParts.reduce((sum, p) => sum + (p.price * p.qty), 0);
      
      return {
        ...prev,
        parts: newParts,
        total_parts_cost: totalParts,
        grand_total: totalParts + (prev.total_service_cost || 0)
      };
    });
  };

  // 🆕 FUNGSI EDIT SPK
  const handleEdit = (spk: SPK) => {
    setEditingId(spk.id!);
    setForm({
      spk_number: spk.spk_number,
      date: spk.date,
      vehicle_plate: spk.vehicle_plate,
      vehicle_info: spk.vehicle_info,
      owner_name: spk.owner_name,
      current_km: spk.current_km,
      next_km_service: spk.next_km_service,
      complaints: spk.complaints,
      mechanic_name: spk.mechanic_name,
      services: spk.services || [],
      parts: spk.parts || [],
      total_service_cost: spk.total_service_cost,
      total_parts_cost: spk.total_parts_cost,
      grand_total: spk.grand_total,
      status: spk.status
    });
    setIsFormOpen(true);
  };

  // 🆕 FUNGSI BATAL EDIT
  const handleCancelEdit = () => {
    setEditingId(null);
    resetForm();
  };

  // ✅ FUNGSI SAVE SPK BARU (dengan sync ke Supabase)
  const handleSaveSPK = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validasi
    if ((!form.services || form.services.length === 0) && 
        (!form.parts || form.parts.length === 0)) {
      alert("⚠️ Tambahkan minimal 1 jasa servis atau 1 sparepart!");
      return;
    }
    
    const spkNumber = form.spk_number || await generateSPKNumber();
    
    const spkData: SPK = {
      spk_number: spkNumber,
      date: form.date || Date.now(),
      vehicle_plate: form.vehicle_plate || "",
      vehicle_info: form.vehicle_info || "",
      owner_name: form.owner_name || "",
      current_km: form.current_km || 0,
      next_km_service: form.next_km_service || 0,
      complaints: form.complaints || "",
      mechanic_name: form.mechanic_name || "",
      services: form.services || [],
      parts: form.parts || [],
      total_service_cost: form.total_service_cost || 0,
      total_parts_cost: form.total_parts_cost || 0,
      grand_total: form.grand_total || 0,
      status: form.status || "pending",
      created_at: Date.now(),
      updated_at: Date.now()
    };
    
    try {
      // 1. Simpan ke IndexedDB
      const id = await db.spk.add(spkData);
      
      // 2. Sync ke Supabase
      const syncResult = await uploadSPKToSupabase(spkData);
      if (!syncResult.success) {
        console.warn("⚠️ Gagal sync ke Supabase, data tetap tersimpan lokal");
      }
      
      alert(`SPK ${spkNumber} berhasil disimpan!\n✅ Tersimpan lokal & cloud`);
      resetForm();
      loadSPK();
    } catch (error: any) {
      console.error("❌ Error menyimpan SPK:", error);
      alert("Gagal menyimpan SPK: " + error.message);
    }
  };

  // 🆕 FUNGSI UPDATE SPK
  const handleUpdateSPK = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingId) return;
    
    // Validasi
    if ((!form.services || form.services.length === 0) && 
        (!form.parts || form.parts.length === 0)) {
      alert("⚠️ Tambahkan minimal 1 jasa servis atau 1 sparepart!");
      return;
    }
    
    const updateData = {
      ...form,
      services: form.services || [],
      parts: form.parts || [],
      updated_at: Date.now()
    } as SPK;
    
    try {
      // 1. Update di IndexedDB
      await db.spk.update(editingId, updateData);
      
      // 2. Sync ke Supabase
      const syncResult = await uploadSPKToSupabase(updateData);
      if (!syncResult.success) {
        console.warn("⚠️ Gagal sync ke Supabase");
      }
      
      alert(`SPK ${form.spk_number} berhasil diupdate!\n✅ Tersimpan lokal & cloud`);
      setEditingId(null);
      resetForm();
      loadSPK();
    } catch (error: any) {
      console.error("❌ Error update SPK:", error);
      alert("Gagal update SPK: " + error.message);
    }

    // 🆕 FUNGSI UPDATE SPK
const handleUpdateSPK = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!editingId) return;
  
  // Validasi
  if ((!form.services || form.services.length === 0) && 
      (!form.parts || form.parts.length === 0)) {
    alert("⚠️ Tambahkan minimal 1 jasa servis atau 1 sparepart!");
    return;
  }
  
  const updateData = {
    ...form,
    services: form.services || [],
    parts: form.parts || [],
    updated_at: Date.now()
  } as SPK;
  
  try {
    // 1. Update di IndexedDB
    await db.spk.update(editingId, updateData);
    
    // 2. 🆕 AUTO-CREATE RIWAYAT SERVIS jika status berubah ke 'completed'
    if (updateData.status === 'completed') {
      const existingRiwayat = await db.riwayat_servis
        .where('spk_id')
        .equals(editingId)
        .first();
      
      if (!existingRiwayat) {
        // Buat catatan riwayat servis baru
        await db.riwayat_servis.add({
          spk_id: editingId,
          customer_name: updateData.owner_name,
          vehicle_plate: updateData.vehicle_plate,
          service_type: 'Servis Berkala',
          description: updateData.complaints,
          date: updateData.date,
          cost: updateData.grand_total,
          status: 'completed',
          updated_at: Date.now()
        });
        
        console.log('✅ Riwayat servis otomatis dibuat untuk SPK:', updateData.spk_number);
      }
    }
    
    // 3. Sync ke Supabase
    const syncResult = await uploadSPKToSupabase(updateData);
    if (!syncResult.success) {
      console.warn("⚠️ Gagal sync ke Supabase");
    }
    
    alert(`SPK ${form.spk_number} berhasil diupdate!\n✅ Tersimpan lokal & cloud`);
    setEditingId(null);
    resetForm();
    loadSPK();
  } catch (error: any) {
    console.error("❌ Error update SPK:", error);
    alert("Gagal update SPK: " + error.message);
  }
};
  };

  // 🆕 FUNGSI HAPUS SPK
  const handleDeleteSPK = async (id: number, spkNumber: string) => {
    if (!confirm(`Yakin hapus SPK ${spkNumber}?`)) return;
    
    try {
      await db.spk.delete(id);
      
      // Hapus juga dari Supabase
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        await supabase.from('spk').delete().eq('id', id);
      }
      
      alert(`SPK ${spkNumber} berhasil dihapus`);
      loadSPK();
    } catch (error: any) {
      console.error("Error deleting SPK:", error);
      alert("Gagal hapus SPK: " + error.message);
    }
  };

  const resetForm = () => {
    setForm({
      spk_number: "",
      date: Date.now(),
      vehicle_plate: "",
      vehicle_info: "",
      owner_name: "",
      current_km: 0,
      next_km_service: 0,
      complaints: "",
      mechanic_name: "",
      services: [],
      parts: [],
      total_service_cost: 0,
      total_parts_cost: 0,
      grand_total: 0,
      status: "pending"
    });
    setIsFormOpen(false);
  };

  // 🆕 FUNGSI MANUAL SYNC KE SUPABASE
  const handleManualSync = async () => {
    setIsSyncing(true);
    const allSPKs = await db.spk.toArray();
    
    let successCount = 0;
    for (const spk of allSPKs) {
      const result = await uploadSPKToSupabase(spk);
      if (result.success) successCount++;
    }
    
    if (successCount > 0) {
      alert(`✅ Sync berhasil!\n${successCount} dari ${allSPKs.length} SPK di-upload ke cloud`);
    } else {
      alert("⚠️ Tidak ada SPK yang di-sync atau terjadi error");
    }
    
    setIsSyncing(false);
  };

  // 🆕 FUNGSI KIRIM KE KASIR
  const handleSendToCashier = (spk: SPK) => {
    const cartItems: any[] = [];
    
    // 1. Masukkan Jasa Servis
    if (spk.services && spk.services.length > 0) {
      spk.services.forEach((s, idx) => {
        cartItems.push({
          id: -Date.now() - idx,
          sku: "JASA",
          name: `[Jasa] ${s.name}`,
          category: "Service",
          stock: 999,
          buy_price: 0,
          sell_price: s.price,
          qty: 1,
          updated_at: Date.now()
        });
      });
    }

    // 2. Masukkan Sparepart
    if (spk.parts && spk.parts.length > 0) {
      spk.parts.forEach((p, idx) => {
        cartItems.push({
          id: -Date.now() - 1000 - idx, 
          sku: "PART",
          name: p.name,
          category: "Sparepart",
          stock: 999,
          buy_price: 0,
          sell_price: p.price,
          qty: p.qty || 1,
          updated_at: Date.now()
        });
      });
    }

    if (cartItems.length === 0) {
      alert("⚠️ Tidak ada item di SPK ini! Tambahkan jasa atau sparepart dulu.");
      return;
    }

    // Simpan ke Session Storage
    sessionStorage.setItem('spk_cart_data', JSON.stringify(cartItems));
    sessionStorage.setItem('kasir_vehicle_data', JSON.stringify({
      plate: spk.vehicle_plate,
      owner: spk.owner_name,
      model: spk.vehicle_info
    }));
    
    // Redirect ke Halaman Utama (Kasir)
    window.location.href = '/';
  };

  const formatRupiah = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(n);

  return (
    <div className="p-6 max-w-7xl mx-auto min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-800 via-gray-900 to-black text-slate-100">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
            SURAT PERINTAH KERJA (SPK)
          </h1>
          <p className="text-slate-400 mt-1">Dokumen resmi pekerjaan bengkel</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {/* 🆕 TOMBOL REFRESH DARI CLOUD */}
          <button 
            onClick={syncFromSupabase} 
            disabled={isSyncing}
            className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 text-white px-4 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all"
          >
            {isSyncing ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <RefreshCw className="w-5 h-5" />
            )}
            {isSyncing ? 'Syncing...' : 'Refresh Cloud'}
          </button>

          {/* TOMBOL SYNC UPLOAD */}
          <button 
            onClick={handleManualSync} 
            disabled={isSyncing}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-600 text-white px-4 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all"
          >
            <Upload className="w-5 h-5" />
            Sync Cloud
          </button>
          
          <button onClick={() => setIsFormOpen(true)} className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg font-bold">
            <Plus className="w-5 h-5" /> Buat SPK Baru
          </button>
        </div>
      </div>

      {/* FILTER & SEARCH */}
      <div className="bg-gray-900/50 backdrop-blur-xl border border-white/10 p-4 rounded-2xl mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-3.5 w-5 h-5 text-purple-500" />
            <input 
              type="text" 
              placeholder="Cari nomor SPK, plat nomor, atau nama pelanggan..." 
              className="w-full pl-12 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:ring-2 focus:ring-purple-500 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {/* Filter Status Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setStatusFilter('pending')}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl font-bold transition-all ${
                statusFilter === 'pending' 
                  ? 'bg-yellow-600 text-white shadow-lg' 
                  : 'bg-gray-800 text-slate-400 hover:bg-gray-700'
              }`}
            >
              <Clock className="w-4 h-4" /> Pending
            </button>
            <button
              onClick={() => setStatusFilter('completed')}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl font-bold transition-all ${
                statusFilter === 'completed' 
                  ? 'bg-green-600 text-white shadow-lg' 
                  : 'bg-gray-800 text-slate-400 hover:bg-gray-700'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" /> Selesai
            </button>
            <button
              onClick={() => setStatusFilter('all')}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl font-bold transition-all ${
                statusFilter === 'all' 
                  ? 'bg-purple-600 text-white shadow-lg' 
                  : 'bg-gray-800 text-slate-400 hover:bg-gray-700'
              }`}
            >
              <FileText className="w-4 h-4" /> Semua
            </button>
          </div>
        </div>
      </div>

      {/* LOADING STATE */}
      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : spkList.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg">Tidak ada data SPK</p>
          <p className="text-sm mt-2">
            {statusFilter === 'pending' ? 'Belum ada SPK pending' : 
             statusFilter === 'completed' ? 'Belum ada SPK selesai' : 'Belum ada SPK'}
          </p>
        </div>
      ) : (
        /* LIST SPK */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {spkList.map(spk => (
            <div key={spk.id} className="bg-gray-800/60 border border-purple-500/20 rounded-2xl p-6 hover:border-purple-500/50 transition-all">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-lg text-white">{spk.spk_number}</h3>
                  <p className="text-xs text-slate-400">{new Date(spk.date).toLocaleDateString('id-ID')}</p>
                </div>
                <div className="flex gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    spk.status === 'completed' ? 'bg-green-900/50 text-green-300' :
                    spk.status === 'in_progress' ? 'bg-blue-900/50 text-blue-300' :
                    'bg-yellow-900/50 text-yellow-300'
                  }`}>
                    {spk.status === 'completed' ? '✅ Selesai' : spk.status === 'in_progress' ? '🔧 Dikerjakan' : '⏳ Pending'}
                  </span>
                  
                  {/* TOMBOL EDIT */}
                  <button 
                    onClick={() => handleEdit(spk)}
                    className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all"
                    title="Edit SPK"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  
                  {/* TOMBOL HAPUS */}
                  <button 
                    onClick={() => handleDeleteSPK(spk.id!, spk.spk_number)}
                    className="p-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-all"
                    title="Hapus SPK"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-sm mb-4">
                <div className="flex items-center gap-2 text-slate-300">
                  <Car className="w-4 h-4 text-purple-400" />
                  <span className="font-mono">{spk.vehicle_plate}</span>
                </div>
                <div className="text-slate-400">{spk.owner_name}</div>
                <div className="text-slate-400">KM: {spk.current_km.toLocaleString('id-ID')}</div>
              </div>

              <div className="border-t border-gray-700 pt-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Jasa Servis</span>
                  <span className="text-white">{formatRupiah(spk.total_service_cost)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Sparepart</span>
                  <span className="text-white">{formatRupiah(spk.total_parts_cost)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-700">
                  <span className="text-purple-400">TOTAL</span>
                  <span className="text-white">{formatRupiah(spk.grand_total)}</span>
                </div>

                {/* TOMBOL LANJUT KE KASIR (Hanya muncul jika status pending) */}
                {spk.status === 'pending' && (
                  <button 
                    onClick={() => handleSendToCashier(spk)}
                    className="w-full mt-4 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white py-2 rounded-lg font-bold flex items-center justify-center gap-2 transition-all"
                  >
                    <ShoppingCart className="w-4 h-4" /> Lanjut ke Kasir
                  </button>
                )}
                
                {/* Status Selesai Badge */}
                {spk.status === 'completed' && (
                  <div className="w-full mt-4 bg-green-900/30 border border-green-500/30 text-green-300 py-2 rounded-lg font-bold flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Sudah Dibayar
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL FORM SPK */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50">
          <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-purple-500/30 my-4">
            <div className="sticky top-0 bg-gradient-to-br from-gray-900 to-black p-4 sm:p-6 border-b border-purple-500/30 z-10 flex justify-between items-center">
              <h2 className="text-lg sm:text-2xl font-black text-white flex items-center gap-2">
                <Wrench className="w-5 h-5 sm:w-6 sm:h-6 text-purple-500" /> {editingId ? 'Edit SPK' : 'Buat SPK Baru'}
              </h2>
              <button onClick={editingId ? handleCancelEdit : resetForm} className="text-slate-400 hover:text-white p-2"><Trash2 className="w-6 h-6"/></button>
            </div>

            <form onSubmit={editingId ? handleUpdateSPK : handleSaveSPK} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              {/* INFO KENDARAAN */}
              <div className="bg-gray-800/50 p-3 sm:p-4 rounded-xl border border-gray-700">
                <h3 className="font-bold text-purple-400 mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
                  <Car className="w-4 h-4 sm:w-5 sm:h-5" /> Informasi Kendaraan
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 uppercase block mb-1">Plat Nomor</label>
                    <input required value={form.vehicle_plate} onChange={e => setForm({...form, vehicle_plate: e.target.value.toUpperCase()})} className="w-full p-2 sm:p-3 bg-gray-900 border border-gray-700 rounded-lg text-white font-mono text-sm" placeholder="B 1234 XX" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 uppercase block mb-1">Nama Pemilik</label>
                    <input required value={form.owner_name} onChange={e => setForm({...form, owner_name: e.target.value})} className="w-full p-2 sm:p-3 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm" placeholder="Budi Santoso" />
                  </div>
                  <div className="sm:col-span-2 lg:col-span-1">
                    <label className="text-xs text-slate-400 uppercase block mb-1">Model Kendaraan</label>
                    <input value={form.vehicle_info} onChange={e => setForm({...form, vehicle_info: e.target.value})} className="w-full p-2 sm:p-3 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm" placeholder="Toyota Avanza" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 uppercase block mb-1">KM Sekarang</label>
                    <input type="number" value={form.current_km} onChange={e => setForm({...form, current_km: Number(e.target.value)})} className="w-full p-2 sm:p-3 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm" placeholder="50000" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 uppercase block mb-1">KM Servis Berikutnya</label>
                    <input type="number" value={form.next_km_service} onChange={e => setForm({...form, next_km_service: Number(e.target.value)})} className="w-full p-2 sm:p-3 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm" placeholder="55000" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 uppercase block mb-1">Mekanik</label>
                    <input value={form.mechanic_name} onChange={e => setForm({...form, mechanic_name: e.target.value})} className="w-full p-2 sm:p-3 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm" placeholder="Ahmad" />
                  </div>
                </div>
              </div>

              {/* KELUHAN */}
              <div>
                <label className="text-xs text-slate-400 uppercase block mb-2">Keluhan / Keterangan</label>
                <textarea value={form.complaints} onChange={e => setForm({...form, complaints: e.target.value})} rows={3} className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm" placeholder="Mesin berbunyi kasar, oli sudah hitam..." />
              </div>

              {/* JASA SERVIS */}
              <div className="bg-gray-800/50 p-3 sm:p-4 rounded-xl border border-gray-700">
                <h3 className="font-bold text-blue-400 mb-3 flex items-center gap-2 text-sm sm:text-base">
                  <Wrench className="w-4 h-4" /> Jasa Servis
                </h3>
                <div className="space-y-2 mb-3">
                  <input value={tempService.name} onChange={e => setTempService({...tempService, name: e.target.value})} className="w-full p-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm" placeholder="Nama Jasa" />
                  <div className="grid grid-cols-2 gap-2">
                    <input type="number" value={tempService.duration} onChange={e => setTempService({...tempService, duration: Number(e.target.value)})} className="p-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm" placeholder="Durasi (mnt)" />
                    <input type="number" value={tempService.price} onChange={e => setTempService({...tempService, price: Number(e.target.value)})} className="p-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm" placeholder="Harga" />
                  </div>
                  <button type="button" onClick={addService} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg font-bold text-sm">+ Tambah Jasa</button>
                </div>
                {form.services?.map((s, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2 bg-gray-900/50 rounded-lg mb-2">
                    <div className="flex-1">
                      <div className="text-white text-sm font-bold">{s.name}</div>
                      <div className="text-xs text-slate-400">{s.duration} menit</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-white font-bold text-sm">{formatRupiah(s.price)}</div>
                      <button type="button" onClick={() => removeService(idx)} className="text-red-500 hover:text-red-400 p-1"><Trash2 className="w-4 h-4"/></button>
                    </div>
                  </div>
                ))}
              </div>

              {/* SPAREPART */}
              <div className="bg-gray-800/50 p-3 sm:p-4 rounded-xl border border-gray-700">
                <h3 className="font-bold text-green-400 mb-3 flex items-center gap-2 text-sm sm:text-base">
                  <Package className="w-4 h-4" /> Sparepart
                </h3>
                <div className="space-y-2 mb-3">
                  <input value={tempPart.name} onChange={e => setTempPart({...tempPart, name: e.target.value})} className="w-full p-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm" placeholder="Nama Part" />
                  <div className="grid grid-cols-2 gap-2">
                    <input type="number" value={tempPart.qty} onChange={e => setTempPart({...tempPart, qty: Number(e.target.value)})} className="p-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm" placeholder="Qty" />
                    <input type="number" value={tempPart.price} onChange={e => setTempPart({...tempPart, price: Number(e.target.value)})} className="p-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm" placeholder="Harga" />
                  </div>
                  <button type="button" onClick={addPart} className="w-full bg-green-600 hover:bg-green-500 text-white py-2 rounded-lg font-bold text-sm">+ Tambah Part</button>
                </div>
                {form.parts?.map((p, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2 bg-gray-900/50 rounded-lg mb-2">
                    <div className="flex-1">
                      <div className="text-white text-sm font-bold">{p.name} x{p.qty}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-white font-bold text-sm">{formatRupiah(p.price * p.qty)}</div>
                      <button type="button" onClick={() => removePart(idx)} className="text-red-500 hover:text-red-400 p-1"><Trash2 className="w-4 h-4"/></button>
                    </div>
                  </div>
                ))}
              </div>

              {/* TOTAL */}
              <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 p-4 rounded-xl border border-purple-500/30">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
                  <div className="text-slate-300 text-sm text-center sm:text-left">
                    <div>Jasa Servis: {formatRupiah(form.total_service_cost || 0)}</div>
                    <div>Sparepart: {formatRupiah(form.total_parts_cost || 0)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-slate-400 text-xs">TOTAL ESTIMASI</div>
                    <div className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                      {formatRupiah(form.grand_total || 0)}
                    </div>
                  </div>
                </div>
              </div>

              {/* TOMBOL AKSI */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-700 sticky bottom-0 bg-gray-900/90 p-2 -mx-2 sm:mx-0 sm:p-0 sm:bg-transparent sm:static sm:border-0">
                <button type="button" onClick={editingId ? handleCancelEdit : resetForm} className="flex-1 py-3 bg-gray-800 text-white rounded-xl font-bold hover:bg-gray-700 transition-all text-sm sm:text-base">
                  {editingId ? 'Batal Edit' : 'Batal'}
                </button>
                <button type="submit" className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold hover:from-purple-500 hover:to-pink-500 transition-all flex items-center justify-center gap-2 text-sm sm:text-base">
                  <Save className="w-5 h-5" /> {editingId ? 'Update SPK' : 'Simpan SPK'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}