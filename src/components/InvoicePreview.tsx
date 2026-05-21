"use client";
import { useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface InvoiceProps {
  invoiceNo: string;
  customerName: string;
  items: { name: string; qty: number; price: number; total: number }[];
  totalAmount: number;
}

export default function InvoicePreview({ invoiceNo, customerName, items, totalAmount }: InvoiceProps) {
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [waNumber, setWaNumber] = useState("");

  const printInvoice = async () => {
    if (!invoiceRef.current) return;
    const canvas = await html2canvas(invoiceRef.current);
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: [300, 600] });
    pdf.addImage(imgData, "PNG", 0, 0, 300, 500); 
    pdf.save(`Struk_${invoiceNo}.pdf`);
  };

  const sendViaWA = () => {
    if (!waNumber) return alert("Masukkan nomor WA pelanggan (contoh: 6281234567890)");
    
    const itemsText = items.map(i => `- ${i.name} x${i.qty}: Rp ${i.total.toLocaleString('id-ID')}`).join('\n');
    const message = `*BENGKEL SERVICE PRO*\nNo. Inv: ${invoiceNo}\nPelanggan: ${customerName || 'Umum'}\n\n${itemsText}\n\n*TOTAL: Rp ${totalAmount.toLocaleString('id-ID')}*\n\nTerima kasih atas kunjungan Anda! `;
    
    const encodedMsg = encodeURIComponent(message);
    window.open(`https://wa.me/${waNumber}?text=${encodedMsg}`, '_blank');
  };

  return (
    <div className="flex flex-col items-center gap-4 p-2">
      <div className="flex w-full gap-2">
        <input 
          type="tel" 
          placeholder="No. WA (628...)" 
          value={waNumber}
          onChange={(e) => setWaNumber(e.target.value)}
          className="flex-1 p-2 border rounded text-sm dark:bg-slate-800 dark:border-slate-600 dark:text-white"
        />
        <button onClick={sendViaWA} className="bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium flex gap-1 items-center">
          📱 Kirim WA
        </button>
      </div>
      
      <button onClick={printInvoice} className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 flex gap-2 justify-center">
        🖨️ Download PDF Struk
      </button>

      <div ref={invoiceRef} className="bg-white text-black p-6 w-full max-w-[300px] font-mono text-xs shadow-xl border-2 border-dashed border-gray-300 mt-4">
        <div className="text-center border-b pb-4 mb-4">
          <h2 className="text-xl font-bold">BENGKEL SERVICE PRO</h2>
          <p>Jl. Bengkel No. 1, Kota Anda</p>
          <p>Telp: 0812-3456-7890</p>
        </div>
        <div className="mb-4 space-y-1">
          <div className="flex justify-between"><span>No. Inv:</span><span className="font-bold">{invoiceNo}</span></div>
          <div className="flex justify-between"><span>Pelanggan:</span><span>{customerName || "Umum"}</span></div>
          <div className="flex justify-between"><span>Tgl:</span><span>{new Date().toLocaleDateString('id-ID')}</span></div>
        </div>
        <div className="border-t border-b py-2 mb-2 space-y-2">
          {items.map((item, idx) => (
            <div key={idx} className="flex justify-between"><span>{item.name} x{item.qty}</span><span>Rp {item.total.toLocaleString('id-ID')}</span></div>
          ))}
        </div>
        <div className="flex justify-between text-lg font-bold pt-2 border-t"><span>TOTAL</span><span>Rp {totalAmount.toLocaleString('id-ID')}</span></div>
        <div className="text-center mt-6 text-[10px] text-gray-500">
          <p>Terima Kasih atas Kunjungan Anda!</p>
          <p>Garansi Servis 7 Hari</p>
        </div>
      </div>
    </div>
  );
}