"use client";
import { useState, useEffect, useRef } from "react";
import { db, Transaction } from "../../lib/db";
import { Wallet, Search, DollarSign, Calendar, FileText, CheckCircle, X, Printer, Download } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export default function UnpaidList() {
  const [unpaidTransactions, setUnpaidTransactions] = useState<Transaction[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState("Tunai");
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastPayment, setLastPayment] = useState<any>(null);
  
  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadUnpaid(); }, []);

  const loadUnpaid = async () => {
    const all = await db.transactions.toArray();
    const unpaid = all.filter(t => t.status === "Belum Lunas" || (t.remaining_amount && t.remaining_amount > 0));
    setUnpaidTransactions(unpaid.sort((a, b) => b.date - a.date));
  };

  const totalUnpaid = unpaidTransactions.reduce((sum, t) => sum + (t.remaining_amount || 0), 0);

  const handlePayment = async () => {
  if (!selectedTransaction || paymentAmount <= 0) return;

  const remaining = selectedTransaction.remaining_amount || 0;
  const newRemaining = Math.max(0, remaining - paymentAmount);
  const newPaid = (selectedTransaction.amount_paid || 0) + paymentAmount;
  const newStatus = newRemaining === 0 ? "Lunas" : "Belum Lunas";

  // ✅ PERBAIKAN: Gunakan selectedTransaction.id
  await db.transactions.update(selectedTransaction.id!, {
    status: newStatus,
    payment_method: paymentMethod,
    amount_paid: newPaid,
    remaining_amount: newRemaining,
    updated_at: Date.now()
  } as any);

  // Simpan data untuk nota
  setLastPayment({
    invoiceNo: selectedTransaction.invoice_number,
    customerName: selectedTransaction.customer_name || "Umum",
    paymentDate: Date.now(),
    paymentMethod: paymentMethod,
    totalAmount: selectedTransaction.total_amount,
    previouslyPaid: selectedTransaction.amount_paid || 0,
    thisPayment: paymentAmount,
    remaining: newRemaining,
    status: newStatus,
    items: selectedTransaction.items
  });

  setIsPaymentOpen(false);
  setShowReceipt(true);
  setSelectedTransaction(null);
  setPaymentAmount(0);
  loadUnpaid();
};

  const printReceipt = async () => {
    if (!receiptRef.current) return;
    const canvas = await html2canvas(receiptRef.current);
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: [300, 500] });
    pdf.addImage(imgData, "PNG", 0, 0, 300, 450);
    pdf.save(`Nota_Pelunasan_${lastPayment.invoiceNo}.pdf`);
  };

  const openPaymentModal = (t: Transaction) => {
    setSelectedTransaction(t);
    setPaymentAmount(t.remaining_amount || 0);
    setPaymentMethod("Tunai");
    setIsPaymentOpen(true);
  };

  const formatRupiah = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(n);
  const formatDate = (ts: number) => new Date(ts).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="p-6 max-w-7xl mx-auto min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-800 via-gray-900 to-black text-slate-100">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-500">
            DAFTAR TAGIHAN / HUTANG
          </h1>
          <p className="text-slate-400 mt-1">Kelola pelunasan tagihan pelanggan</p>
        </div>
        <div className="bg-red-900/30 border border-red-500/30 px-6 py-3 rounded-xl">
          <p className="text-sm text-slate-400">Total Tagihan Belum Lunas</p>
          <p className="text-2xl font-black text-red-400">{formatRupiah(totalUnpaid)}</p>
        </div>
      </div>

      {/* SEARCH */}
      <div className="bg-gray-900/50 backdrop-blur-xl border border-white/10 p-4 rounded-2xl mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-3.5 w-5 h-5 text-orange-500" />
          <input 
            type="text" 
            placeholder="Cari nama pelanggan atau nomor invoice..." 
            className="w-full pl-12 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:ring-2 focus:ring-orange-500 outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* LIST TAGIHAN */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {unpaidTransactions.filter(t => 
          t.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
          t.invoice_number.toLowerCase().includes(searchTerm.toLowerCase())
        ).length === 0 ? (
          <div className="col-span-full text-center py-16 bg-gray-900/60 rounded-2xl border border-gray-700">
            <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
            <p className="text-slate-400 text-lg">Tidak ada tagihan yang belum lunas</p>
          </div>
        ) : (
          unpaidTransactions
            .filter(t => 
              t.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
              t.invoice_number.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .map(t => (
            <div key={t.id} className="bg-gray-900/60 backdrop-blur-md p-6 rounded-2xl border border-red-500/20 shadow-lg hover:border-red-500/50 transition-all">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-lg text-white">{t.customer_name || "Pelanggan Umum"}</h3>
                  <p className="text-xs text-slate-400 font-mono">{t.invoice_number}</p>
                </div>
                <span className="px-3 py-1 bg-red-900/50 text-red-300 rounded-full text-xs font-bold border border-red-800">
                  Belum Lunas
                </span>
              </div>

              <div className="space-y-2 mb-4 text-sm">
                <div className="flex items-center gap-2 text-slate-400">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(t.date)}</span>
                </div>
              </div>

              <div className="border-t border-gray-700 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Total Tagihan</span>
                  <span className="text-white font-bold">{formatRupiah(t.total_amount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Sudah Dibayar</span>
                  <span className="text-green-400">{formatRupiah(t.amount_paid || 0)}</span>
                </div>
                <div className="flex justify-between text-lg font-black pt-2 border-t border-gray-700">
                  <span className="text-red-400">SISA TAGIHAN</span>
                  <span className="text-red-400">{formatRupiah(t.remaining_amount || 0)}</span>
                </div>
              </div>

              <button 
                onClick={() => openPaymentModal(t)}
                className="w-full mt-4 py-3 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 text-white rounded-xl font-bold shadow-[0_4px_0_rgb(194,65,12)] active:shadow-none active:translate-y-[4px] transition-all flex items-center justify-center gap-2"
              >
                <DollarSign className="w-5 h-5" /> Bayar / Lunasi
              </button>
            </div>
          ))
        )}
      </div>

      {/* MODAL PELUNASAN */}
      {isPaymentOpen && selectedTransaction && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl shadow-2xl w-full max-w-md p-6 border border-orange-500/30 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <Wallet className="w-6 h-6 text-orange-500" /> PELUNASAN TAGIHAN
              </h2>
              <button onClick={() => setIsPaymentOpen(false)} className="text-slate-400 hover:text-white"><X className="w-6 h-6"/></button>
            </div>

            <div className="bg-gray-800/50 p-4 rounded-xl mb-6 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Invoice</span>
                <span className="text-white font-mono">{selectedTransaction.invoice_number}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Pelanggan</span>
                <span className="text-white">{selectedTransaction.customer_name || "Umum"}</span>
              </div>
              <div className="border-t border-gray-700 pt-2 mt-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Tagihan</span>
                  <span className="text-white">{formatRupiah(selectedTransaction.total_amount)}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-slate-400">Sudah Dibayar</span>
                  <span className="text-green-400">{formatRupiah(selectedTransaction.amount_paid || 0)}</span>
                </div>
                <div className="flex justify-between text-lg font-black mt-2 text-red-400">
                  <span>Sisa Tagihan</span>
                  <span>{formatRupiah(selectedTransaction.remaining_amount || 0)}</span>
                </div>
              </div>
            </div>

            {/* METODE PEMBAYARAN */}
            <div className="mb-4">
              <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Metode Pembayaran</label>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  type="button" 
                  onClick={() => setPaymentMethod("Tunai")}
                  className={`p-3 rounded-xl text-sm font-bold border transition-all ${paymentMethod === 'Tunai' ? 'bg-green-600 border-green-500 text-white shadow-[0_4px_0_rgb(20,83,45)]' : 'bg-gray-800 border-gray-700 text-slate-400'}`}
                >
                  💵 Tunai
                </button>
                <button 
                  type="button" 
                  onClick={() => setPaymentMethod("Transfer")}
                  className={`p-3 rounded-xl text-sm font-bold border transition-all ${paymentMethod === 'Transfer' ? 'bg-blue-600 border-blue-500 text-white shadow-[0_4px_0_rgb(30,64,175)]' : 'bg-gray-800 border-gray-700 text-slate-400'}`}
                >
                  🏦 Transfer
                </button>
              </div>
            </div>

            {/* JUMLAH PEMBAYARAN */}
            <div className="mb-6">
              <label className="text-xs font-bold text-orange-400 uppercase mb-2 block">Jumlah Pembayaran</label>
              <input 
                type="number" 
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(Number(e.target.value))}
                max={selectedTransaction.remaining_amount}
                className="w-full p-4 bg-gray-800 border border-orange-500 rounded-xl text-white font-bold text-2xl text-right focus:ring-2 focus:ring-orange-500 outline-none"
                placeholder="0"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-2">
                <span>Maks: {formatRupiah(selectedTransaction.remaining_amount || 0)}</span>
                {paymentAmount < (selectedTransaction.remaining_amount || 0) && (
                  <span className="text-orange-400 font-bold">Sisa setelah bayar: {formatRupiah((selectedTransaction.remaining_amount || 0) - paymentAmount)}</span>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => { setIsPaymentOpen(false); setSelectedTransaction(null); }}
                className="flex-1 py-3 bg-gray-800 text-white rounded-xl font-bold hover:bg-gray-700 transition-all"
              >
                Batal
              </button>
              <button 
                onClick={handlePayment}
                disabled={paymentAmount <= 0}
                className="flex-1 py-3 bg-gradient-to-r from-orange-600 to-orange-700 disabled:from-gray-700 disabled:to-gray-800 text-white rounded-xl font-bold shadow-lg shadow-orange-900/50 hover:from-orange-500 hover:to-orange-600 transition-all disabled:shadow-none"
              >
                Proses Pembayaran
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NOTA PELUNASAN */}
      {showReceipt && lastPayment && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl shadow-2xl w-full max-w-md p-6 border border-green-500/30">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-green-400 flex items-center gap-2">
                <CheckCircle className="w-6 h-6" /> NOTA PELUNASAN
              </h2>
              <button onClick={() => setShowReceipt(false)} className="text-slate-400 hover:text-white"><X className="w-6 h-6"/></button>
            </div>

            {/* AREA NOTA UNTUK PRINT */}
            <div ref={receiptRef} className="bg-white text-black p-6 rounded-xl mb-6 font-mono text-xs">
              <div className="text-center border-b-2 border-black pb-4 mb-4">
                <h3 className="text-xl font-bold">BENGKEL SERVICE PRO</h3>
                <p className="text-xs mt-1">Nota Pembayaran Hutang</p>
              </div>
              
              <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                  <span>No. Invoice:</span>
                  <span className="font-bold">{lastPayment.invoiceNo}</span>
                </div>
                <div className="flex justify-between">
                  <span>Pelanggan:</span>
                  <span>{lastPayment.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tanggal:</span>
                  <span>{formatDate(lastPayment.paymentDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Metode:</span>
                  <span>{lastPayment.paymentMethod}</span>
                </div>
              </div>

              <div className="border-t-2 border-black pt-3 mb-3">
                <div className="flex justify-between text-sm mb-1">
                  <span>Total Tagihan Awal:</span>
                  <span>{formatRupiah(lastPayment.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Sudah Dibayar Sebelumnya:</span>
                  <span>{formatRupiah(lastPayment.previouslyPaid)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-orange-600 mb-2">
                  <span>Pembayaran Kali Ini:</span>
                  <span>{formatRupiah(lastPayment.thisPayment)}</span>
                </div>
              </div>

              <div className="border-t-2 border-black pt-3">
                <div className="flex justify-between text-lg font-bold">
                  <span>SISA TAGIHAN</span>
                  <span className={lastPayment.remaining === 0 ? "text-green-600" : "text-red-600"}>
                    {formatRupiah(lastPayment.remaining)}
                  </span>
                </div>
                {lastPayment.remaining === 0 && (
                  <p className="text-center text-green-600 font-bold mt-2 text-sm">✅ LUNAS</p>
                )}
              </div>

              <div className="text-center mt-6 text-xs text-gray-600">
                <p>Terima kasih atas pembayaran Anda</p>
              </div>
            </div>

            {/* TOMBOL AKSI */}
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setShowReceipt(false)}
                className="py-3 bg-gray-800 text-white rounded-xl font-bold hover:bg-gray-700 transition-all"
              >
                Tutup
              </button>
              <button 
                onClick={printReceipt}
                className="py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:from-green-500 hover:to-green-600 transition-all"
              >
                <Printer className="w-4 h-4" /> Cetak PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}