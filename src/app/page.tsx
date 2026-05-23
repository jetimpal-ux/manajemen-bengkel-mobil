"use client";
import Link from 'next/link';
import { useState, useEffect, useRef } from "react";
import { db, Item } from "../lib/db";
import { exportBackup, importBackup, getLastBackupTime } from "../lib/backup";
import { getBengkelConfig, updateBengkelConfig, uploadLogo } from "../lib/bengkelConfig";
import { BengkelConfig } from "../lib/db";
import { Plus, Trash2, Package, RefreshCw, Pencil, Search, FileSpreadsheet, AlertTriangle, ShoppingCart, Camera, X, Check, Printer, Save, Clock, DollarSign, Settings, Upload, TrendingUp, FileText } from "lucide-react";
import { jsPDF } from "jspdf";
type CartItem = Item & { qty: number };

export default function Home() {
  const [items, setItems] = useState<Item[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("Semua");
  const [showLowStock, setShowLowStock] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null); 
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [tempImage, setTempImage] = useState<string | null>(null);
  const [isKasirOpen, setIsKasirOpen] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<any>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<string>("Umum");
  const [cashierVehicle, setCashierVehicle] = useState<any>(null);

  // 🆕 State untuk Pembayaran
  const [paymentMethod, setPaymentMethod] = useState("Tunai");
  const [amountPaid, setAmountPaid] = useState<number>(0);

  // 🆕 State untuk Tambah Jasa/Custom Item
  const [customItemName, setCustomItemName] = useState("");
  const [customItemPrice, setCustomItemPrice] = useState<number>(0);

  // 🆕 State untuk Diskon & Pending
  const [discount, setDiscount] = useState<number>(0);
  const [taxRate, setTaxRate] = useState<number>(0);
  const [isPendingListOpen, setIsPendingListOpen] = useState(false);
  const [pendingList, setPendingList] = useState<any[]>([]);

  // Ref untuk area cetak
  const printAreaRef = useRef<HTMLDivElement>(null);

    // 👈 UPDATED: Sinkronisasi data kendaraan & auto-fill pelanggan & SPK
  useEffect(() => { 
    loadItems();
    
    // 1. Cek Redirect dari Antrian Service
    const selectedPlate = sessionStorage.getItem('selected_vehicle_plate');
    const vehicleDataStr = sessionStorage.getItem('kasir_vehicle_data');
    
    if (selectedPlate && vehicleDataStr) {
      const vData = JSON.parse(vehicleDataStr);
      setCashierVehicle(vData);
      setSearchTerm(selectedPlate);
      
      if (selectedCustomer === "Umum" && vData.owner) {
        setSelectedCustomer(vData.owner);
      }
      
      sessionStorage.removeItem('selected_vehicle_plate');
      sessionStorage.removeItem('kasir_vehicle_data');
      
      // Auto open kasir jika ada data antrian
      setIsKasirOpen(true);
    }

    // 2. 🆕 Cek Redirect dari SPK (Ambil Data Kendaraan & Cart)
    const spkCartData = sessionStorage.getItem('spk_cart_data');
    const spkVehicleData = sessionStorage.getItem('kasir_vehicle_data'); // Ambil juga data kendaraan!
    
    if (spkCartData && spkVehicleData) {
      try {
        const cartItems = JSON.parse(spkCartData);
        const vData = JSON.parse(spkVehicleData);
        
        // Masukkan item SPK ke keranjang Kasir
        setCart(cartItems);
        
        // Masukkan data kendaraan
        setCashierVehicle(vData);
        setSelectedCustomer(vData.owner || "Umum");
        
        // Buka Modal Kasir otomatis
        setIsKasirOpen(true);
        
        // Hapus data session agar tidak muncul lagi saat refresh
        sessionStorage.removeItem('spk_cart_data');
        sessionStorage.removeItem('kasir_vehicle_data');
      } catch (error) {
        console.error("Gagal memuat data SPK:", error);
      }
    }

  }, []); // Dependency array kosong agar hanya jalan sekali saat load

  const loadItems = async () => {
    const allItems = await db.items.toArray();
    setItems(allItems.reverse());
  };

  const getFilteredItems = () => {
    let result = items;
    if (showLowStock) {
      result = result.filter((i: Item) => i.stock < 5);
    } else if (filterCategory !== "Semua") {
      result = result.filter((i: Item) => i.category === filterCategory);
    }
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      result = result.filter((i: Item) => 
        i.name.toLowerCase().includes(lowerTerm) || 
        i.sku.toLowerCase().includes(lowerTerm)
      );
    }
    return result;
  };

  const filteredItems = getFilteredItems();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = e.target as HTMLFormElement;
    const dataToSave = {
      sku: (formData.elements.namedItem("sku") as HTMLInputElement).value,
      name: (formData.elements.namedItem("name") as HTMLInputElement).value,
      category: (formData.elements.namedItem("category") as HTMLSelectElement).value,
      stock: Number((formData.elements.namedItem("stock") as HTMLInputElement).value),
      buy_price: Number((formData.elements.namedItem("buy_price") as HTMLInputElement).value),
      sell_price: Number((formData.elements.namedItem("sell_price") as HTMLInputElement).value),
      image: tempImage || editingItem?.image,
      updated_at: Date.now()
    };

    if (editingItem && editingItem.id) {
      await db.items.update(editingItem.id, dataToSave);
    } else {
      await db.items.add(dataToSave);
    }
    resetForm();
    loadItems();
  };

  const resetForm = () => {
    setEditingItem(null);
    setTempImage(null);
    setIsFormOpen(false);
  };

  const handleDelete = async (id: number) => {
    if (confirm("Yakin hapus barang ini?")) {
      await db.items.delete(id);
      loadItems();
    }
  };

  const handleEdit = (item: Item) => {
    setEditingItem(item);
    setTempImage(item.image || null);
    setIsFormOpen(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setTempImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleExport = () => {
    const headers = ["SKU", "Nama", "Kategori", "Stok", "Harga Beli", "Harga Jual"];
const rows = items.map((i: Item) => [i.sku, i.name, i.category, i.stock.toString(), i.buy_price.toString(), i.sell_price.toString()]);
let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "data_barang_bengkel.csv");
    document.body.appendChild(link);
    link.click();
  };

  const addToCart = (item: Item) => {
    const existing = cart.find((c: CartItem) => c.id === item.id);
    if (existing) {
      setCart(cart.map((c: CartItem) => c.id === item.id ? { ...c, qty: c.qty + 1 } : c));
    } else {
      setCart([...cart, { ...item, qty: 1 }]);
    }
  };

  const addCustomItemToCart = () => {
    if (!customItemName || customItemPrice <= 0) return;
    const newItem = {
      id: -Date.now(),
      sku: "JASA",
      name: customItemName,
      category: "Jasa",
      stock: 999,
      buy_price: 0,
      sell_price: customItemPrice,
      qty: 1,
      updated_at: Date.now()
    };
    setCart([...cart, newItem]);
    setCustomItemName("");
    setCustomItemPrice(0);
  };

  const updateCartQty = (id: number, newQty: number) => {
    if (newQty < 1) return;
    setCart(cart.map((c: CartItem) => c.id === id ? { ...c, qty: newQty } : c));
  };

  const removeFromCart = (id: number) => {
    setCart(cart.filter((c: CartItem) => c.id !== id));
  };

  // 🆕 FUNGSI PENDING TRANSACTIONS
  const saveAsPending = async () => {
    if (cart.length === 0) return;
    
    const tempId = `TEMP-${Date.now()}`;
    const subtotal = getTotalPrice();
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount - discount;
    
    await db.pending_transactions.add({
      temp_id: tempId,
      date: Date.now(),
      customer_name: selectedCustomer,
      vehicle_plate: cashierVehicle?.plate || "-",
      items: cart.map(c => ({ name: c.name, qty: c.qty, price: c.sell_price })),
      subtotal,
      discount,
      tax: taxRate,
      total,
      notes: "",
      created_at: Date.now(),
      updated_at: Date.now()
    });
    
    alert("✅ Transaksi disimpan sebagai Pending!");
    setCart([]);
    setDiscount(0);
    setTaxRate(0);
    setIsKasirOpen(false);
    loadPendingList();
  };

  const loadPendingList = async () => {
    const list = await db.pending_transactions.toArray();
    setPendingList(list.sort((a, b) => b.created_at - a.created_at));
  };

  const loadPendingTransaction = async (tempId: string) => {
    const pending = await db.pending_transactions.where('temp_id').equals(tempId).first();
    if (!pending) return;
    
    setSelectedCustomer(pending.customer_name);
    setDiscount(pending.discount || 0);
    setTaxRate(pending.tax || 0);
    setCart(pending.items.map((item: any) => ({
      ...item,
      id: -Date.now() + Math.random(),
      stock: 999,
      qty: item.qty || 1,
      updated_at: Date.now()
    })));
    
    await db.pending_transactions.delete(pending.id!);
    setIsPendingListOpen(false);
    setIsKasirOpen(true);
  };

  const deletePending = async (tempId: string) => {
    if (confirm("Hapus transaksi pending ini?")) {
      await db.pending_transactions.where('temp_id').equals(tempId).delete();
      loadPendingList();
    }
  };

  // 🆕 FUNGSI PROSES TRANSAKSI DENGAN AUTO-UPDATE SPK & RIWAYAT (ROBUST VERSION)
  const processTransaction = async () => {
    if (cart.length === 0) return;

    const subtotal = getTotalPrice();
    const taxAmount = subtotal * (taxRate / 100);
    const totalAmount = subtotal + taxAmount - discount;
    
    // Hitung Total Modal (untuk laporan laba)
    let totalCost = 0;
    for (const c of cart) {
      const originalItem = items.find(i => i.id === c.id);
      if (originalItem) totalCost += originalItem.buy_price * c.qty;
    }

    // LOGIKA STATUS PEMBAYARAN
    let status: 'Lunas' | 'Belum Lunas' = 'Lunas';
    let paid = totalAmount;
    let remaining = 0;

    if (paymentMethod === "Bon") {
      status = "Belum Lunas";
      paid = 0;
      remaining = totalAmount;
    } else if (paymentMethod === "Sebagian") {
      if (amountPaid < totalAmount && amountPaid > 0) {
        status = "Belum Lunas";
        paid = amountPaid;
        remaining = totalAmount - amountPaid;
      } else {
        status = "Lunas";
        paid = totalAmount;
        remaining = 0;
      }
    } else {
      status = "Lunas";
      paid = totalAmount;
      remaining = 0;
    }

    const invoiceNo = `INV-${Date.now().toString().slice(-6)}`;

    await db.transactions.add({
      date: Date.now(),
      invoice_number: invoiceNo,
      customer_name: selectedCustomer === "Umum" ? undefined : selectedCustomer,
      total_amount: totalAmount,
      total_cost: totalCost,
      items: cart.map(c => ({ name: c.name, qty: c.qty, price: c.sell_price, total: c.sell_price * c.qty })),
      type: 'sale',
      status: status,
      payment_method: paymentMethod,
      amount_paid: paid,
      remaining_amount: remaining,
      discount: discount,
      tax: taxRate
    });

  // HANYA kurangi stok untuk barang asli (ID > 0)
for (const c of cart) {
    if (c.id !== undefined && c.id > 0) {
        await db.items.update(c.id, { stock: c.stock - c.qty, updated_at: Date.now() });
    }
}

    setLastTransaction({
      invoiceNo,
      customerName: selectedCustomer,
      items: cart.map(c => ({ name: c.name, qty: c.qty, price: c.sell_price, total: c.sell_price * c.qty })),
      totalAmount,
      subtotal,
      discount,
      tax: taxRate,
      status,
      paid,
      remaining,
      paymentMethod,
      vehiclePlate: cashierVehicle?.plate || "-",
      vehicleModel: cashierVehicle?.model || "-",
      ownerName: cashierVehicle?.owner || "-"
    });

    // 🆕 AUTO-UPDATE SPK & CREATE RIWAYAT SERVIS (ROBUST + DEBUG LOG)
    if (cashierVehicle?.plate) {
      const plateFromCashier = cashierVehicle.plate.trim().toUpperCase();
      console.log("🔍 [DEBUG] Mencari SPK untuk plat:", plateFromCashier);
      console.log("🔍 [DEBUG] cashierVehicle object:", cashierVehicle);
      
      try {
        // 1. Cek apakah tabel riwayat_servis ada
        const tableNames = await db.tables.map(t => t.name);
        if (!tableNames.includes('riwayat_servis')) {
          console.warn("⚠️ [WARNING] Tabel 'riwayat_servis' tidak ditemukan di database!");
          console.log("💡 [SOLUSI] Pastikan interface ServiceRecord dan schema riwayat_servis sudah ditambahkan di src/lib/db.ts");
        }
        
        // 2. Cari semua SPK di database untuk debug
        const allSpk = await db.spk.toArray();
        console.log(`📦 [DEBUG] Total SPK di database: ${allSpk.length}`);
        
        // 3. Cari SPK pending dengan plat nomor yang sama (case-insensitive + trim)
        const relatedSpk = await db.spk
          .where('vehicle_plate')
          .equalsIgnoreCase(plateFromCashier)
          .and(item => item.status === 'pending')
          .toArray();

        console.log(`✅ [DEBUG] SPK pending ditemukan: ${relatedSpk.length}`);
        if (relatedSpk.length > 0) {
          console.log("📋 [DEBUG] Detail SPK:", relatedSpk.map(s => ({
            id: s.id,
            spk_number: s.spk_number,
            plate: s.vehicle_plate,
            status: s.status
          })));
        }

        if (relatedSpk.length > 0) {
          for (const spk of relatedSpk) {
            // 4. Update status SPK jadi 'completed'
            await db.spk.update(spk.id!, { status: 'completed', updated_at: Date.now() });
            console.log(`📝 [SUCCESS] SPK ${spk.spk_number} status diubah menjadi 'completed'`);
            
            // 5. Cek apakah sudah ada riwayat untuk SPK ini (hindari duplikat)
            const existingRiwayat = await db.riwayat_servis
              .where('spk_id')
              .equals(spk.id!)
              .first();
            
            if (!existingRiwayat) {
              // 6. Buat record di Riwayat Servis
              await db.riwayat_servis.add({
                spk_id: spk.id!,
                customer_name: spk.owner_name || cashierVehicle.owner || "Umum",
                vehicle_plate: spk.vehicle_plate || plateFromCashier,
                service_type: 'Servis Berkala',
                description: spk.complaints || "Servis & Ganti Sparepart",
                date: spk.date || Date.now(),
                cost: spk.grand_total || 0,
                status: 'completed',
                updated_at: Date.now()
              });
              console.log('✅ [SUCCESS] Riwayat servis otomatis dibuat untuk:', spk.spk_number);
            } else {
              console.log('⚠️ [INFO] Riwayat sudah ada untuk SPK ini, dilewati:', spk.spk_number);
            }
          }
        } else {
          console.warn("❌ [WARNING] Tidak ada SPK pending yang cocok untuk plat:", plateFromCashier);
          console.log("💡 [TIP] Pastikan plat nomor di SPK sama persis dengan di Kasir (termasuk spasi)");
          
          // Debug: tampilkan semua SPK dengan plat mirip
          const similarPlates = allSpk.filter(s => 
            s.vehicle_plate.toUpperCase().includes(plateFromCashier) ||
            plateFromCashier.includes(s.vehicle_plate.toUpperCase())
          );
          if (similarPlates.length > 0) {
            console.log("🔎 [DEBUG] SPK dengan plat mirip:", similarPlates.map(s => ({
              plate: s.vehicle_plate,
              status: s.status,
              spk_number: s.spk_number
            })));
          }
        }
      } catch (err: any) {
        console.error('❌ [ERROR] Gagal update status SPK / Riwayat:', err);
        console.error('❌ [ERROR] Stack:', err.stack);
        console.error('❌ [ERROR] Name:', err.name);
      }
    }

    alert(`Transaksi Berhasil!\nStatus: ${status}${remaining > 0 ? `\nSisa Tagihan: ${formatRupiah(remaining)}` : ''}`);
    
    setCart([]);
    setDiscount(0);
    setTaxRate(0);
    setIsKasirOpen(false);
    setShowInvoice(true);
    loadItems();
  };

  const handlePrintDocument = () => {
    if (!lastTransaction) return;
    
    const isBon = lastTransaction.status === 'Belum Lunas';
    const title = isBon ? 'BON / NOTA HUTANG' : 'STRUK PEMBELIAN';
    
    const subtotal = lastTransaction.subtotal || lastTransaction.totalAmount;
    const discount = lastTransaction.discount || 0;
    const taxRate = lastTransaction.tax || 0;
    const taxAmount = subtotal * (taxRate / 100);
    
    const printContent = `
      <html>
      <head>
        <title>${title} - ${lastTransaction.invoiceNo}</title>
        <style>
          body { font-family: 'Courier New', monospace; padding: 20px; font-size: 12px; color: #000; }
          .container { max-width: 320px; margin: 0 auto; border: 2px dashed #333; padding: 15px; }
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 10px; }
          .header h2 { margin: 5px 0; font-size: 16px; }
          .header p { margin: 2px 0; font-size: 11px; }
          .info { margin-bottom: 10px; }
          .row { display: flex; justify-content: space-between; margin: 3px 0; }
          .items { border-top: 2px dashed #000; border-bottom: 2px dashed #000; padding: 10px 0; margin: 10px 0; }
          .item-row { display: flex; justify-content: space-between; margin: 2px 0; font-size: 11px; }
          .total { font-weight: bold; font-size: 14px; }
          .highlight { color: ${isBon ? 'red' : 'green'}; font-weight: bold; }
          .footer { text-align: center; margin-top: 20px; font-size: 10px; color: #666; }
          @media print { body { padding: 0; } .container { border: none; } }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>BENGKEL SERVICE PRO</h2>
            <p>${title}</p>
            <p>Jl. Bengkel No. 1, Kota Anda | Telp: 0812-3456-7890</p>
          </div>
          
          <div class="info">
            <div class="row"><span>No. Invoice:</span> <strong>${lastTransaction.invoiceNo}</strong></div>
            <div class="row"><span>Tanggal:</span> <span>${new Date().toLocaleDateString('id-ID')}</span></div>
            <div class="row"><span>Pelanggan:</span> <span>${lastTransaction.customerName || 'Umum'}</span></div>
            <div class="row"><span>Metode:</span> <span>${lastTransaction.paymentMethod}</span></div>
            
            <div style="margin-top:8px; padding-top:8px; border-top:1px dashed #000;">
              <div class="row"><span><strong>DATA KENDARAAN:</strong></span></div>
              <div class="row"><span>Plat Nomor:</span> <strong>${lastTransaction.vehiclePlate || '-'}</strong></div>
              <div class="row"><span>Model:</span> <span>${lastTransaction.vehicleModel || '-'}</span></div>
              <div class="row"><span>Pemilik:</span> <span>${lastTransaction.ownerName || '-'}</span></div>
            </div>
          </div>
          
          <div class="items">
            ${lastTransaction.items.map((item: any) => `
              <div class="item-row">
                <span>${item.name} x${item.qty}</span>
                <span>Rp ${item.total.toLocaleString('id-ID')}</span>
              </div>
            `).join('')}
          </div>
          
          <div class="row total" style="margin-top:10px;">
            <span>Subtotal:</span>
            <span>Rp ${subtotal.toLocaleString('id-ID')}</span>
          </div>
          ${discount > 0 ? `
          <div class="row" style="color:green;">
            <span>Diskon:</span>
            <span>- Rp ${discount.toLocaleString('id-ID')}</span>
          </div>` : ''}
          ${taxRate > 0 ? `
          <div class="row" style="color:blue;">
            <span>Pajak (${taxRate}%):</span>
            <span>+ Rp ${taxAmount.toLocaleString('id-ID')}</span>
          </div>` : ''}
          <div class="row total" style="border-top:2px dashed #000; padding-top:10px; font-size:16px;">
            <span>TOTAL:</span>
            <span>Rp ${lastTransaction.totalAmount.toLocaleString('id-ID')}</span>
          </div>
          
          ${isBon ? `
            <div class="row" style="margin-top:5px;">
              <span>Sudah Dibayar:</span>
              <span style="color:green;">Rp ${lastTransaction.paid.toLocaleString('id-ID')}</span>
            </div>
            <div class="row highlight" style="margin-top:10px; font-size:16px; border-top:2px dashed #000; padding-top:10px;">
              <span>SISA TAGIHAN:</span>
              <span>Rp ${lastTransaction.remaining.toLocaleString('id-ID')}</span>
            </div>
            <p style="text-align:center; margin-top:15px; font-size:11px; color:#666;">
              ⚠️ Harap segera dilunasi. Terima kasih.
            </p>
          ` : `
            <p style="text-align:center; margin-top:15px; color:green; font-weight:bold;">
              ✅ LUNAS - Terima Kasih!
            </p>
          `}
          
          <div class="footer">
            <p>Garansi Servis 7 Hari</p>
            <p>Dicetak: ${new Date().toLocaleString('id-ID')}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  };

  const getTotalPrice = () => cart.reduce((sum, item) => sum + (item.sell_price * item.qty), 0);
  const formatRupiah = (num: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(num);

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      
      {/* CONTENT INVENTARIS - TANPA NAVIGASI DUPlikat */}
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER INVENTARIS */}
        <div className="flex flex-col lg:flex-row justify-between items-start gap-4 mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">
              INVENTARIS BARANG
            </h2>
            <p className="text-zinc-500 mt-1 text-sm">Manajemen Stok & Transaksi Offline</p>
          </div>
          
          <div className="flex flex-wrap gap-2 md:gap-3">
            <button onClick={handleExport} className="btn-chrome text-black px-3 md:px-4 py-2 md:py-3 rounded-xl flex items-center gap-2 font-bold text-sm">
              <FileSpreadsheet className="w-4 h-4" /> <span className="hidden sm:inline">Export</span>
            </button>
            <button onClick={() => setShowLowStock(!showLowStock)} className={`px-3 md:px-4 py-2 md:py-3 rounded-xl border-2 active:translate-y-1 transition-all flex items-center gap-2 font-bold text-sm ${showLowStock ? 'bg-orange-600 border-orange-500 text-white' : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:border-zinc-500'}`}>
              <AlertTriangle className="w-4 h-4" /> <span className="hidden sm:inline">Stok Tipis</span>
            </button>
            <button onClick={() => setIsKasirOpen(true)} className="btn-orange text-white px-3 md:px-4 py-2 md:py-3 rounded-xl flex items-center gap-2 font-bold text-sm">
              <ShoppingCart className="w-4 h-4" /> <span className="hidden sm:inline">Kasir</span>
            </button>
            <button onClick={async () => { setIsSyncing(true); await syncData(); setIsSyncing(false); loadItems(); }} className="bg-zinc-800 hover:bg-zinc-700 text-white px-3 md:px-4 py-2 md:py-3 rounded-xl border border-zinc-600 active:translate-y-1 transition-all flex items-center gap-2 font-bold text-sm">
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} /> <span className="hidden sm:inline">Sync</span>
            </button>
            <button onClick={() => { resetForm(); setIsFormOpen(true); }} className="btn-orange text-white px-3 md:px-4 py-2 md:py-3 rounded-xl flex items-center gap-2 font-bold text-sm">
              <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Tambah</span>
            </button>
          </div>
        </div>

        {/* SEARCH BAR - CHROME STYLE */}
        <div className="bg-zinc-900 border-2 border-zinc-700 p-3 md:p-4 rounded-2xl mb-6 flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-3.5 w-5 h-5 text-orange-500" />
            <input 
              type="text" 
              placeholder="Cari nama barang atau SKU..." 
              className="w-full pl-12 pr-4 py-3 bg-black border-2 border-zinc-700 rounded-xl text-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all" 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
          </div>
          <select 
            className="px-4 py-3 bg-black border-2 border-zinc-700 rounded-xl text-white focus:border-orange-500 outline-none" 
            value={filterCategory} 
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="Semua">Semua Kategori</option>
            <option value="Umum">Umum</option>
            <option value="Oli">Oli</option>
            <option value="Filter">Filter</option>
            <option value="Kaki-kaki">Kaki-kaki</option>
          </select>
        </div>

        {/* TABEL - CHROME BORDER */}
        <div className="bg-zinc-900 border-2 border-zinc-700 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-zinc-800 border-b-2 border-zinc-700 text-zinc-300 uppercase font-bold">
                <tr>
                  <th className="px-4 md:px-6 py-4">Foto</th>
                  <th className="px-4 md:px-6 py-4">Info Barang</th>
                  <th className="px-4 md:px-6 py-4 hidden md:table-cell">Kategori</th>
                  <th className="px-4 md:px-6 py-4 text-right">Stok</th>
                  <th className="px-4 md:px-6 py-4 text-right">Harga Jual</th>
                  <th className="px-4 md:px-6 py-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filteredItems.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-12 text-center text-zinc-500 text-lg">Data tidak ditemukan.</td></tr>
                ) : (
                  filteredItems.map((item: Item) => (
                    <tr key={item.id} className="hover:bg-zinc-800/50 transition-colors group">
                      <td className="px-4 md:px-6 py-4">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="w-12 h-12 object-cover rounded-lg border-2 border-zinc-700 group-hover:border-orange-500 transition-all" />
                        ) : (
                          <div className="w-12 h-12 bg-zinc-800 rounded-lg flex items-center justify-center text-zinc-600 border-2 border-zinc-700">
                            <Camera className="w-6 h-6" />
                          </div>
                        )}
                      </td>
                      <td className="px-4 md:px-6 py-4">
                        <div className="font-bold text-white text-base">{item.name}</div>
                        <div className="text-xs text-orange-500 font-mono mt-1">{item.sku}</div>
                      </td>
                      <td className="px-4 md:px-6 py-4 hidden md:table-cell">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${item.stock < 5 ? 'bg-orange-900/30 text-orange-400 border-orange-700' : 'bg-zinc-800 text-zinc-400 border-zinc-600'}`}>
                          {item.category}
                        </span>
                      </td>
                      <td className="px-4 md:px-6 py-4 text-right font-bold text-white text-lg">{item.stock}</td>
                      <td className="px-4 md:px-6 py-4 text-right text-zinc-300 font-mono">{formatRupiah(item.sell_price)}</td>
                      <td className="px-4 md:px-6 py-4 text-center">
                        <div className="flex justify-center gap-2">
                          <button onClick={() => handleEdit(item)} className="text-zinc-400 hover:text-orange-500 p-2 rounded-lg hover:bg-zinc-800 transition-colors"><Pencil className="w-5 h-5"/></button>
                          <button onClick={() => handleDelete(item.id!)} className="text-zinc-400 hover:text-red-500 p-2 rounded-lg hover:bg-zinc-800 transition-colors"><Trash2 className="w-5 h-5"/></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL FORM - CHROME STYLE */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-zinc-900 border-2 border-orange-500/50 rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-black mb-6 text-white flex items-center gap-2">
              {editingItem ? <Pencil className="w-5 h-5 text-orange-500"/> : <Plus className="w-5 h-5 text-orange-500"/>}
              {editingItem ? "EDIT BARANG" : "TAMBAH BARANG"}
            </h2>
            <form onSubmit={handleSave} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 bg-zinc-800 rounded-xl overflow-hidden border-2 border-zinc-700 flex items-center justify-center">
                  {tempImage ? <img src={tempImage} className="w-full h-full object-cover"/> : <Camera className="w-8 h-8 text-zinc-600"/>}
                </div>
                <label className="flex-1 cursor-pointer bg-zinc-800 border-2 border-dashed border-zinc-600 hover:border-orange-500 rounded-xl p-3 text-center text-sm text-zinc-400 hover:text-orange-400 transition-all">
                  Upload Foto<input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><label className="text-xs font-bold text-zinc-500 uppercase ml-1">SKU</label><input name="sku" defaultValue={editingItem?.sku || ""} required className="w-full p-3 bg-black border-2 border-zinc-700 rounded-xl text-white focus:border-orange-500 outline-none transition-all" /></div>
                <div className="col-span-2"><label className="text-xs font-bold text-zinc-500 uppercase ml-1">Nama Barang</label><input name="name" defaultValue={editingItem?.name || ""} required className="w-full p-3 bg-black border-2 border-zinc-700 rounded-xl text-white focus:border-orange-500 outline-none transition-all" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs font-bold text-zinc-500 uppercase ml-1">Stok</label><input name="stock" type="number" defaultValue={editingItem?.stock || 0} required className="w-full p-3 bg-black border-2 border-zinc-700 rounded-xl text-white focus:border-orange-500 outline-none transition-all" /></div>
                <div><label className="text-xs font-bold text-zinc-500 uppercase ml-1">Kategori</label><select name="category" defaultValue={editingItem?.category || "Umum"} className="w-full p-3 bg-black border-2 border-zinc-700 rounded-xl text-white focus:border-orange-500 outline-none transition-all"><option value="Umum">Umum</option><option value="Oli">Oli</option><option value="Filter">Filter</option><option value="Kaki-kaki">Kaki-kaki</option></select></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs font-bold text-zinc-500 uppercase ml-1">Harga Beli</label><input name="buy_price" type="number" defaultValue={editingItem?.buy_price || 0} required className="w-full p-3 bg-black border-2 border-zinc-700 rounded-xl text-white focus:border-orange-500 outline-none transition-all" /></div>
                <div><label className="text-xs font-bold text-zinc-500 uppercase ml-1">Harga Jual</label><input name="sell_price" type="number" defaultValue={editingItem?.sell_price || 0} required className="w-full p-3 bg-black border-2 border-zinc-700 rounded-xl text-white focus:border-orange-500 outline-none transition-all" /></div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={resetForm} className="flex-1 py-3 text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-xl font-bold transition-all">Batal</button>
                <button type="submit" className="flex-1 py-3 btn-orange text-white rounded-xl font-bold">Simpan Data</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL KASIR - ORANGE & CHROME THEME */}
      {isKasirOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-zinc-900 border-2 border-orange-500/50 rounded-2xl shadow-2xl w-full max-w-5xl my-8 flex flex-col max-h-[90vh]">
            
            {/* HEADER - ORANGE */}
            <div className="p-5 border-b-2 border-zinc-800 flex justify-between items-center bg-zinc-900 flex-shrink-0">
              <div className="flex items-center gap-3">
                <ShoppingCart className="w-6 h-6 text-orange-500"/> 
                <span className="text-xl font-black text-white">KASIR / TRANSAKSI</span>
                {cashierVehicle && (
                  <span className="bg-zinc-800 text-zinc-300 px-3 py-1 rounded-lg text-sm font-mono border border-zinc-600">
                    🚗 {cashierVehicle.plate} • {cashierVehicle.owner}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { loadPendingList(); setIsPendingListOpen(true); }} className="text-zinc-400 hover:text-orange-500 flex items-center gap-1 text-sm">
                  <Clock className="w-4 h-4" /> Pending
                </button>
                <button onClick={() => setIsKasirOpen(false)} className="p-2 hover:bg-zinc-800 rounded-xl transition-colors"><X className="w-6 h-6 text-zinc-400"/></button>
              </div>
            </div>
            
            {/* CONTENT - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* KOLOM KIRI: BARANG */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-zinc-900 p-4 rounded-xl border-2 border-zinc-700">
                    <h3 className="font-bold text-orange-500 mb-3 uppercase text-sm flex items-center gap-2">
                      <Plus className="w-4 h-4"/> Tambah Jasa / Item Lain
                    </h3>
                    <div className="flex gap-2">
                      <input 
                        value={customItemName} 
                        onChange={e => setCustomItemName(e.target.value)} 
                        className="flex-1 p-2 bg-black border-2 border-zinc-700 rounded-lg text-white text-sm focus:border-orange-500 outline-none" 
                        placeholder="Nama Jasa (mis: Jasa Ganti Oli)" 
                      />
                      <input 
                        type="number" 
                        value={customItemPrice || ""} 
                        onChange={e => setCustomItemPrice(Number(e.target.value))} 
                        className="w-32 p-2 bg-black border-2 border-zinc-700 rounded-lg text-white text-sm focus:border-orange-500 outline-none" 
                        placeholder="Harga" 
                      />
                      <button onClick={addCustomItemToCart} className="btn-orange text-white px-4 py-2 rounded-lg font-bold text-sm">
                        + Tambah
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-zinc-400 mb-3 uppercase tracking-widest text-sm">Pilih Barang Stok</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {items.filter((i: Item) => i.stock > 0).map((item: Item) => (
                        <div key={item.id} className="flex justify-between items-center p-4 bg-zinc-900 border-2 border-zinc-700 rounded-xl hover:border-orange-500 hover:shadow-[0_0_15px_rgba(249,115,22,0.3)] transition-all cursor-pointer group" onClick={() => addToCart(item)}>
                          <div>
                            <div className="font-bold text-white text-base group-hover:text-orange-500 transition-colors">{item.name}</div>
                            <div className="text-xs text-zinc-500 mt-1">Stok: {item.stock} | {formatRupiah(item.sell_price)}</div>
                          </div>
                          <button className="btn-orange text-white w-8 h-8 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform">+</button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* KOLOM KANAN: KERANJANG & BAYAR */}
                <div className="space-y-4">
                  <div className="bg-zinc-900 p-4 rounded-xl border-2 border-zinc-700">
                    <h3 className="font-bold text-zinc-400 mb-4 uppercase tracking-widest text-sm">Keranjang</h3>
                    {cart.length === 0 ? (
                      <p className="text-center text-zinc-600 py-8 text-sm">Keranjang kosong</p>
                    ) : (
                      <div className="space-y-3">
                        {cart.map((c: CartItem) => (
                          <div key={c.id} className="bg-black/50 p-3 rounded-lg border border-zinc-700">
                            <div className="flex justify-between text-sm font-bold text-white mb-2">
                              <span className={c.id < 0 ? "text-orange-400" : "text-white"}>{c.name}</span>
                              <span className="text-orange-500">{formatRupiah(c.sell_price * c.qty)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button onClick={() => updateCartQty(c.id!, c.qty - 1)} className="w-7 h-7 bg-zinc-800 hover:bg-red-900 rounded flex items-center justify-center font-bold text-white text-sm">-</button>
                              <span className="text-white font-bold w-6 text-center">{c.qty}</span>
                              <button onClick={() => updateCartQty(c.id!, c.qty + 1)} className="w-7 h-7 bg-zinc-800 hover:bg-green-900 rounded flex items-center justify-center font-bold text-white text-sm">+</button>
                              <button onClick={() => removeFromCart(c.id!)} className="ml-auto text-zinc-600 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* DISKON & PAJAK */}
                  <div className="bg-zinc-900 p-4 rounded-xl border-2 border-zinc-700 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-zinc-500 uppercase">Diskon (Rp)</label>
                        <input type="number" value={discount} onChange={e => setDiscount(Number(e.target.value))} className="w-full p-2 bg-black border-2 border-zinc-700 rounded-lg text-white text-sm focus:border-orange-500 outline-none" placeholder="0" />
                      </div>
                      <div>
                        <label className="text-xs text-zinc-500 uppercase">Pajak (%)</label>
                        <input type="number" value={taxRate} onChange={e => setTaxRate(Number(e.target.value))} className="w-full p-2 bg-black border-2 border-zinc-700 rounded-lg text-white text-sm focus:border-orange-500 outline-none" placeholder="0" />
                      </div>
                    </div>
                    
                    <div className="border-t-2 border-zinc-800 pt-3 space-y-1 text-sm">
                      <div className="flex justify-between text-zinc-500">
                        <span>Subtotal</span>
                        <span>{formatRupiah(getTotalPrice())}</span>
                      </div>
                      {discount > 0 && (
                        <div className="flex justify-between text-orange-400">
                          <span>Diskon</span>
                          <span>- {formatRupiah(discount)}</span>
                        </div>
                      )}
                      {taxRate > 0 && (
                        <div className="flex justify-between text-zinc-400">
                          <span>Pajak ({taxRate}%)</span>
                          <span>+ {formatRupiah(getTotalPrice() * (taxRate / 100))}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-lg pt-2 border-t-2 border-zinc-800">
                        <span>Total</span>
                        <span className="text-orange-500">{formatRupiah(getTotalPrice() + (getTotalPrice() * (taxRate / 100)) - discount)}</span>
                      </div>
                    </div>
                  </div>

                  {/* METODE PEMBAYARAN */}
                  <div>
                    <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Metode Pembayaran</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => { setPaymentMethod("Tunai"); setAmountPaid(getTotalPrice()); }} className={`p-3 rounded-xl text-sm font-bold border-2 transition-all ${paymentMethod === 'Tunai' ? 'btn-orange text-white' : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500'}`}>
                        💵 Tunai
                      </button>
                      <button type="button" onClick={() => { setPaymentMethod("Transfer"); setAmountPaid(getTotalPrice()); }} className={`p-3 rounded-xl text-sm font-bold border-2 transition-all ${paymentMethod === 'Transfer' ? 'bg-zinc-700 border-zinc-500 text-white' : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500'}`}>
                        🏦 Transfer
                      </button>
                      <button type="button" onClick={() => { setPaymentMethod("Bon"); setAmountPaid(0); }} className={`p-3 rounded-xl text-sm font-bold border-2 transition-all ${paymentMethod === 'Bon' ? 'bg-orange-900 border-orange-700 text-white' : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500'}`}>
                        📝 Bon
                      </button>
                      <button type="button" onClick={() => { setPaymentMethod("Sebagian"); setAmountPaid(0); }} className={`p-3 rounded-xl text-sm font-bold border-2 transition-all ${paymentMethod === 'Sebagian' ? 'btn-orange text-white' : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500'}`}>
                        💰 Sebagian
                      </button>
                    </div>
                  </div>

                  {paymentMethod === "Sebagian" && (
                    <div className="bg-zinc-900 p-3 rounded-xl border-2 border-orange-500/50">
                      <label className="text-xs font-bold text-orange-500 uppercase">Jumlah Dibayar</label>
                      <input type="number" value={amountPaid} onChange={e => setAmountPaid(Number(e.target.value))} className="w-full p-2 mt-1 bg-black border-2 border-orange-500 rounded-lg text-white font-bold text-right focus:ring-2 focus:ring-orange-500 outline-none" placeholder="0" />
                    </div>
                  )}

                  {/* TOMBOL PENDING */}
                  <button onClick={saveAsPending} disabled={cart.length === 0} className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-900 disabled:text-zinc-600 text-white rounded-xl font-bold border-2 border-zinc-700 transition-all flex items-center justify-center gap-2">
                    <Save className="w-5 h-5" /> Simpan Sementara
                  </button>

                  {/* TOMBOL BAYAR - ORANGE */}
                  <div className="pt-4 border-t-2 border-zinc-800 space-y-3">
                    <div className="flex justify-between text-xl font-black text-white">
                      <span>TOTAL TAGIHAN</span>
                      <span className="text-orange-500">{formatRupiah(getTotalPrice() + (getTotalPrice() * (taxRate / 100)) - discount)}</span>
                    </div>

                    <button 
                      onClick={processTransaction} 
                      disabled={cart.length === 0 || (paymentMethod === "Sebagian" && amountPaid <= 0)} 
                      className={`w-full py-4 rounded-xl font-black text-lg shadow-lg active:shadow-none active:translate-y-1 transition-all flex items-center justify-center gap-2
                        ${paymentMethod === 'Bon' 
                          ? 'bg-gradient-to-r from-orange-700 to-orange-800 hover:from-orange-600 hover:to-orange-700' 
                          : 'btn-orange'
                        } 
                        disabled:from-zinc-800 disabled:to-zinc-900 disabled:text-zinc-600 disabled:shadow-none disabled:cursor-not-allowed text-white`}
                    >
                      <Check className="w-6 h-6"/> 
                      {paymentMethod === 'Bon' ? 'BUAT BON' : 
                       paymentMethod === 'Sebagian' ? 'BAYAR SEBAGIAN' : 'BAYAR SEKARANG'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PENDING TRANSACTIONS */}
      {isPendingListOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border-2 border-zinc-700 rounded-2xl shadow-2xl w-full max-w-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <Clock className="w-6 h-6 text-zinc-400" /> Transaksi Pending
              </h2>
              <button onClick={() => setIsPendingListOpen(false)} className="text-zinc-400 hover:text-white"><X className="w-6 h-6"/></button>
            </div>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {pendingList.length === 0 ? (
                <p className="text-center text-zinc-600 py-8">Tidak ada transaksi pending</p>
              ) : (
                pendingList.map(p => (
                  <div key={p.id} className="bg-zinc-900 p-4 rounded-xl border-2 border-zinc-700 flex justify-between items-center">
                    <div>
                      <div className="font-bold text-white">{p.customer_name}</div>
                      <div className="text-xs text-zinc-500">{new Date(p.date).toLocaleDateString('id-ID')} • {p.vehicle_plate}</div>
                      <div className="text-sm text-orange-500 font-bold mt-1">{formatRupiah(p.total)}</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => loadPendingTransaction(p.temp_id)} className="bg-zinc-700 hover:bg-zinc-600 text-white px-3 py-2 rounded-lg text-sm font-bold border border-zinc-600">
                        Lanjutkan
                      </button>
                      <button onClick={() => deletePending(p.temp_id)} className="bg-zinc-800 hover:bg-red-900 text-white px-3 py-2 rounded-lg text-sm font-bold border border-zinc-700">
                        Hapus
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL INVOICE / BON */}
      {showInvoice && lastTransaction && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className={`bg-zinc-900 border-2 rounded-2xl shadow-2xl w-full max-w-md p-8 relative ${lastTransaction.status === 'Lunas' ? 'border-orange-500/50' : 'border-orange-700/50'}`}>
            <button onClick={() => setShowInvoice(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white"><X className="w-6 h-6"/></button>
            
            <div className={`text-center p-4 rounded-xl mb-6 border-2 ${lastTransaction.status === 'Lunas' ? 'bg-orange-900/20 border-orange-500/50' : 'bg-orange-900/30 border-orange-700/50'}`}>
              <h3 className={`text-center font-black mb-2 text-xl ${lastTransaction.status === 'Lunas' ? 'text-orange-500' : 'text-orange-400'}`}>
                {lastTransaction.status === 'Lunas' ? '✅ TRANSAKSI LUNAS!' : '📝 BON / BELUM LUNAS'}
              </h3>
              <p className="text-zinc-500 text-sm">No. Invoice: <span className="font-mono text-white">{lastTransaction.invoiceNo}</span></p>
            </div>
            
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Pelanggan</span>
                <span className="text-white font-medium">{lastTransaction.customerName || "Umum"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Metode Bayar</span>
                <span className="text-white font-medium">{lastTransaction.paymentMethod}</span>
              </div>
              <div className="border-t-2 border-zinc-800 pt-3 mt-3 space-y-2">
                {lastTransaction.items.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="text-zinc-400">{item.name} x{item.qty}</span>
                    <span className="text-white">{formatRupiah(item.total)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t-2 border-zinc-800 pt-3">
                <div className="flex justify-between text-lg font-bold">
                  <span className="text-zinc-400">Total Tagihan</span>
                  <span className="text-white">{formatRupiah(lastTransaction.totalAmount)}</span>
                </div>
                {lastTransaction.status === 'Belum Lunas' && (
                  <>
                    <div className="flex justify-between text-sm mt-2">
                      <span className="text-zinc-500">Sudah Dibayar</span>
                      <span className="text-orange-400">{formatRupiah(lastTransaction.paid)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-black mt-2 text-orange-500">
                      <span>SISA TAGIHAN</span>
                      <span>{formatRupiah(lastTransaction.remaining)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setShowInvoice(false)} className="py-3 bg-zinc-800 text-white rounded-xl font-bold hover:bg-zinc-700 transition-all border border-zinc-700">
                Tutup
              </button>
              {lastTransaction.status === 'Belum Lunas' ? (
                <button onClick={handlePrintDocument} className="py-3 bg-orange-700 hover:bg-orange-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all border border-orange-600">
                  <Printer className="w-4 h-4"/> Cetak Bon
                </button>
              ) : (
                <button onClick={handlePrintDocument} className="py-3 btn-orange flex items-center justify-center gap-2">
                  <Printer className="w-4 h-4"/> Cetak Struk
                </button>
              )}
            </div>
            
            {lastTransaction.status === 'Belum Lunas' && (
              <p className="text-xs text-zinc-600 text-center mt-4">
                💡 Untuk melunasi, buka menu <strong>"Tagihan Hutang"</strong> di navigasi atas
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}// Force rebuild 1779488979
