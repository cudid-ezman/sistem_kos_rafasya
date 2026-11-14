import { useEffect, useState } from 'react';
import { tagihanService } from '../../services/tagihanService';
import type { BuktiPembayaran } from '../../types/kos';
import StatusBadge from '../../components/StatusBadge';

export default function VerifikasiPembayaran() {
  const [buktiList, setBuktiList] = useState<BuktiPembayaran[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'menunggu_verifikasi' | 'semua'>('menunggu_verifikasi');

  // State Modal Preview Gambar
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // State Modal Tolak Pembayaran
  const [rejectTarget, setRejectTarget] = useState<BuktiPembayaran | null>(null);
  const [catatanPenolakan, setCatatanPenolakan] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchBukti = async () => {
    try {
      const res = await tagihanService.getBuktiPembayaran();
      setBuktiList(res.data);
    } catch (error) {
      console.error('Gagal mengambil data bukti pembayaran', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBukti();
  }, []);

  const handleTerima = async (item: BuktiPembayaran) => {
    if (!confirm(`Terima pembayaran periode ${item.periode_tagihan} dari ${item.nama_penghuni}?`)) {
      return;
    }

    setIsProcessing(true);
    try {
      await tagihanService.prosesVerifikasi(item.id, 'terima');
      alert('Pembayaran diterima! Status tagihan otomatis menjadi Lunas.');
      fetchBukti();
    } catch (error) {
      console.error('Gagal memverifikasi pembayaran', error);
      alert('Terjadi kesalahan saat memverifikasi pembayaran.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTolakSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectTarget || !catatanPenolakan.trim()) return;

    setIsProcessing(true);
    try {
      await tagihanService.prosesVerifikasi(rejectTarget.id, 'tolak', catatanPenolakan);
      alert('Pembayaran ditolak. Penghuni dapat mengunggah ulang bukti yang valid.');
      setRejectTarget(null);
      setCatatanPenolakan('');
      fetchBukti();
    } catch (error) {
      console.error('Gagal menolak pembayaran', error);
      alert('Terjadi kesalahan saat menolak pembayaran.');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredList =
    filterStatus === 'semua'
      ? buktiList
      : buktiList.filter((b) => b.status === 'menunggu_verifikasi');

  if (isLoading) {
    return <div className="text-slate-500 animate-pulse p-6">Memuat antrean verifikasi...</div>;
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header & Filter Tab */}
      <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Verifikasi Pembayaran</h2>
          <p className="text-sm text-slate-500 mt-1">
            Periksa dan validasi bukti transfer yang diunggah penghuni.
          </p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-lg self-start">
          <button
            onClick={() => setFilterStatus('menunggu_verifikasi')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition cursor-pointer ${
              filterStatus === 'menunggu_verifikasi'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            Perlu Verifikasi ({buktiList.filter((b) => b.status === 'menunggu_verifikasi').length})
          </button>
          <button
            onClick={() => setFilterStatus('semua')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition cursor-pointer ${
              filterStatus === 'semua'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            Semua Riwayat
          </button>
        </div>
      </div>

      {/* Tabel Data */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
            <tr>
              <th className="px-6 py-4">Penghuni / Kamar</th>
              <th className="px-6 py-4">Periode & Nominal</th>
              <th className="px-6 py-4">Tgl Transfer</th>
              <th className="px-6 py-4">Bukti Transfer</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {filteredList.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                  Tidak ada data pembayaran pada kategori ini.
                </td>
              </tr>
            ) : (
              filteredList.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-800">{item.nama_penghuni || '-'}</div>
                    <div className="text-xs text-slate-500">Kamar {item.nomor_kamar || '-'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium capitalize">{item.periode_tagihan || '-'}</div>
                    <div className="text-xs text-slate-600">
                      Rp {Number(item.nominal_tagihan || 0).toLocaleString('id-ID')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {new Date(item.tanggal_bayar).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => setPreviewImage(item.berkas)}
                      className="text-blue-600 hover:text-blue-800 font-medium text-xs underline cursor-pointer"
                    >
                      Lihat Struk
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={item.status} />
                    {item.catatan_penolakan && (
                      <p className="text-xs text-red-600 mt-1 max-w-xs">
                        Alasan: {item.catatan_penolakan}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {item.status === 'menunggu_verifikasi' ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleTerima(item)}
                          disabled={isProcessing}
                          className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-xs font-medium rounded-lg transition cursor-pointer"
                        >
                          Terima
                        </button>
                        <button
                          onClick={() => {
                            setRejectTarget(item);
                            setCatatanPenolakan('');
                          }}
                          disabled={isProcessing}
                          className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium rounded-lg border border-red-200 transition cursor-pointer"
                        >
                          Tolak
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">Selesai diproses</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL PREVIEW FOTO BUKTI */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden"
          >
            <div className="p-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-bold text-slate-800">Bukti Transfer</h3>
              <button
                onClick={() => setPreviewImage(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-medium cursor-pointer"
              >
                Tutup ✕
              </button>
            </div>
            <div className="p-4 bg-slate-900 flex justify-center">
              <img
                src={previewImage}
                alt="Bukti Transfer"
                className="max-h-[70vh] object-contain rounded"
              />
            </div>
          </div>
        </div>
      )}

      {/* MODAL TOLAK PEMBAYARAN */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-2">Tolak Bukti Pembayaran</h3>
            <p className="text-sm text-slate-500 mb-4">
              Berikan alasan penolakan agar <span className="font-semibold">{rejectTarget.nama_penghuni}</span> dapat memperbaiki bukti transfernya.
            </p>
            <form onSubmit={handleTolakSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Catatan Penolakan
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Contoh: Nominal transfer kurang atau foto buram..."
                  value={catatanPenolakan}
                  onChange={(e) => setCatatanPenolakan(e.target.value)}
                  className="w-full text-sm text-slate-700 border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:border-red-500"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setRejectTarget(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-red-400 rounded-lg transition cursor-pointer"
                >
                  {isProcessing ? 'Memproses...' : 'Tolak Pembayaran'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}