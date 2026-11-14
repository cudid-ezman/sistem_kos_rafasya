import api from './api';
import type { Tagihan, BuktiPembayaran } from '../types/kos';

export interface LaporanKeuanganResponse {
  total_pemasukan: number;
  transaksi: Tagihan[];
}

export const tagihanService = {
  getAll: () => api.get<Tagihan[]>('/tagihan/'),
  
  generateBulanan: (periode: string) => 
    api.post('/tagihan/generate/', { periode }),

  uploadBukti: (formData: FormData) =>
    api.post('/bukti-pembayaran/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  getBuktiPembayaran: () => api.get<BuktiPembayaran[]>('/bukti-pembayaran/'),

  prosesVerifikasi: (buktiId: number, aksi: 'terima' | 'tolak', catatan_penolakan = '') =>
    api.post(`/verifikasi/${buktiId}/`, { aksi, catatan_penolakan }),

  getLaporanKeuangan: () =>
    api.get<LaporanKeuanganResponse>('/laporan-keuangan/'),
};