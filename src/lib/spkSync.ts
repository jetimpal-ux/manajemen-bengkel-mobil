import { createClient } from '@supabase/supabase-js';
import { SPK } from './db';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function uploadSPKToSupabase(spk: SPK) {
  try {
    const { data, error } = await supabase
      .from('spk')
      .upsert({
        id: spk.id,
        spk_number: spk.spk_number,
        date: spk.date,
        vehicle_plate: spk.vehicle_plate,
        vehicle_info: spk.vehicle_info,
        owner_name: spk.owner_name,
        current_km: spk.current_km,
        next_km_service: spk.next_km_service,
        complaints: spk.complaints,
        mechanic_name: spk.mechanic_name,
        services: spk.services,
        parts: spk.parts,
        total_service_cost: spk.total_service_cost,
        total_parts_cost: spk.total_parts_cost,
        grand_total: spk.grand_total,
        status: spk.status,
        created_at: spk.created_at,
        updated_at: spk.updated_at
      }, { onConflict: 'spk_number' });

    if (error) throw error;
    console.log('✅ SPK berhasil di-sync ke Supabase:', spk.spk_number);
    return { success: true, data };
  } catch (error: any) {
    console.error('❌ Error sync SPK ke Supabase:', error.message);
    return { success: false, error: error.message };
  }
}