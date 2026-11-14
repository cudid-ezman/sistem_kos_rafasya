import { useEffect, useState } from 'react';
import { tagihanService } from '../../services/tagihanService';
import type { Tagihan } from '../../types/kos';
import StatusBadge from '../../components/StatusBadge';

export default function TagihanSaya() {
  const [tagihan, setTagihan] = useState<Tagihan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTagihan, setSelectedTagihan] = useState<Tagihan | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [tanggalBayar, setTanggalBayar] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);

  const fetchTagihan = async () => {
    try {
      const res = await tagihanService.getAll();
      setTagihan(res.data);
    } catch (error) {
      console.error('Gagal mengambil data tagihan', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTagihan();
  }, []);

  const openModal = (item: Tagihan) => {
    setSelectedTagihan(item);
    setFile(null);
    setTanggalBayar(new Date().toISOString().split('T')[0]);
    setIsModalOpen(true);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !selectedTagihan || !tanggalBayar) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('tagihan', String(selectedTagihan.id));
    formData.append('berkas', file);
    formData.append('tanggal_bayar', tanggalBayar);

    try {
      await tagihanService.uploadBukti(formData);
      alert('Bukti pembayaran berhasil diunggah!');
      setIsModalOpen(false);
      fetchTagihan();
    } catch (error) {
      console.error('Gagal mengunggah bukti', error);
      alert('Gagal mengunggah bukti pembayaran. Pastikan format file valid.');
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return <div className="text-slate-500 animate-pulse p-6">Memuat data tagihan...</div>;
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden relative">
      <div className="p-6 border-b border-slate-200">
        <h2 className="text-lg font-bold text-slate-800">Daftar Tagihan Saya</h2>
        <p className="text-sm text-slate-500 mt-1">Riwayat tagihan sewa kamar Anda.</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
            <tr>
              <th className="px-6 py-4">Bulan / Tahun</th>
              <th className="px-6 py-4">Nomor Kamar</th>
              <th className="px-6 py-4">Jumlah (Rp)</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {tagihan.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                  Belum ada tagihan untuk Anda.
                </td>
              </tr>
            ) : (
              tagihan.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4 font-medium capitalize">{item.periode}</td>
                  <td className="px-6 py-4">
                    Kamar {item.nomor_kamar || item.penghuni?.kamar?.nomor_kamar || item.penghuni_id || '-'}
                  </td>
                  <td className="px-6 py-4">
                    Rp {Number(item.nominal || 0).toLocaleString('id-ID')}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="px-6 py-4">
                    {(item.status === 'belum_dibayar' || item.status === 'ditolak' || item.status === 'terlambat') && (
                      <button
                        onClick={() => openModal(item)}
                        className="text-blue-600 hover:text-blue-800 font-medium text-sm transition cursor-pointer"
                      >
                        Bayar / Upload
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && selectedTagihan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-slate-800 mb-2">Upload Bukti Transfer</h3>
            <p className="text-sm text-slate-500 mb-5">
              Tagihan periode <span className="font-semibold capitalize">{selectedTagihan.periode}</span> sebesar{' '}
              <span className="font-semibold">Rp {Number(selectedTagihan.nominal).toLocaleString('id-ID')}</span>.
            </p>

            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal Transfer</label>
                <input
                  type="date"
                  required
                  value={tanggalBayar}
                  onChange={(e) => setTanggalBayar(e.target.value)}
                  className="w-full text-sm text-slate-700 border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Pilih Foto/Screenshot Bukti</label>
                <input
                  type="file"
                  accept="image/*"
                  required
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
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
                  disabled={!file || !tanggalBayar || isUploading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg transition cursor-pointer"
                >
                  {isUploading ? 'Mengunggah...' : 'Kirim Bukti'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}