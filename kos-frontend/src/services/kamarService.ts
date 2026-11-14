import api from './api';
import type { Kamar, Penghuni } from '../types/kos';

export interface CreateKamarPayload {
  nomor_kamar: string;
  tipe: 'individu' | 'berdua';
  harga_sewa: number;
  fasilitas: string;
  status?: 'tersedia' | 'terisi';
}

export interface CreatePenghuniPayload {
  nama_lengkap: string;
  no_identitas: string;
  no_kontak: string;
  kamar: number;
  tanggal_masuk: string;
}

export const kamarService = {
  getAllKamar: () => api.get<Kamar[]>('/kamar/'),
  createKamar: (data: CreateKamarPayload) => api.post<Kamar>('/kamar/', data),
  updateKamar: (id: number, data: Partial<CreateKamarPayload>) =>
    api.patch<Kamar>(`/kamar/${id}/`, data),
  deleteKamar: (id: number) => api.delete(`/kamar/${id}/`),

  getAllPenghuni: () => api.get<Penghuni[]>('/penghuni/'),
  createPenghuni: (data: CreatePenghuniPayload) =>
    api.post<Penghuni>('/penghuni/', data),
};