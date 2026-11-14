import api from './api';
import type { Keluhan, KategoriKeluhan } from '../types/kos';

export const keluhanService = {
  getAll: () => api.get<Keluhan[]>('/keluhan/'),
  
  getKategori: () => api.get<KategoriKeluhan[]>('/kategori-keluhan/'),

  create: (formData: FormData) =>
    api.post('/keluhan/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  updateStatus: (id: number, data: { status: string; catatan_tindak_lanjut?: string }) =>
    api.patch(`/keluhan/${id}/`, data),
};