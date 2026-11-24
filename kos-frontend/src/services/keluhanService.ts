import api from './api';
import type { Keluhan, KategoriKeluhan } from '../types/kos';

export const keluhanService = {
  getAll: () => api.get<Keluhan[]>('/keluhan/'),

  getKategori: () => api.get<KategoriKeluhan[]>('/kategori-keluhan/'),

  createKategori: (nama: string) => api.post<KategoriKeluhan>('/kategori-keluhan/', { nama }),

  updateKategori: (id: number, nama: string) =>
    api.patch<KategoriKeluhan>(`/kategori-keluhan/${id}/`, { nama }),

  deleteKategori: (id: number) => api.delete(`/kategori-keluhan/${id}/`),

  create: (formData: FormData) =>
    api.post('/keluhan/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  updateStatus: (
    id: number,
    data: {
      status: string;
      catatan_tindak_lanjut?: string;
      kategori?: number;
      kategori_custom?: string;
      deskripsi?: string;
      dieskalasi_pemilik?: boolean;
      nominal_pengajuan?: number;
      catatan_pengajuan?: string;
    },
  ) => api.patch<Keluhan>(`/keluhan/${id}/`, data),

  responPemilik: (
    id: number,
    data: {
      status_pemilik: 'dicairkan' | 'dicairkan_sebagian' | 'ditolak';
      nominal_pencairan: number;
      catatan_pemilik?: string;
    },
  ) => api.post<Keluhan>(`/keluhan/${id}/respon-pemilik/`, data),
};
