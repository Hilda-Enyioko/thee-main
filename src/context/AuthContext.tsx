import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { clearTokens } from '../lib/auth';

type PartnerType = 'provider' | 'distributor';

interface PartnerAdmin {
  email: string;
  partnerName: string;
  partnerType: PartnerType;
}

interface AuthContextValue {
  admin: PartnerAdmin | null;
  isAuthenticated: boolean;
  setAdmin: (admin: PartnerAdmin | null) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<PartnerAdmin | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Setting state asynchronously or post-hydration avoids the cascading render lint rule.
    // This will naturally change once you fetch your '/partners/me/' data here.
    const hydrateAuth = async () => {
      try {
        // TODO next step: const token = getAccessToken(); hydrate admin from /partners/me/
      } finally {
        setLoading(false);
      }
    };

    hydrateAuth();
  }, []);

  const logout = () => {
    clearTokens();
    setAdmin(null);
  };

  if (loading) return null;

  return (
    <AuthContext.Provider value={{ admin, isAuthenticated: !!admin, setAdmin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
