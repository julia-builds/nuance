import { useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthContext } from "@/components/AuthContextTypes";
import type { Profile } from "@/components/AuthContextTypes";
import type { User, Session } from "@supabase/supabase-js";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isGuest, setIsGuest] = useState(() => localStorage.getItem("nuance-guest") === "true");
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    if (data) setProfile(data as Profile);
  };

  useEffect(() => {
    // Set up listener BEFORE getSession
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        // Clear guest mode when authenticated
        setIsGuest(false);
        localStorage.removeItem("nuance-guest");
        // Defer profile fetch to avoid Supabase deadlock
        setTimeout(() => fetchProfile(session.user.id), 0);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, name?: string) => {
    const displayName = name?.trim() || email.split("@")[0];
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}${import.meta.env.BASE_URL}`,
        data: { display_name: displayName },
      },
    });
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut({ scope: "local" });
    setSession(null);
    setUser(null);
    setProfile(null);
  };

  const enterGuestMode = () => {
    setIsGuest(true);
    localStorage.setItem("nuance-guest", "true");
  };

  const exitGuestMode = () => {
    setIsGuest(false);
    localStorage.removeItem("nuance-guest");
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  const deleteAccount = async () => {
    try {
      // Delete avatar from storage if exists
      if (profile?.avatar_url && user) {
        const path = `${user.id}/avatar`;
        await supabase.storage.from("avatars").remove([path]);
      }
      // Sign out (actual account deletion requires admin/edge function)
      await supabase.auth.signOut();
      setProfile(null);
      return { error: null };
    } catch (e) {
      return { error: e as Error };
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, session, profile, isGuest, loading, signUp, signIn, signOut, enterGuestMode, exitGuestMode, refreshProfile, deleteAccount }}
    >
      {children}
    </AuthContext.Provider>
  );
};
