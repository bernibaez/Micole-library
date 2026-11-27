import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { getAppOrigin, isSupabaseConfigured, supabase } from '../../lib/supabase';
import { fetchUserProfile } from '../../services/profileService';
import type { UserProfile, UserRole } from '../../types';

const DEMO_SESSION_KEY = 'lexlibrary:v2:demo-auth-active';

export interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  userId: string | null;
  role: UserRole;
  isAdmin: boolean;
  isAuthenticated: boolean;
  isDemoSession: boolean;
  isLoading: boolean;
  isSupabaseConfigured: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (payload: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) => Promise<{ requiresEmailConfirmation: boolean }>;
  signInWithGoogle: (redirectTo?: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  signOut: () => Promise<void>;
  enterDemoSession: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}

export function mapAuthErrorMessage(rawMessage: string): string {
  const lower = rawMessage.toLowerCase();
  if (lower.includes('invalid login credentials')) {
    return 'Correo electrónico o contraseña incorrectos.';
  }
  if (lower.includes('email not confirmed')) {
    return 'Tu correo aún no ha sido confirmado. Revisa tu bandeja de entrada.';
  }
  if (lower.includes('user already registered')) {
    return 'Ya existe una cuenta registrada con este correo electrónico.';
  }
  if (lower.includes('password should be at least')) {
    return 'La contraseña debe tener al menos 8 caracteres.';
  }
  if (lower.includes('rate limit') || lower.includes('too many requests')) {
    return 'Demasiados intentos en poco tiempo. Espera unos minutos e inténtalo nuevamente.';
  }
  if (lower.includes('provider is not enabled')) {
    return 'El inicio de sesión con Google no está habilitado todavía en tu proyecto de Supabase.';
  }
  return rawMessage || 'Ocurrió un error al autenticar. Intenta nuevamente.';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [rpcIsAdmin, setRpcIsAdmin] = useState<boolean>(false);
  const [isDemoSession, setIsDemoSession] = useState<boolean>(() => {
    if (isSupabaseConfigured) return false;
    try {
      return localStorage.getItem(DEMO_SESSION_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [isLoading, setIsLoading] = useState(true);

  const loadProfile = useCallback(async (uid: string, email = '') => {
    try {
      const data = await fetchUserProfile(uid, email);
      setProfile(data);
      if (isSupabaseConfigured && supabase && uid !== 'demo-user') {
        if (data.role === 'admin') {
          setRpcIsAdmin(true);
        } else {
          const { data: adminFlag } = await supabase.rpc('is_admin');
          setRpcIsAdmin(Boolean(adminFlag));
        }
      } else {
        setRpcIsAdmin(false);
      }
    } catch (err) {
      console.warn('[LexLibrary Auth] No se pudo cargar el perfil:', err);
      setProfile(null);
      if (isSupabaseConfigured && supabase && uid !== 'demo-user') {
        try {
          const { data: adminFlag } = await supabase.rpc('is_admin');
          setRpcIsAdmin(Boolean(adminFlag));
        } catch {
          setRpcIsAdmin(false);
        }
      } else {
        setRpcIsAdmin(false);
      }
    }
  }, []);

  useEffect(() => {
    let active = true;

    const init = async () => {
      if (!isSupabaseConfigured || !supabase) {
        if (isDemoSession) {
          await loadProfile('demo-user', 'demo@lexlibrary.do');
        } else if (active) {
          setProfile(null);
        }
        if (active) setIsLoading(false);
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (!active) return;
      setSession(data.session ?? null);
      if (data.session?.user) {
        await loadProfile(data.session.user.id, data.session.user.email ?? '');
      } else {
        setProfile(null);
      }
      if (active) setIsLoading(false);
    };

    void init();

    if (!isSupabaseConfigured || !supabase) {
      return () => {
        active = false;
      };
    }

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      if (nextSession?.user) {
        const uid = nextSession.user.id;
        const email = nextSession.user.email ?? '';
        // Diferir consultas DB fuera del callback de onAuthStateChange para evitar bloqueos de auth-js
        window.setTimeout(() => {
          if (active) void loadProfile(uid, email);
        }, 0);
      } else {
        setProfile(null);
        setRpcIsAdmin(false);
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [isDemoSession, loadProfile]);

  const user = session?.user ?? null;
  const userId = user?.id ?? (isDemoSession ? 'demo-user' : null);
  const isAuthenticated = Boolean(user || isDemoSession);
  // Biblioteca personal: cualquier usuario autenticado puede gestionar documentos y conectar Google Drive
  const role: UserRole =
    isSupabaseConfigured && user
      ? 'admin'
      : profile?.role === 'admin' || rpcIsAdmin
        ? 'admin'
        : 'visitor';
  const isAdmin = role === 'admin';

  const refreshProfile = useCallback(async () => {
    if (!userId) return;
    await loadProfile(userId, user?.email ?? profile?.email ?? '');
  }, [loadProfile, profile?.email, user?.email, userId]);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error(
        'Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY para iniciar sesión con Supabase Auth.'
      );
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(mapAuthErrorMessage(error.message));
  }, []);

  const signUpWithEmail = useCallback(
    async ({
      email,
      password,
      firstName,
      lastName,
    }: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
    }) => {
      if (!isSupabaseConfigured || !supabase) {
        throw new Error(
          'Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY para crear cuentas reales en Supabase.'
        );
      }
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${getAppOrigin()}/confirmar-correo`,
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            full_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
          },
        },
      });
      if (error) throw new Error(mapAuthErrorMessage(error.message));
      return { requiresEmailConfirmation: !data.session };
    },
    []
  );

  const signInWithGoogle = useCallback(async (redirectTo?: string) => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error(
        'Google OAuth requiere configurar Supabase y habilitar el proveedor Google en Authentication.'
      );
    }
    const target = redirectTo
      ? `${getAppOrigin()}${redirectTo.startsWith('/') ? redirectTo : `/${redirectTo}`}`
      : `${getAppOrigin()}/`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: target },
    });
    if (error) throw new Error(mapAuthErrorMessage(error.message));
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('La recuperación de contraseña requiere configurar Supabase Auth.');
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${getAppOrigin()}/restablecer-contrasena`,
    });
    if (error) throw new Error(mapAuthErrorMessage(error.message));
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('El cambio de contraseña requiere configurar Supabase Auth.');
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(mapAuthErrorMessage(error.message));
  }, []);

  const enterDemoSession = useCallback(async () => {
    if (isSupabaseConfigured) return;
    localStorage.setItem(DEMO_SESSION_KEY, 'true');
    setIsDemoSession(true);
    await loadProfile('demo-user', 'demo@lexlibrary.do');
  }, [loadProfile]);

  const signOut = useCallback(async () => {
    if (isDemoSession) {
      localStorage.removeItem(DEMO_SESSION_KEY);
      setIsDemoSession(false);
      setProfile(null);
      return;
    }
    if (supabase) {
      await supabase.auth.signOut();
    }
    setSession(null);
    setProfile(null);
    setRpcIsAdmin(false);
  }, [isDemoSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      profile,
      userId,
      role,
      isAdmin,
      isAuthenticated,
      isDemoSession,
      isLoading,
      isSupabaseConfigured,
      signInWithEmail,
      signUpWithEmail,
      signInWithGoogle,
      sendPasswordReset,
      updatePassword,
      signOut,
      enterDemoSession,
      refreshProfile,
    }),
    [
      enterDemoSession,
      isAdmin,
      isAuthenticated,
      isDemoSession,
      isLoading,
      profile,
      refreshProfile,
      role,
      sendPasswordReset,
      session,
      signInWithEmail,
      signInWithGoogle,
      signOut,
      signUpWithEmail,
      updatePassword,
      user,
      userId,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
