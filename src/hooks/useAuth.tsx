import { useState, useEffect, createContext, useContext, useCallback, useMemo, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export type AppRole = 'admin' | 'manager' | 'supervisor' | 'agent';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: { full_name: string | null; avatar_url: string | null; department: string | null; is_approved: boolean } | null;
  roles: AppRole[];
  loading: boolean;
  isApproved: boolean;
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
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [rolesLoaded, setRolesLoaded] = useState(false);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let isMounted = true;
    let attempts = 0;
    const maxAttempts = 1; // Only try once per auth state change
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      
      if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
      
      setSession(session);
      setUser(session?.user ?? null);
      setProfileLoaded(false);
      setRolesLoaded(false);
      attempts = 0;
      
      if (session?.user) {
        // Delay fetch by 500ms to let database triggers complete
        fetchTimeoutRef.current = setTimeout(() => {
          if (isMounted && attempts < maxAttempts) {
            attempts++;
            fetchProfile(session.user.id);
            fetchRoles(session.user.id);
          }
        }, 500);
      } else {
        setProfile(null);
        setRoles([]);
        setProfileLoaded(true);
        setRolesLoaded(true);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchTimeoutRef.current = setTimeout(() => {
          if (isMounted && attempts < maxAttempts) {
            attempts++;
            fetchProfile(session.user.id);
            fetchRoles(session.user.id);
          }
        }, 500);
      } else {
        setProfileLoaded(true);
        setRolesLoaded(true);
      }
      setLoading(false);
    });

    return () => {
      isMounted = false;
      if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
      subscription.unsubscribe();
    };
  }, []);

  async function fetchProfile(userId: string) {
    console.log('[AUTH] Fetching profile for user:', userId);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, department, is_approved')
        .eq('user_id', userId)
        .maybeSingle();
      
      console.log('[AUTH] Profile fetch result:', { data, error });
      
      if (error && error.code !== 'PGRST116') {
        console.error('[AUTH] Profile fetch error - Code:', error.code, 'Message:', error.message);
        setProfileLoaded(true);
        return;
      }
      
      if (data) {
        console.log('[AUTH] Profile found:', data);
        setProfile(data as any);
      } else {
        console.warn('[AUTH] No profile found - CRITICAL: Database trigger may not have executed');
        console.warn('[AUTH] User ID:', userId);
        // Set default approved profile if missing (trigger should have created this)
        setProfile({ full_name: userId, avatar_url: null, department: null, is_approved: true });
      }
    } catch (err) {
      console.error('[AUTH] Profile fetch exception:', err);
    } finally {
      setProfileLoaded(true);
    }
  }

  async function fetchRoles(userId: string) {
    console.log('[AUTH] Fetching roles for user:', userId);
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);
      
      console.log('[AUTH] Roles fetch result:', { data, error });
      
      if (error) {
        console.error('[AUTH] Roles fetch error - Code:', error.code, 'Message:', error.message);
        setRoles(['agent']);
        setRolesLoaded(true);
        return;
      }
      
      if (data && data.length > 0) {
        console.log('[AUTH] Roles found:', data.map(r => r.role));
        setRoles(data.map(r => r.role));
      } else {
        console.warn('[AUTH] No roles found - CRITICAL: Database trigger may not have executed');
        console.warn('[AUTH] User ID:', userId);
        setRoles(['agent']);
      }
    } catch (err) {
      console.error('[AUTH] Roles fetch exception:', err);
      setRoles(['agent']);
    } finally {
      setRolesLoaded(true);
    }
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

  const isApproved = useMemo(() => profile?.is_approved ?? false, [profile]);

  async function signUp(email: string, password: string, fullName: string) {
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName, role: 'manager' }, emailRedirectTo: window.location.origin }
    });
    return { error: error as Error | null };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{
      user, session, profile, roles, loading, isApproved,
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
