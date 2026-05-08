import { Session, User } from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import React, { createContext, useContext, useEffect, useState } from "react";
import { Alert } from "react-native";

import { supabase } from "@/lib/supabase";
import {
  registerForPushNotificationsAsync,
  savePushToken,
} from "@/lib/notifications";

import { Profile, UserRole } from "./types";
type SignUpRole = Exclude<UserRole, "admin">;

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isRecovering: boolean;
  needsEmailConfirm: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    role: SignUpRole,
  ) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string, confirmPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  isRecovering: false,
  needsEmailConfirm: false,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  resetPassword: async () => {},
  refreshProfile: async () => {},
  updatePassword: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRecovering, setIsRecovering] = useState(false);
  const [needsEmailConfirm, setNeedsEmailConfirm] = useState(false);

  const fetchProfile = async (userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        // Table doesn't exist yet (migration not run)
        console.warn("Profile fetch error:", error.message);
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
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      const meta = currentUser?.user_metadata;
      const fullName = meta?.full_name || "User";
      const requestedRole = meta?.role;
      const role =
        requestedRole === "owner" || requestedRole === "customer"
          ? requestedRole
          : "customer";

      const { error } = await supabase
        .from("profiles")
        .upsert(
          { id: userId, full_name: fullName, role, email: currentUser?.email },
          { onConflict: "id", ignoreDuplicates: true },
        );

      if (error) {
        console.warn("Profile creation error:", error.message);
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
        fetchProfile(s.user.id)
          .then(async (found) => {
            if (!found) await ensureProfile(s.user.id);
          })
          .finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, s) => {
      setSession(s);
      setUser(s?.user ?? null);

      if (event === "PASSWORD_RECOVERY") {
        console.log("Password recovery event detected!");
        setIsRecovering(true);
        router.push("/(auth)/reset-password");
      } else if (event === "SIGNED_IN" && s?.user) {
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

        // Register for push notifications
        registerForPushNotificationsAsync().then((token) => {
          if (token && s.user) {
            savePushToken(s.user.id, token);
          }
        });
      } else if (event === "SIGNED_OUT") {
        setProfile(null);
        setNeedsEmailConfirm(false);
      }

      setLoading(false);
    });

    const handleDeepLink = async (url: string) => {
      // console.log("Global deep link received:", url);
      const parsed = Linking.parse(url);

      // Extract fragment manually to avoid TypeScript errors and ensure we get the tokens
      const hash = url.split("#")[1] || "";

      const params = hash.split("&").reduce((acc: any, part) => {
        const [key, value] = part.split("=");
        if (key && value)
          acc[decodeURIComponent(key)] = decodeURIComponent(value);
        return acc;
      }, {});

      if (params.error) {
        console.error("Deep link error:", params.error_description);
        Alert.alert(
          "Link Error",
          params.error_description?.replace(/\+/g, " ") ||
            "This link is invalid or has expired.",
        );
        return;
      }

      const access_token = params.access_token;
      const refresh_token = params.refresh_token;

      if (access_token && refresh_token) {
        console.log("Tokens found in deep link, setting session...");
        await supabase.auth.setSession({ access_token, refresh_token });

        console.log("Checking for recovery type. Params type is:", params.type);
        if (params.type === "recovery") {
          console.log("Manual recovery navigation triggered");
          setIsRecovering(true);
          // Small delay to ensure the session is fully registered and router is ready
          setTimeout(() => {
            router.replace("/(auth)/reset-password");
          }, 500);
        }
      }
    };

    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });

    const linkingSubscription = Linking.addEventListener("url", ({ url }) => {
      handleDeepLink(url);
    });

    return () => {
      subscription.unsubscribe();
      linkingSubscription.remove();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      if (error.message.toLowerCase().includes("email not confirmed")) {
        throw new Error(
          'Please confirm your email first. Check your inbox for a confirmation link, or disable "Confirm email" in your Supabase Auth settings.',
        );
      }
      throw error;
    }
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    role: SignUpRole,
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
      await supabase.from("profiles").upsert(
        {
          id: data.user.id,
          full_name: fullName,
          role,
          email: data.user.email,
        },
        { onConflict: "id", ignoreDuplicates: true },
      );
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setNeedsEmailConfirm(false);
    setUser(null);
    setSession(null);
    setIsRecovering(false);
    router.replace("/(auth)/login");
  };

  const resetPassword = async (email: string) => {
    // Simplify redirectTo to avoid truncation issues in Expo Go
    const redirectTo = Linking.createURL("/");

    console.log("-----------------------------------------");
    console.log("PASSWORD RESET FLOW:");
    console.log("Generated Redirect URL:", redirectTo);
    console.log("Ensure this URL is in Supabase > Auth > Redirect URLs");
    console.log("-----------------------------------------");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    if (error) throw error;
  };

  const updatePassword = async (password: string, confirmPassword: string) => {
    if (!password || !confirmPassword) {
      throw new Error("Please fill both fields");
    }

    if (password !== confirmPassword) {
      throw new Error("Passwords do not match");
    }

    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) throw error;

    // Clear recovery mode after success
    setIsRecovering(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        isRecovering,
        needsEmailConfirm,
        signIn,
        signUp,
        signOut,
        refreshProfile,
        resetPassword,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
