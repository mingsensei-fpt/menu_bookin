import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface AuthContextType {
  isLoggedIn: boolean;
  login: (email: string, password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  login: () => false,
  logout: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

const VALID_EMAIL = "rtr@gmail.com";
const VALID_PASS = "HarvestMoon1964";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return sessionStorage.getItem("auth") === "1";
  });

  const login = useCallback((email: string, password: string) => {
    if (email === VALID_EMAIL && password === VALID_PASS) {
      setIsLoggedIn(true);
      sessionStorage.setItem("auth", "1");
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    setIsLoggedIn(false);
    sessionStorage.removeItem("auth");
  }, []);

  return (
    <AuthContext.Provider value={{ isLoggedIn, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
