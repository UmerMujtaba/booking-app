import { Session, User } from '@supabase/supabase-js';
import { router } from 'expo-router';
import React, { createContext, useContext, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

import { Profile, UserRole } from './types';
type SignUpRole = Exclude<UserRole, 'admin'>;

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  needsEmailConfirm: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, role: SignUpRole) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  needsEmailConfirm: false,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsEmailConfirm, setNeedsEmailConfirm] = useState(false);

  const fetchProfile = async (userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        // Table doesn't exist yet (migration not run)
        console.warn('Profile fetch error:', error.message);
        return false;
      }
      if (data) {
        setProfile(data as Profile);
        return true;
      }
      // No row found — profile doesn't exist yet
      return false;
    } catch {
      return false;
    }
  };

  /** Create a profile row from auth metadata when one doesn't exist */
  const ensureProfile = async (userId: string): Promise<boolean> => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const meta = currentUser?.user_metadata;
      const fullName = meta?.full_name || 'User';
      const requestedRole = meta?.role;
      const role = requestedRole === 'owner' || requestedRole === 'customer' ? requestedRole : 'customer';

      const { error } = await supabase.from('profiles').upsert(
        { id: userId, full_name: fullName, role },
        { onConflict: 'id', ignoreDuplicates: true }
      );

      if (error) {
        console.warn('Profile creation error:', error.message);
        return false;
      }

      // Re-fetch the profile after creating it
      return await fetchProfile(userId);
    } catch {
      return false;
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        fetchProfile(s.user.id).then(async (found) => {
          if (!found) await ensureProfile(s.user.id);
        }).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, s) => {
      setSession(s);
      setUser(s?.user ?? null);

      if (event === 'SIGNED_IN' && s?.user) {
        // Try to fetch the profile (trigger may need a moment)
        let found = false;
        for (let i = 0; i < 3; i++) {
          found = await fetchProfile(s.user.id);
          if (found) break;
          await new Promise((r) => setTimeout(r, 500));
        }
        // If profile still missing (e.g. user created before migration), create it
        if (!found) {
          found = await ensureProfile(s.user.id);
        }
      } else if (event === 'SIGNED_OUT') {
        setProfile(null);
        setNeedsEmailConfirm(false);
      }

      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.message.toLowerCase().includes('email not confirmed')) {
        throw new Error(
          'Please confirm your email first. Check your inbox for a confirmation link, or disable "Confirm email" in your Supabase Auth settings.'
        );
      }
      throw error;
    }
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    role: SignUpRole
  ) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role },
      },
    });

    if (error) throw error;

    // session is null when Supabase requires email confirmation
    if (!data.session) {
      setNeedsEmailConfirm(true);
      return;
    }

    // session exists → email confirmation is off, trigger auto-creates profile
    // but we also upsert here as a safety net in case trigger is slow
    if (data.user) {
      await supabase.from('profiles').upsert(
        { id: data.user.id, full_name: fullName, role },
        { onConflict: 'id', ignoreDuplicates: true }
      );
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setNeedsEmailConfirm(false);
    setUser(null);
    setSession(null);
    router.replace('/(auth)/login');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        needsEmailConfirm,
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
