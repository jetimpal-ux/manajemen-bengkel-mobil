import { db } from "./db";

export interface BackupData {
  version: string;
  timestamp: number;
  tables: {
    items: any[];
    customers: any[];
    vehicles: any[];
    transactions: any[];
    spk: any[];
    pending_transactions: any[];
    riwayat_servis: any[];
    expenses: any[];
    service_queue: any[];
  };
}

export async function exportBackup(): Promise<BackupData> {
  const backup: BackupData = {
    version: "1.0",
    timestamp: Date.now(),
    tables: {
      items: await db.items.toArray(),
      customers: await db.customers.toArray(),
      vehicles: await db.vehicles.toArray(),
      transactions: await db.transactions.toArray(),
      spk: await db.spk.toArray(),
      pending_transactions: await db.pending_transactions.toArray(),
      riwayat_servis: await db.riwayat_servis.toArray(),
      expenses: await db.expenses.toArray(),
      service_queue: await db.service_queue.toArray(),
    }
  };
  
  return backup;
}

export async function importBackup(backupData: BackupData): Promise<{ success: boolean; message: string }> {
  try {
    // Clear semua tabel dulu
    await Promise.all([
      db.items.clear(),
      db.customers.clear(),
      db.vehicles.clear(),
      db.transactions.clear(),
      db.spk.clear(),
      db.pending_transactions.clear(),
      db.riwayat_servis.clear(),
      db.expenses.clear(),
      db.service_queue.clear(),
    ]);

    // Restore data
    await Promise.all([
      backupData.tables.items.length > 0 && db.items.bulkAdd(backupData.tables.items),
      backupData.tables.customers.length > 0 && db.customers.bulkAdd(backupData.tables.customers),
      backupData.tables.vehicles.length > 0 && db.vehicles.bulkAdd(backupData.tables.vehicles),
      backupData.tables.transactions.length > 0 && db.transactions.bulkAdd(backupData.tables.transactions),
      backupData.tables.spk.length > 0 && db.spk.bulkAdd(backupData.tables.spk),
      backupData.tables.pending_transactions.length > 0 && db.pending_transactions.bulkAdd(backupData.tables.pending_transactions),
      backupData.tables.riwayat_servis.length > 0 && db.riwayat_servis.bulkAdd(backupData.tables.riwayat_servis),
      backupData.tables.expenses.length > 0 && db.expenses.bulkAdd(backupData.tables.expenses),
      backupData.tables.service_queue.length > 0 && db.service_queue.bulkAdd(backupData.tables.service_queue),
    ]);

    // Simpan timestamp backup terakhir
    localStorage.setItem('last_backup_timestamp', backupData.timestamp.toString());

    return { success: true, message: `✅ Restore berhasil! ${Object.values(backupData.tables).flat().length} data dipulihkan.` };
  } catch (error: any) {
    console.error("Restore error:", error);
    return { success: false, message: `❌ Gagal restore: ${error.message}` };
  }
}

export function getLastBackupTime(): number | null {
  const ts = localStorage.getItem('last_backup_timestamp');
  return ts ? Number(ts) : null;
}