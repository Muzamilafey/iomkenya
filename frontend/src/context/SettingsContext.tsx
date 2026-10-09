import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { fetchPublicSettings } from '../api/applications';
import type { PublicSettings } from '../api/types';

const DEFAULT_SETTINGS: PublicSettings = {
  agencyName: 'Horizon Travel Assistance',
  heroHeadline: 'Apply for travel assistance in a few simple steps',
  heroSubheadline:
    'Complete your application online, upload your documents and pay securely with M-Pesa. Track your progress any time.',
  logoUrl: '',
  heroImages: [],
  contactEmail: '',
  contactPhone: '',
  address: '',
  whatsappNumber: '',
  applicationFee: 0,
  manifestRequired: false,
};

interface SettingsContextValue {
  settings: PublicSettings;
  loaded: boolean;
  refresh: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<PublicSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setSettings(await fetchPublicSettings());
    } catch {
      /* keep defaults when the API is unreachable */
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    document.title = settings.agencyName;
  }, [settings.agencyName]);

  return <SettingsContext.Provider value={{ settings, loaded, refresh }}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider');
  return ctx;
}
