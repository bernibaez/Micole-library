import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { AppNotification } from '../types';

const LOCAL_NOTIF_KEY = 'lexlibrary:v2:notifications:';

function getDefaultLocalNotifications(userId: string): AppNotification[] {
  return [
    {
      id: 'notif-welcome',
      user_id: userId,
      title: 'Bienvenido a MICOLE LIBRARY',
      body: 'Explora legislación dominicana, doctrina y jurisprudencia procesal penal en un entorno editorial diseñado para el estudio.',
      type: 'system',
      action_url: '/explorar',
      read_at: null,
      created_at: new Date().toISOString(),
    },
    {
      id: 'notif-reader',
      user_id: userId,
      title: 'Nuevo lector PDF interactivo',
      body: 'Prueba búsqueda interna, miniaturas, marcadores de páginas y modo concentración en cualquier recurso.',
      type: 'reading',
      action_url: '/leer/1',
      read_at: null,
      created_at: new Date(Date.now() - 3600_000 * 5).toISOString(),
    },
  ];
}

export async function fetchNotifications(userId: string): Promise<AppNotification[]> {
  if (!isSupabaseConfigured || !supabase || userId === 'demo-user') {
    try {
      const raw = localStorage.getItem(`${LOCAL_NOTIF_KEY}${userId}`);
      if (raw) return JSON.parse(raw) as AppNotification[];
    } catch {
      // ignore
    }
    const defaults = getDefaultLocalNotifications(userId);
    localStorage.setItem(`${LOCAL_NOTIF_KEY}${userId}`, JSON.stringify(defaults));
    return defaults;
  }

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) return [];
  return (data ?? []) as AppNotification[];
}

export async function markNotificationRead(userId: string, notificationId: string): Promise<void> {
  const now = new Date().toISOString();
  if (!isSupabaseConfigured || !supabase || userId === 'demo-user') {
    const items = await fetchNotifications(userId);
    const updated = items.map((n) => (n.id === notificationId ? { ...n, read_at: now } : n));
    localStorage.setItem(`${LOCAL_NOTIF_KEY}${userId}`, JSON.stringify(updated));
    return;
  }

  await supabase
    .from('notifications')
    .update({ read_at: now })
    .eq('id', notificationId)
    .eq('user_id', userId);
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const now = new Date().toISOString();
  if (!isSupabaseConfigured || !supabase || userId === 'demo-user') {
    const items = await fetchNotifications(userId);
    const updated = items.map((n) => ({ ...n, read_at: n.read_at ?? now }));
    localStorage.setItem(`${LOCAL_NOTIF_KEY}${userId}`, JSON.stringify(updated));
    return;
  }

  await supabase
    .from('notifications')
    .update({ read_at: now })
    .eq('user_id', userId)
    .is('read_at', null);
}
