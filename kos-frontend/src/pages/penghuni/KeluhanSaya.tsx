import { useEffect, useState } from 'react';
import { keluhanService } from '../../services/keluhanService';
import type { Keluhan, KategoriKeluhan } from '../../types/kos';
import StatusBadge from '../../components/StatusBadge';

export default function KeluhanSaya() {
  const [keluhanList, setKeluhanList] = useState<Keluhan[]>([]);
  const [kategoriList, setKategoriList] = useState<KategoriKeluhan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [kategoriId, setKategoriId] = useState<string>('');
  const [deskripsi, setDeskripsi] = useState<string>('');
  const [foto, setFoto] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      const [resKeluhan, resKategori] = await Promise.all([
        keluhanService.getAll(),
        keluhanService.getKategori(),
      ]);
      setKeluhanList(resKeluhan.data);
      setKategoriList(resKategori.data);
      if (resKategori.data.length > 0) {
        setKategoriId(String(resKategori.data[0].id));
      }
    } catch (error) {
      console.error('Gagal memuat data keluhan', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kategoriId || !deskripsi.trim()) return;

    setIsSubmitting(true);
    const formData = new FormData();
    formData.append('kategori', kategoriId);
    formData.append('deskripsi', deskripsi);
    if (foto) {
      formData.append('foto', foto);
    }

    try {
      await keluhanService.create(formData);
      alert('Keluhan berhasil dikirim!');
      setIsModalOpen(false);
      setDeskripsi('');
      setFoto(null);
      fetchData();
    } catch (error) {
      console.error('Gagal mengirim keluhan', error);
      alert('Terjadi kesalahan saat mengirim keluhan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="text-slate-500 animate-pulse p-6">Memuat data keluhan...</div>;
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-200 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Keluhan & Laporan Fasilitas</h2>
          <p className="text-sm text-slate-500 mt-1">Sampaikan kendala fasilitas kamar Anda kepada pengurus.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition cursor-pointer"
        >
          + Buat Keluhan
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
            <tr>
              <th className="px-6 py-4">Tanggal</th>
              <th className="px-6 py-4">Kategori</th>
              <th className="px-6 py-4">Deskripsi</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Tindak Lanjut Pengurus</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {keluhanList.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                  Belum ada riwayat keluhan yang dikirim.
                </td>
              </tr>
            ) : (
              keluhanList.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4 whitespace-nowrap">
                    {new Date(item.tanggal_kirim).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-6 py-4 font-medium">{item.nama_kategori || '-'}</td>
                  <td className="px-6 py-4 max-w-xs">
                    <p className="truncate" title={item.deskripsi}>{item.deskripsi}</p>
                    {item.foto && (
                      <a
                        href={item.foto}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                      >
                        Lihat Foto Lampiran
                      </a>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {item.catatan_tindak_lanjut || <span className="italic text-slate-400">Belum ada catatan</span>}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Buat Keluhan Baru</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Kategori Keluhan</label>
                <select
                  value={kategoriId}
                  onChange={(e) => setKategoriId(e.target.value)}
                  required
                  className="w-full text-sm text-slate-700 border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                >
                  {kategoriList.map((kat) => (
                    <option key={kat.id} value={kat.id}>{kat.nama}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Deskripsi Kendala</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Jelaskan kerusakan atau kendala secara detail..."
                  value={deskripsi}
                  onChange={(e) => setDeskripsi(e.target.value)}
                  className="w-full text-sm text-slate-700 border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Foto Bukti Kerusakan <span className="text-slate-400 font-normal">(Opsional)</span>
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFoto(e.target.files?.[0] || null)}
                  className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-slate-200 rounded-lg p-2"
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg transition cursor-pointer"
                >
                  {isSubmitting ? 'Mengirim...' : 'Kirim Keluhan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}