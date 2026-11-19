export interface LoginResponse {
  access: string;
  refresh: string;
}

export interface KamarAktifUser {
  id: number;
  nomor_kamar: string;
  tipe: "individu" | "berdua";
  harga_sewa: number;
  fasilitas: string;
  status: string;
}

export interface UserProfile {
  id: number;
  username: string;
  nama_lengkap: string;
  role: "pemilik" | "pengurus" | "penghuni" | "superadmin" | "unknown";
  kamar?: KamarAktifUser | null;
}
