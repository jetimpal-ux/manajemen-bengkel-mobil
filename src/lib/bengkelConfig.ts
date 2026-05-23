import { createClient } from '@supabase/supabase-js';
import { BengkelConfig } from './db';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export const getBengkelConfig = async (): Promise<BengkelConfig | null> => {
  try {
    const { data, error } = await supabase
      .from('bengkel_config')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching bengkel config:', error);
    return null;
  }
};

export const updateBengkelConfig = async (config: Partial<BengkelConfig>): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('bengkel_config')
      .update({ 
        ...config, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', 1);
    
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Error updating bengkel config:', error);
    return { success: false, error: error.message };
  }
};

export const uploadLogo = async (file: File): Promise<{ success: boolean; url?: string; error?: string }> => {
  try {
    if (!file.type.startsWith('image/')) {
      return { success: false, error: 'File harus berupa gambar' };
    }
    if (file.size > 2 * 1024 * 1024) {
      return { success: false, error: 'Ukuran file maksimal 2MB' };
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `logo-${Date.now()}.${fileExt}`;
    const filePath = `logos/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('bengkel-assets')
      .upload(filePath, file, { upsert: true });
    
    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('bengkel-assets')
      .getPublicUrl(filePath);
    
    return { success: true, url: data.publicUrl };
  } catch (error: any) {
    console.error('Error uploading logo:', error);
    return { success: false, error: error.message };
  }
};