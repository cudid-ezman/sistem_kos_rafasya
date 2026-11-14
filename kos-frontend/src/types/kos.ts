export interface Kamar {
  id: number;
  nomor_kamar: string;
  tipe: 'individu' | 'berdua';
  harga_sewa: number;
  fasilitas: string;
  status: 'tersedia' | 'terisi';
}

export interface Penghuni {
  id: number;
  user: number;
  nama_lengkap: string;
  kamar: number | null;
  nomor_kamar?: string;
  no_identitas: string;
  no_kontak: string;
  tanggal_masuk: string;
  status_aktif: boolean;
}

export interface Tagihan {
  id: number;
  periode: string;
  nominal: number;
  jatuh_tempo: string;
  status: 'belum_dibayar' | 'menunggu_verifikasi' | 'lunas' | 'ditolak' | 'terlambat';
  catatan?: string | null;
  nama_penghuni?: string;
  nomor_kamar?: string;
  penghuni?: {
    nama_lengkap?: string;
    kamar?: {
      nomor_kamar?: string;
    };
  };
  penghuni_id?: number;
}

export interface BuktiPembayaran {
  id: number;
  tagihan: number;
  periode_tagihan?: string;
  nominal_tagihan?: number;
  nama_penghuni?: string;
  nomor_kamar?: string;
  berkas: string;
  tanggal_bayar: string;
  waktu_unggah: string;
  status: 'menunggu_verifikasi' | 'diterima' | 'ditolak';
  catatan_penolakan?: string | null;
  tanggal_verifikasi?: string | null;
}

export interface KategoriKeluhan {
  id: number;
  nama: string;
}

export interface Keluhan {
  id: number;
  penghuni: number;
  nama_penghuni?: string;
  nomor_kamar?: string;
  kategori: number;
  nama_kategori?: string;
  deskripsi: string;
  foto: string | null;
  status: 'diterima' | 'diproses' | 'selesai';
  catatan_tindak_lanjut: string | null;
  tanggal_kirim: string;
}