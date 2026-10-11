import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { api } from '../lib/api';
import { getAccessToken, clearTokens } from '../lib/auth';

type PartnerType = 'provider' | 'distributor';

interface PartnerAdmin {
  partnerType: PartnerType;
  partnerName: string;
  isActive: boolean; // false = KYC not yet verified
}

interface AuthContextValue {
  admin: PartnerAdmin | null;
  isAuthenticated: boolean;
  loading: boolean;
  setAdmin: (admin: PartnerAdmin | null) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<PartnerAdmin | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const hydrate = async () => {
      const token = getAccessToken();
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const response = await api.get('/partner/me/');
        const data = response.data;
        setAdmin({
          partnerType: data.partner_type,
          partnerName: data.partner_name,
          isActive: data.is_active,
        });
      } catch {
        clearTokens();
        setAdmin(null);
      } finally {
        setLoading(false);
      }
    };
    hydrate();
  }, []);

  const logout = () => {
    clearTokens();
    setAdmin(null);
  };

  return (
    <AuthContext.Provider value={{ admin, isAuthenticated: !!admin, loading, setAdmin, logout }}>
      {loading ? null : children}
    </AuthContext.Provider>
  );
}

/* eslint-disable-next-line react-refresh/only-export-components */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
