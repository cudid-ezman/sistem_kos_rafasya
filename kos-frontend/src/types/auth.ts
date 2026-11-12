export interface LoginResponse {
  access: string;
  refresh: string;
}

export interface UserProfile {
  id: number;
  username: string;
  nama_lengkap: string;
  role: 'pemilik' | 'pengurus' | 'penghuni' | 'superadmin' | 'unknown';
}