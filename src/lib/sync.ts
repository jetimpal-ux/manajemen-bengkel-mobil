import { db } from "./db";
import { supabase } from "./supabaseClient";

export async function syncData() {
  try {
    console.log("🔄 MEMULAI SINKRONISASI...");

    // STEP 1: Upload data lokal ke Supabase
    console.log("📤 Step 1: Upload data lokal ke cloud...");
    const localItems = await db.items.toArray();
    console.log(`📦 Ditemukan ${localItems.length} item di database lokal`);
    
    if (localItems.length > 0) {
      // Format data untuk Supabase (pastikan format tanggal benar)
      const itemsToSend = localItems.map(item => ({
        id: item.id,
        sku: item.sku || "",
        name: item.name || "",
        category: item.category || "Umum",
        stock: item.stock || 0,
        buy_price: item.buy_price || 0,
        sell_price: item.sell_price || 0,
        image: item.image || null,
        updated_at: new Date(item.updated_at || Date.now()).toISOString()
      }));

      console.log("📮 Mengirim data ke Supabase...", itemsToSend);

      // Upsert ke Supabase (insert atau update jika ada)
      const { data: uploadData, error: uploadError } = await supabase
        .from("items")
        .upsert(itemsToSend, { 
          onConflict: "id",
          ignoreDuplicates: false
        });

      if (uploadError) {
        console.error("❌ ERROR UPLOAD:", uploadError);
        throw uploadError;
      }
      
      console.log("✅ Upload berhasil! Data terkirim:", uploadData);
    }

    // STEP 2: Download data dari Supabase
    console.log("📥 Step 2: Download data dari cloud...");
    const { data: cloudItems, error: fetchError } = await supabase
      .from("items")
      .select("*")
      .order("updated_at", { ascending: false });

    if (fetchError) {
      console.error("❌ ERROR DOWNLOAD:", fetchError);
      throw fetchError;
    }

    console.log("📦 Data dari cloud:", cloudItems);

    // STEP 3: Update database lokal
    if (cloudItems && cloudItems.length > 0) {
      console.log(`💾 Menyimpan ${cloudItems.length} item ke database lokal...`);
      
      // Clear dulu database lokal
      await db.items.clear();
      
      // Format data dari Supabase ke format lokal
      const localData = cloudItems.map(item => ({
        id: item.id,
        sku: item.sku,
        name: item.name,
        category: item.category,
        stock: item.stock,
        buy_price: Number(item.buy_price) || 0,
        sell_price: Number(item.sell_price) || 0,
        image: item.image,
        updated_at: new Date(item.updated_at).getTime()
      }));

      await db.items.bulkAdd(localData);
      console.log("✅ Download selesai! Data tersimpan di lokal");
    } else {
      console.log("⚠️ Tidak ada data di cloud");
    }

    // ==========================================
    // STEP 4: SYNC KENDARAAN (VEHICLES) 🚗
    // ==========================================
    console.log("🚗 Step 4: Sync Kendaraan...");
    const localVehicles = await db.vehicles.toArray();
    console.log(`📦 Ditemukan ${localVehicles.length} kendaraan di database lokal`);
    
    if (localVehicles.length > 0) {
      const vehiclesToSend = localVehicles.map(v => ({
        id: v.id,
        plate_number: v.plate_number,
        brand: v.brand,
        model: v.model,
        year: v.year,
        owner_name: v.owner_name,
        updated_at: new Date(v.updated_at || Date.now()).toISOString()
      }));

      console.log("📮 Mengirim data kendaraan ke Supabase...", vehiclesToSend);

      const { error: vUploadError } = await supabase
        .from("vehicles")
        .upsert(vehiclesToSend, { 
          onConflict: "id",
          ignoreDuplicates: false
        });

      if (vUploadError) {
        console.error("❌ ERROR UPLOAD VEHICLES:", vUploadError);
        throw vUploadError;
      }
      
      console.log("✅ Upload kendaraan berhasil!");
    }

    // STEP 5: Download kendaraan dari Supabase
    console.log("📥 Step 5: Download kendaraan dari cloud...");
    const { data: cloudVehicles, error: vFetchError } = await supabase
      .from("vehicles")
      .select("*")
      .order("updated_at", { ascending: false });

    if (vFetchError) {
      console.error("❌ ERROR DOWNLOAD VEHICLES:", vFetchError);
      throw vFetchError;
    }

    console.log("📦 Data kendaraan dari cloud:", cloudVehicles);

    // STEP 6: Update database lokal untuk kendaraan
    if (cloudVehicles && cloudVehicles.length > 0) {
      console.log(`💾 Menyimpan ${cloudVehicles.length} kendaraan ke database lokal...`);
      
      await db.vehicles.clear();
      
      const vehicleData = cloudVehicles.map(v => ({
        id: v.id,
        plate_number: v.plate_number,
        brand: v.brand,
        model: v.model,
        year: v.year,
        owner_name: v.owner_name,
        updated_at: new Date(v.updated_at).getTime()
      }));

      await db.vehicles.bulkAdd(vehicleData);
      console.log("✅ Download kendaraan selesai! Data tersimpan di lokal");
    } else {
      console.log("⚠️ Tidak ada data kendaraan di cloud");
    }

    return { 
      success: true, 
      message: `Sinkronisasi berhasil! ${localItems.length} item & ${localVehicles.length} kendaraan di-sync`
    };
    
  } catch (error: any) {
    console.error("❌ GAGAL SYNC:", error);
    return { 
      success: false, 
      error: error.message || "Terjadi kesalahan saat sinkronisasi"
    };
  }
}