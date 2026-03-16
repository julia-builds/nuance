import { createContext } from "react";
import type { User, Session } from "@supabase/supabase-js";

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  vibe_iq: number;
  learning_level: number;
  streak_days: number;
  last_active_date: string | null;
  lessons_completed: number;
}

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isGuest: boolean;
  loading: boolean;
  signUp: (email: string, password: string, name?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  enterGuestMode: () => void;
  exitGuestMode: () => void;
  refreshProfile: () => Promise<void>;
  deleteAccount: () => Promise<{ error: Error | null }>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
