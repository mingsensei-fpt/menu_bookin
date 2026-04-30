import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  isLoggedIn: boolean;
  userId: string | null;
  isSuperAdmin: boolean;
  roleLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  userId: null,
  isSuperAdmin: false,
  roleLoading: true,
  login: async () => false,
  logout: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [roleLoading, setRoleLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
      setUserId(session?.user?.id ?? null);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
      setUserId(session?.user?.id ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch role whenever user changes
  useEffect(() => {
    let cancelled = false;
    if (!userId) {
      setIsSuperAdmin(false);
      setRoleLoading(false);
      return;
    }
    setRoleLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from("user_roles" as any)
        .select("role")
        .eq("user_id", userId);
      if (cancelled) return;
      if (error) {
        console.error("Failed to fetch roles:", error);
        setIsSuperAdmin(false);
      } else {
        setIsSuperAdmin((data ?? []).some((r: any) => r.role === "super_admin"));
      }
      setRoleLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const login = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      // If user doesn't exist yet, sign up (one-time bootstrap)
      if (error.message.includes("Invalid login")) {
        const { error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) return false;
        // Auto-confirm is on, so sign in again
        const { error: retryError } = await supabase.auth.signInWithPassword({ email, password });
        return !retryError;
      }
      return false;
    }
    return true;
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider value={{ isLoggedIn, userId, isSuperAdmin, roleLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
