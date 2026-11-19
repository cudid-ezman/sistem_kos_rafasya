import api from "./api";
import type { Kamar, Penghuni } from "../types/kos";

export interface CreateKamarPayload {
  nomor_kamar: string;
  tipe?: "individu" | "berdua";
  harga_individu: number;
  harga_berdua: number;
  biaya_fasilitas?: number;
  harga_sewa?: number;
  fasilitas: string;
  status?: "tersedia" | "terisi";
}

export interface CreatePenghuniPayload {
  nama_lengkap: string;
  email: string;
  password: string;
  no_identitas?: string;
  no_kontak: string;
  kamar: number;
  tanggal_masuk: string;
}

export interface UpdatePenghuniPayload {
  nama_lengkap?: string;
  email?: string;
  no_identitas?: string;
  no_kontak?: string;
  kamar?: number | null;
  tanggal_masuk?: string;
  aksi?: "checkout" | "aktifkan";
}

export const kamarService = {
  getAllKamar: () => api.get<Kamar[]>("/kamar/"),
  createKamar: (data: CreateKamarPayload) => api.post<Kamar>("/kamar/", data),
  updateKamar: (id: number, data: Partial<CreateKamarPayload>) =>
    api.patch<Kamar>(`/kamar/${id}/`, data),
  deleteKamar: (id: number) => api.delete(`/kamar/${id}/`),

  getAllPenghuni: () => api.get<Penghuni[]>("/penghuni/"),
  createPenghuni: (data: CreatePenghuniPayload) =>
    api.post<Penghuni>("/penghuni/", data),
  updatePenghuni: (id: number, data: UpdatePenghuniPayload) =>
    api.patch<Penghuni>(`/penghuni/${id}/`, data),
};
