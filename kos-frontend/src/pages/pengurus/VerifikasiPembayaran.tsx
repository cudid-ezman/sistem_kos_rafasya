import { useEffect, useState } from 'react';
import { tagihanService } from '../../services/tagihanService';
import StatusBadge from '../../components/StatusBadge';

type TabFilter = 'menunggu' | 'semua';

interface BuktiPembayaran {
  id: number;
  tagihan: number;
  penghuni_nama: string;
  nomor_kamar: string;
  periode: string;
  nominal: number;
  tanggal_bayar: string;
  nama_file: string;
  file_bukti: string | null;
  status_verifikasi: string;
  catatan_penolakan?: string;
}

export default function VerifikasiPembayaran() {
  const [buktiList, setBuktiList] = useState<BuktiPembayaran[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabFilter>('menunggu');
  const [isProcessing, setIsProcessing] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const fetchData = async () => {
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
    fetchData();
  }, []);

  const handleVerifikasi = async (id: number, aksi: 'setuju' | 'tolak') => {
    let catatan = '';
    if (aksi === 'tolak') {
      catatan = prompt('Alasan penolakan (wajib diisi):');
      if (!catatan) return;
    } else {
      if (!confirm('Setujui bukti pembayaran ini dan tandai tagihan sebagai Lunas?')) return;
    }

    setIsProcessing(id);
    try {
      await tagihanService.verifikasiBukti(id, { aksi, catatan });
      alert(`Bukti pembayaran berhasil ${aksi === 'setuju' ? 'disetujui' : 'ditolak'}!`);
      fetchData();
    } catch (error) {
      console.error('Gagal memverifikasi', error);
      alert('Gagal memverifikasi bukti pembayaran.');
    } finally {
      setIsProcessing(null);
    }
  };

  const filtered =
    activeTab === 'menunggu'
      ? buktiList.filter((b) => b.status_verifikasi === 'menunggu_verifikasi')
      : buktiList;

  if (isLoading) {
    return <div className="text-slate-500 animate-pulse p-6">Memuat data verifikasi...</div>;
  }

  const jumlahMenunggu = buktiList.filter((b) => b.status_verifikasi === 'menunggu_verifikasi').length;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header + Tab Filter */}
      <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Verifikasi Pembayaran</h2>
          <p className="text-sm text-slate-500 mt-1">
            Periksa dan validasi bukti transfer yang diunggah penghuni.
          </p>
        </div>

        {/* Tab Toggle — AKTIF pakai warna Teal (primary) sesuai PDF */}
        <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden w-fit">
          <button
            onClick={() => setActiveTab('menunggu')}
            className={`px-4 py-2 text-sm font-semibold transition cursor-pointer ${
              activeTab === 'menunggu'
                ? 'bg-primary text-white'
                : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            Perlu Verifikasi ({jumlahMenunggu})
          </button>
          <button
            onClick={() => setActiveTab('semua')}
            className={`px-4 py-2 text-sm font-semibold transition cursor-pointer border-l border-slate-200 ${
              activeTab === 'semua'
                ? 'bg-primary text-white'
                : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            Semua Riwayat
          </button>
        </div>
      </div>

      {/* Tabel */}
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
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                  Tidak ada data pembayaran pada kategori ini.
                </td>
              </tr>
            ) : (
              filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-slate-800">{item.penghuni_nama}</p>
                    <p className="text-xs text-slate-500">Kamar {item.nomor_kamar}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="capitalize font-medium">{item.periode}</p>
                    <p className="text-xs text-slate-500">
                      Rp {Number(item.nominal).toLocaleString('id-ID')}
                    </p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {new Date(item.tanggal_bayar).toLocaleDateString('id-ID', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-6 py-4">
                    {item.file_bukti ? (
                      <button
                        onClick={() => setPreviewUrl(item.file_bukti)}
                        className="text-xs font-medium text-primary hover:text-primary-dark underline cursor-pointer"
                      >
                        👁 Lihat Bukti
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400 italic">{item.nama_file}</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={item.status_verifikasi} />
                    {item.catatan_penolakan && (
                      <p className="text-[10px] text-red-500 mt-1 max-w-[140px] truncate" title={item.catatan_penolakan}>
                        {item.catatan_penolakan}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {item.status_verifikasi === 'menunggu_verifikasi' ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleVerifikasi(item.id, 'setuju')}
                          disabled={isProcessing === item.id}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg transition cursor-pointer"
                        >
                          {isProcessing === item.id ? '...' : 'Setujui'}
                        </button>
                        <button
                          onClick={() => handleVerifikasi(item.id, 'tolak')}
                          disabled={isProcessing === item.id}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 rounded-lg transition cursor-pointer"
                        >
                          {isProcessing === item.id ? '...' : 'Tolak'}
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Selesai</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Preview Bukti */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setPreviewUrl(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-lg w-full p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-bold text-slate-800">Preview Bukti Transfer</h3>
              <button
                onClick={() => setPreviewUrl(null)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none cursor-pointer"
              >
                ✕
              </button>
            </div>
            <img
              src={previewUrl}
              alt="Bukti transfer"
              className="w-full rounded-lg border border-slate-200"
            />
          </div>
        </div>
      )}
    </div>
  );
}