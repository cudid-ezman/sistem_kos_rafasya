import { useEffect, useState } from 'react';
import { tagihanService } from '../../services/tagihanService';
import type { Tagihan } from '../../types/kos';
import StatusBadge from '../../components/StatusBadge';

export default function DataTagihan() {
  const [tagihanList, setTagihanList] = useState<Tagihan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('semua');

  // State Modal Generate Tagihan
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [periode, setPeriode] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const fetchTagihan = async () => {
    try {
      const res = await tagihanService.getAll();
      setTagihanList(res.data);
    } catch (error) {
      console.error('Gagal memuat data tagihan', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTagihan();
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!periode.trim()) return;

    setIsGenerating(true);
    try {
      const res = await tagihanService.generateBulanan(periode.trim());
      alert(res.data?.detail || `Tagihan periode ${periode} berhasil dibuat!`);
      setIsModalOpen(false);
      setPeriode('');
      fetchTagihan();
    } catch (error) {
      console.error('Gagal generate tagihan', error);
      alert('Terjadi kesalahan saat membuat tagihan bulanan.');
    } finally {
      setIsGenerating(false);
    }
  };

  const filteredList =
    filterStatus === 'semua'
      ? tagihanList
      : tagihanList.filter((t) => t.status === filterStatus);

  if (isLoading) {
    return <div className="text-slate-500 animate-pulse p-6">Memuat data tagihan...</div>;
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Manajemen Tagihan Sewa</h2>
          <p className="text-sm text-slate-500 mt-1">
            Pantau seluruh tagihan penghuni dan terbitkan tagihan bulanan secara otomatis.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition cursor-pointer self-start sm:self-auto"
        >
          + Generate Tagihan Bulanan
        </button>
      </div>

      {/* Filter Status */}
      <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap gap-2">
        {[
          { key: 'semua', label: 'Semua' },
          { key: 'belum_dibayar', label: 'Belum Bayar' },
          { key: 'menunggu_verifikasi', label: 'Menunggu Verifikasi' },
          { key: 'lunas', label: 'Lunas' },
          { key: 'ditolak', label: 'Ditolak' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilterStatus(tab.key)}
            className={`px-3 py-1 text-xs font-medium rounded-full transition cursor-pointer ${
              filterStatus === tab.key
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tabel */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
            <tr>
              <th className="px-6 py-4">Penghuni</th>
              <th className="px-6 py-4">Kamar</th>
              <th className="px-6 py-4">Periode</th>
              <th className="px-6 py-4">Nominal</th>
              <th className="px-6 py-4">Jatuh Tempo</th>
              <th className="px-6 py-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {filteredList.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                  Tidak ada data tagihan pada filter ini.
                </td>
              </tr>
            ) : (
              filteredList.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4 font-medium text-slate-800">
                    {item.nama_penghuni || item.penghuni?.nama_lengkap || '-'}
                  </td>
                  <td className="px-6 py-4">
                    Kamar {item.nomor_kamar || item.penghuni?.kamar?.nomor_kamar || '-'}
                  </td>
                  <td className="px-6 py-4 capitalize font-medium">{item.periode}</td>
                  <td className="px-6 py-4">
                    Rp {Number(item.nominal || 0).toLocaleString('id-ID')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {new Date(item.jatuh_tempo).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={item.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Generate Tagihan */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-slate-800 mb-2">Generate Tagihan Bulanan</h3>
            <p className="text-sm text-slate-500 mb-5">
              Sistem akan otomatis membuat tagihan untuk seluruh penghuni aktif (tarif kamar berdua otomatis dibagi dua, jatuh tempo 10 hari dari sekarang).
            </p>
            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nama Periode Tagihan
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Desember 2026"
                  value={periode}
                  onChange={(e) => setPeriode(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
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
                  disabled={isGenerating}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg transition cursor-pointer"
                >
                  {isGenerating ? 'Memproses...' : 'Terbitkan Tagihan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}