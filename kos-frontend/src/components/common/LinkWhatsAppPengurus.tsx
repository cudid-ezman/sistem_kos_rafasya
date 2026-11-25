import { useEffect, useState } from 'react';
import api from '../../services/api';

let cachedWa: string | null = null;
let pendingReq: Promise<string> | null = null;

function normalisasiWa(raw: string): string {
  const digits = (raw || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0')) return '62' + digits.slice(1);
  if (digits.startsWith('8')) return '62' + digits;
  return digits;
}

async function ambilNomorWaPengurus(): Promise<string> {
  if (cachedWa !== null) return cachedWa;
  if (!pendingReq) {
    pendingReq = api
      .get<{ wa_pengurus?: string }>('/kontak-pengurus/')
      .then((res) => {
        const dariServer = normalisasiWa(res.data?.wa_pengurus || '');
        const fallback = normalisasiWa(import.meta.env.VITE_WA_PENGURUS || '');
        const hasil = dariServer || fallback;
        if (hasil) cachedWa = hasil;
        pendingReq = null;
        return hasil;
      })
      .catch(() => {
        pendingReq = null;
        return normalisasiWa(import.meta.env.VITE_WA_PENGURUS || '');
      });
  }
  return pendingReq;
}

interface Props {
  label?: string;
  pesan?: string;
  className?: string;
}

export default function LinkWhatsAppPengurus({
  label = 'Hubungi pengurus kos.',
  pesan = 'Halo Pengurus Kos Putra Raffasya, saya membutuhkan bantuan.',
  className = 'font-semibold text-kos-600 hover:text-kos-700 hover:underline',
}: Props) {
  const [wa, setWa] = useState<string>(
    () => cachedWa ?? normalisasiWa(import.meta.env.VITE_WA_PENGURUS || '')
  );

  useEffect(() => {
    let aktif = true;
    void ambilNomorWaPengurus().then((nomor) => {
      if (aktif) setWa(nomor);
    });
    return () => {
      aktif = false;
    };
  }, []);

  if (!wa) {
    return (
      <button
        type="button"
        onClick={() => window.alert("Nomor WhatsApp pengurus belum diatur di konfigurasi (.env).")}
        className={`cursor-pointer ${className}`}
      >
        {label}
      </button>
    );
  }

  const href = `https://wa.me/${wa}?text=${encodeURIComponent(pesan)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title="Chat langsung via WhatsApp"
      className={`cursor-pointer ${className}`}
    >
      {label}
    </a>
  );
}
