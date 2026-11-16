import { createContext, useContext } from 'react';
import type { UserProfile } from '../../types/auth';
import type { BuktiPembayaran, Keluhan, Tagihan } from '../../types/kos';

export interface InfoKamar {
  nomor: string;
  blok: string | null;
  tipe: string | null;
}

export interface PortalData {
  user: UserProfile;
  tagihan: Tagihan[];
  bukti: BuktiPembayaran[];
  keluhan: Keluhan[];
  kamar: InfoKamar | null;
  loading: boolean;
  error: boolean;
  reload: () => Promise<void>;
}

export const PortalContext = createContext<PortalData | null>(null);

export function usePortal(): PortalData {
  const ctx = useContext(PortalContext);
  if (!ctx) throw new Error('usePortal harus dipakai di dalam PenghuniLayout');
  return ctx;
}
