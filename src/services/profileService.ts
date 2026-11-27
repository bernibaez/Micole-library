import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { UserPreferences, UserProfile } from '../types';

const LOCAL_PROFILE_KEY = 'lexlibrary:v2:profile:';
const LOCAL_PREFS_KEY = 'lexlibrary:v2:prefs:';

export const DEFAULT_PREFERENCES = (userId: string): UserPreferences => ({
  user_id: userId,
  reader_theme: 'light',
  reader_zoom: 1,
  reader_fit_mode: 'width',
  reduce_motion: false,
  email_notifications: true,
  catalog_view: 'grid',
});

export async function fetchUserProfile(
  userId: string,
  fallbackEmail = ''
): Promise<UserProfile> {
  if (!isSupabaseConfigured || !supabase || userId === 'demo-user') {
    try {
      const raw = localStorage.getItem(`${LOCAL_PROFILE_KEY}${userId}`);
      if (raw) return JSON.parse(raw) as UserProfile;
    } catch {
      // ignore
    }
    const demoProfile: UserProfile = {
      id: userId,
      first_name: 'Lector',
      last_name: 'Académico',
      email: fallbackEmail || 'demo@lexlibrary.do',
      role: 'visitor',
      phone: null,
      institution: 'Facultad de Ciencias Jurídicas y Políticas',
      career: 'Licenciatura en Derecho',
      user_type: 'estudiante',
      bio: 'Perfil local de demostración. Configura Supabase para sincronizar tu cuenta en la nube.',
      avatar_url: null,
      created_at: new Date().toISOString(),
    };
    return demoProfile;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  if (data) {
    return {
      ...(data as UserProfile),
      role: data.role === 'admin' ? 'admin' : 'visitor',
    };
  }

  const created: UserProfile = {
    id: userId,
    first_name: '',
    last_name: '',
    email: fallbackEmail,
    role: 'visitor',
    phone: null,
    institution: null,
    career: null,
    user_type: 'estudiante',
    bio: null,
    avatar_url: null,
    created_at: new Date().toISOString(),
  };

  await supabase.from('profiles').upsert(created, { onConflict: 'id' });
  return created;
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<Omit<UserProfile, 'id' | 'created_at' | 'role'>>
): Promise<UserProfile> {
  if (!isSupabaseConfigured || !supabase || userId === 'demo-user') {
    const current = await fetchUserProfile(userId, updates.email ?? '');
    const merged: UserProfile = {
      ...current,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    localStorage.setItem(`${LOCAL_PROFILE_KEY}${userId}`, JSON.stringify(merged));
    return merged;
  }

  const { data, error } = await supabase
    .from('profiles')
    .upsert({ id: userId, ...updates }, { onConflict: 'id' })
    .select()
    .single();
  if (error) throw error;
  return data as UserProfile;
}

export async function uploadUserAvatar(userId: string, file: Blob): Promise<string> {
  if (!isSupabaseConfigured || !supabase || userId === 'demo-user') {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('No se pudo procesar la imagen.'));
      reader.readAsDataURL(file);
    });
    await updateUserProfile(userId, { avatar_url: dataUrl });
    return dataUrl;
  }

  const path = `${userId}/avatar-${Date.now()}.webp`;
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, file, {
      contentType: file.type || 'image/webp',
      upsert: true,
    });
  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
  const publicUrl = urlData.publicUrl;
  await updateUserProfile(userId, { avatar_url: publicUrl });
  return publicUrl;
}

export async function removeUserAvatar(userId: string): Promise<void> {
  if (isSupabaseConfigured && supabase && userId !== 'demo-user') {
    const { data: files } = await supabase.storage.from('avatars').list(userId);
    if (files && files.length > 0) {
      await supabase.storage
        .from('avatars')
        .remove(files.map((f) => `${userId}/${f.name}`));
    }
  }
  await updateUserProfile(userId, { avatar_url: null });
}

export async function fetchUserPreferences(userId: string): Promise<UserPreferences> {
  if (!isSupabaseConfigured || !supabase || userId === 'demo-user') {
    try {
      const raw = localStorage.getItem(`${LOCAL_PREFS_KEY}${userId}`);
      if (raw) return { ...DEFAULT_PREFERENCES(userId), ...(JSON.parse(raw) as Partial<UserPreferences>) };
    } catch {
      // ignore
    }
    return DEFAULT_PREFERENCES(userId);
  }

  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) return DEFAULT_PREFERENCES(userId);
  return {
    ...(data as UserPreferences),
    reader_zoom: Number(data.reader_zoom ?? 1),
  };
}

export async function updateUserPreferences(
  userId: string,
  updates: Partial<Omit<UserPreferences, 'user_id'>>
): Promise<UserPreferences> {
  if (!isSupabaseConfigured || !supabase || userId === 'demo-user') {
    const current = await fetchUserPreferences(userId);
    const merged: UserPreferences = { ...current, ...updates };
    localStorage.setItem(`${LOCAL_PREFS_KEY}${userId}`, JSON.stringify(merged));
    return merged;
  }

  const { data, error } = await supabase
    .from('user_preferences')
    .upsert({ user_id: userId, ...updates }, { onConflict: 'user_id' })
    .select()
    .single();
  if (error) throw error;
  return {
    ...(data as UserPreferences),
    reader_zoom: Number(data.reader_zoom ?? 1),
  };
}
