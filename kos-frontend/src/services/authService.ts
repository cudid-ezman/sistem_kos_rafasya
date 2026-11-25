import axios from "axios";
import api from "./api";

export interface AkunStaffItem {
  id: number;
  username: string;
  email: string;
  nama_lengkap: string;
  role: "pemilik" | "pengurus";
  date_joined: string;
}

export interface KelolaAkunResponse {
  target_role: "pemilik" | "pengurus";
  akun: AkunStaffItem[];
}

export const gantiPassword = (password_lama: string, password_baru: string) =>
  api.post("/ganti-password/", { password_lama, password_baru });

export const getAkunStaff = () => api.get<KelolaAkunResponse>("/kelola-akun/");

export const createAkunStaff = (payload: {
  nama_lengkap: string;
  email: string;
  password: string;
}) => api.post<AkunStaffItem>("/kelola-akun/", payload);

export const deleteAkunStaff = (userId: number) =>
  api.delete(`/kelola-akun/${userId}/`);

export interface RegisterPayload {
  nama_lengkap: string;
  no_identitas: string;
  email: string;
  password: string;
  password_confirm: string;
}

export const registerPenghuni = (payload: RegisterPayload) =>
  api.post("/register/", payload);

export const requestPasswordReset = (email: string) =>
  api.post("/password-reset/", { email });

export const confirmPasswordReset = (
  uid: string,
  token: string,
  password: string,
) => api.post("/password-reset/confirm/", { uid, token, password });

/**
 * Ambil pesan error dari respons Django REST Framework.
 * Mendukung bentuk { detail }, { errors: [] }, dan { field: [pesan] }.
 */
export function extractMessages(err: unknown, fallback: string): string[] {
  if (!axios.isAxiosError(err)) return [fallback];
  if (!err.response)
    return ["Tidak dapat terhubung ke server. Pastikan backend menyala."];

  const data = err.response.data;
  if (!data || typeof data !== "object") return [fallback];

  const out: string[] = [];
  const collect = (v: unknown) => {
    if (typeof v === "string") out.push(v);
    else if (Array.isArray(v)) v.forEach(collect);
    else if (v && typeof v === "object") Object.values(v).forEach(collect);
  };
  collect(data);
  return out.length ? out : [fallback];
}
