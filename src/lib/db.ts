import Dexie, { Table } from 'dexie';

// --- INTERFACES ---
export interface Item { id?: number; sku: string; name: string; category: string; stock: number; buy_price: number; sell_price: number; image?: string; updated_at: number; }
export interface SPK { id?: number; spk_number: string; date: number; vehicle_plate: string; vehicle_info: string; owner_name: string; current_km: number; next_km_service: number; complaints: string; mechanic_name: string; services: any[]; parts: any[]; total_service_cost: number; total_parts_cost: number; grand_total: number; status: string; created_at: number; updated_at: number; }
export interface Transaction { id?: number; invoice_number: string; date: number; customer_name?: string; total_amount: number; total_cost?: number; items: any[]; type?: string; status: string; payment_method?: string; amount_paid?: number; remaining_amount?: number; discount?: number; tax?: number; created_at?: number; }
export interface ServiceRecord { id?: number; spk_id?: number; customer_name: string; vehicle_plate: string; service_type: string; description?: string; date: number; cost: number; status: string; updated_at: number; }
export interface ServiceQueue { id?: number; queue_number: string; vehicle_plate: string; owner_name?: string; service_type?: string; estimated_time?: number; status: string; created_at: number; updated_at: number; }
export interface PendingTransaction { id?: number; temp_id: string; date: number; customer_name: string; vehicle_plate: string; items: any[]; subtotal: number; discount: number; tax: number; total: number; notes?: string; created_at: number; updated_at: number; }
export interface Expense { id?: number; date: number; category: string; description?: string; amount: number; receipt_image?: string; created_at?: number; updated_at?: number; }
export interface Customer { id?: number; name: string; phone: string; vehicle_plate?: string; notes?: string; updated_at: number; }
export interface BengkelConfig { id?: number; nama: string; alamat?: string; telepon?: string; logo_url?: string; updated_at?: string; }
export interface Vehicle { id?: number; plate: string; owner_name: string; model?: string; year?: number; last_service_date?: number; last_service_km?: number; notes?: string; updated_at: number; }

// --- DATABASE CLASS ---
class BengkelDB extends Dexie {
  items!: Table<Item, number>;
  spk!: Table<SPK, number>;
  transactions!: Table<Transaction, number>;
  riwayat_servis!: Table<ServiceRecord, number>;
  service_queue!: Table<ServiceQueue, number>;
  pending_transactions!: Table<PendingTransaction, number>;
  expenses!: Table<Expense, number>;
  customers!: Table<Customer, number>;
  vehicles!: Table<Vehicle, number>;

  constructor() {
    super("BengkelDB");
    this.version(1).stores({
      items: "++id, sku, name, category, stock, updated_at",
      spk: "++id, spk_number, vehicle_plate, status, date",
      transactions: "++id, invoice_number, date, status",
      riwayat_servis: "++id, spk_id, vehicle_plate, date",
      service_queue: "++id, queue_number, vehicle_plate, status, created_at",
      pending_transactions: "++id, temp_id, date",
      expenses: "++id, date, category",
      customers: "++id, name, phone, vehicle_plate, updated_at",
      vehicles: "++id, plate, owner_name, updated_at"
    });
  }
}

export const db = new BengkelDB();