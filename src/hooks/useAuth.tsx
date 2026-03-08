import { useState, useEffect, createContext, useContext, useCallback, useMemo } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export type AppRole = 'admin' | 'manager' | 'supervisor' | 'agent';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: { full_name: string | null; avatar_url: string | null; department: string | null } | null;
  roles: AppRole[];
  loading: boolean;
  hasRole: (role: AppRole) => boolean;
  hasAnyRole: (...roles: AppRole[]) => boolean;
  isAdmin: boolean;
  isManager: boolean;
  isSupervisor: boolean;
  primaryRole: AppRole;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const ROLE_HIERARCHY: Record<AppRole, number> = {
  admin: 4,
  manager: 3,
  supervisor: 2,
  agent: 1,
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AuthContextType['profile']>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => {
          fetchProfile(session.user.id);
          fetchRoles(session.user.id);
        }, 0);
      } else {
        setProfile(null);
        setRoles([]);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
        fetchRoles(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId: string) {
    const { data } = await supabase.from('profiles').select('full_name, avatar_url, department').eq('user_id', userId).single();
    if (data) setProfile(data);
  }

  async function fetchRoles(userId: string) {
    const { data } = await supabase.from('user_roles').select('role').eq('user_id', userId);
    if (data) setRoles(data.map(r => r.role));
  }

  const hasRole = useCallback((role: AppRole) => roles.includes(role), [roles]);
  const hasAnyRole = useCallback((...checkRoles: AppRole[]) => checkRoles.some(r => roles.includes(r)), [roles]);

  const isAdmin = useMemo(() => roles.includes('admin'), [roles]);
  const isManager = useMemo(() => roles.includes('admin') || roles.includes('manager'), [roles]);
  const isSupervisor = useMemo(() => roles.includes('admin') || roles.includes('manager') || roles.includes('supervisor'), [roles]);

  const primaryRole = useMemo(() => {
    if (roles.length === 0) return 'agent' as AppRole;
    return roles.reduce((highest, role) =>
      ROLE_HIERARCHY[role] > ROLE_HIERARCHY[highest] ? role : highest
    , roles[0]);
  }, [roles]);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  }

  async function signUp(email: string, password: string, fullName: string) {
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName }, emailRedirectTo: window.location.origin }
    });
    return { error: error as Error | null };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{
      user, session, profile, roles, loading,
      hasRole, hasAnyRole, isAdmin, isManager, isSupervisor, primaryRole,
      signIn, signUp, signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
