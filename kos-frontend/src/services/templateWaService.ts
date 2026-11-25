import api from './api';

export interface TemplatePesanWAItem {
  kode: 'sambutan' | 'tagihan' | 'kuitansi';
  judul: string;
  deskripsi: string;
  variabel: string;
  isi: string;
  isi_default: string;
  diperbarui_pada: string;
}

export const DEFAULT_TEMPLATE_LOKAL: Record<TemplatePesanWAItem['kode'], string> = {
  sambutan:
    'Halo *{nama}*, selamat datang di *Kost Putra Raffasya*!\n\n' +
    'Akun portal penghuni Anda telah aktif untuk *Kamar {kamar}* (jatuh tempo setiap tanggal *{jatuh_tempo}*).\n\n' +
    'Link Login: {link_login}\n' +
    'Email Login: {email}\n' +
    'Kata Sandi Awal: {password}\n\n' +
    'Tagihan bulan pertama Anda sudah diterbitkan otomatis dan dapat dilihat pada menu *Tagihan Saya*.\n' +
    'Demi keamanan akun, mohon segera ubah kata sandi Anda secara mandiri melalui tombol *Ubah Sandi* setelah berhasil login.',
  tagihan:
    '*[Kos Putra Raffasya]*\n' +
    'Halo *{nama}*, berikut rincian tagihan sewa *Kamar {kamar}* periode *{periode}*:\n\n' +
    '• Pokok Sewa: {nominal}\n' +
    '• Denda Keterlambatan: {denda}\n' +
    '• Total Tagihan: *{total}*\n' +
    '• Jatuh Tempo: *{jatuh_tempo}*\n\n' +
    'Silakan lakukan pembayaran dan unggah bukti transfer melalui portal penghuni: {link_login}',
  kuitansi:
    '*[Kos Putra Raffasya - KUITANSI LUNAS]*\n' +
    'Halo *{nama}*, pembayaran sewa *Kamar {kamar}* periode *{periode}* sebesar *{total}* telah *DIVERIFIKASI & LUNAS* pada tanggal *{tanggal_bayar}*.\n\n' +
    'Terima kasih telah melakukan pembayaran tepat waktu.',
};

export function renderTemplatePesan(
  templateText: string,
  konteks: Record<string, string | number | undefined | null>,
): string {
  let hasil = templateText;
  for (const [k, v] of Object.entries(konteks)) {
    hasil = hasil.split(`{${k}}`).join(String(v ?? ''));
  }
  return hasil;
}

export const templateWaService = {
  getAll: () => api.get<TemplatePesanWAItem[]>('/template-wa/'),
  update: (kode: TemplatePesanWAItem['kode'], isi: string) =>
    api.put<TemplatePesanWAItem>(`/template-wa/${kode}/`, { isi }),
  reset: (kode: TemplatePesanWAItem['kode']) =>
    api.post<TemplatePesanWAItem>(`/template-wa/${kode}/`, { reset: true }),
};
