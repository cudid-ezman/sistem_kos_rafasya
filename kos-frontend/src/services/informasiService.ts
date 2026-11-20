import api from "./api";
import type { InformasiItem } from "../types/kos";

export interface InformasiPayload {
  kategori: string;
  ringkasan: string;
  isi: string;
  ikon: string;
}

export const informasiService = {
  getAll: () => api.get<InformasiItem[]>("/informasi/"),
  getById: (id: number | string) => api.get<InformasiItem>(`/informasi/${id}/`),
  create: (data: InformasiPayload) =>
    api.post<InformasiItem>("/informasi/", data),
  update: (id: number, data: Partial<InformasiPayload>) =>
    api.patch<InformasiItem>(`/informasi/${id}/`, data),
  remove: (id: number) => api.delete(`/informasi/${id}/`),
};
