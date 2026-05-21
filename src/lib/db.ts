import Dexie, { Table } from 'dexie';

// 1. Interface untuk Item/Barang
export interface Item {
  id?: number;
  sku: string;
  name: string;
  category: string;
  stock: number;
  buy_price: number;
  sell_price: number;
  image?: string;
  updated_at: number;
}

// 2. Interface untuk SPK
export interface SPK {
  id?: number;
  spk_number: string;
  date: number;
  vehicle_plate: string;
  vehicle_info: string;
  owner_name: string;
  current_km: number;
  next_km_service: number;
  complaints: string;
  mechanic_name: string;
  services: { name: string; duration: number; price: number }[];
  parts: { name: string; qty: number; price: number }[];
  total_service_cost: number;
  total_parts_cost: number;
  grand_total: number;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  created_at: number;
  updated_at: number;
}

// 3. Interface untuk Customer
export interface Customer {
  id?: number;
  name: string;
  phone?: string;
  vehicle_plate?: string;
  email?: string;
  address?: string;
  notes?: string;
  updated_at: number;
}

// 4. Interface untuk Vehicle
export interface Vehicle {
  id?: number;
  plate_number: string;
  brand?: string;
  model?: string;
  year?: number;
  owner_name?: string;
  phone?: string;
  updated_at: number;
}

// 5. Interface untuk Transaction
export interface Transaction {
  id?: number;
  invoice_number: string;
  date: number;
  customer_name?: string;
  total_amount: number;
  total_cost?: number;
  items: any[];
  type?: string;
  status: 'Lunas' | 'Belum Lunas';
  payment_method?: string;
  amount_paid?: number;
  remaining_amount?: number;
  discount?: number;
  tax?: number;
  created_at?: number;
}

// 6. Interface untuk Riwayat Servis
export interface ServiceRecord {
  id?: number;
  spk_id?: number;
  customer_name: string;
  vehicle_plate: string;
  service_type: string;
  description?: string;
  date: number;
  cost: number;
  status: string;
  updated_at: number;
}

// 7. Interface untuk Pending Transaction
export interface PendingTransaction {
  id?: number;
  temp_id: string;
  date: number;
  customer_name: string;
  vehicle_plate: string;
  items: any[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  notes?: string;
  created_at: number;
  updated_at: number;
}

// 8. Interface untuk Service Queue
export interface ServiceQueue {
  id?: number;
  queue_number: string;
  vehicle_plate: string;
  owner_name?: string;
  service_type?: string;
  estimated_time?: number;
  status: 'waiting' | 'in_progress' | 'completed';
  created_at: number;
  updated_at: number;
}

// 9. Interface untuk Expense
export interface Expense {
  id?: number;
  date: number;
  category: string;
  description?: string;
  amount: number;
  receipt_image?: string;
  created_at?: number;
  updated_at?: number;
}

// 10. Database Class dengan typing yang benar
class BengkelDatabase extends Dexie {
  items!: Table<Item, number>;
  spk!: Table<SPK, number>;
  customers!: Table<Customer, number>;
  vehicles!: Table<Vehicle, number>;
  transactions!: Table<Transaction, number>;
  riwayat_servis!: Table<ServiceRecord, number>;
  pending_transactions!: Table<PendingTransaction, number>;
  service_queue!: Table<ServiceQueue, number>;
  expenses!: Table<Expense, number>;

  constructor() {
    super("BengkelDatabase");
    
    this.version(2).stores({
      items: "++id, sku, name, category, stock, updated_at",
      spk: "++id, spk_number, vehicle_plate, status, date",
      customers: "++id, name, phone, vehicle_plate, updated_at",
      vehicles: "++id, plate_number, owner_name, updated_at",
      transactions: "++id, invoice_number, date, customer_name, status",
      pending_transactions: "++id, temp_id, date, customer_name",
      expenses: "++id, date, category, description",
      service_queue: "++id, queue_number, vehicle_plate, status, created_at",
      riwayat_servis: "++id, spk_id, vehicle_plate, date, status"
    });
  }
}

// 11. Export database instance
export const db = new BengkelDatabase();
