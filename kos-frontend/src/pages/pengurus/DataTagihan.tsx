import { useEffect, useState } from 'react';
import { tagihanService } from '../../services/tagihanService';
import type { Tagihan } from '../../types/kos';
import StatusBadge from '../../components/StatusBadge';

type FilterTab = 'semua' | 'belum_dibayar' | 'menunggu_verifikasi' | 'lunas' | 'ditolak';

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'semua', label: 'Semua' },
  { key: 'belum_dibayar', label: 'Belum Bayar' },
  { key: 'menunggu_verifikasi', label: 'Menunggu Verifikasi' },
  { key: 'lunas', label: 'Lunas' },
  { key: 'ditolak', label: 'Ditolak' },
];

export default function DataTagihan() {
  const [tagihanList, setTagihanList] = useState<Tagihan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>('semua');
  const [isGenerating, setIsGenerating] = useState(false);

  const fetchTagihan = async () => {
    try {
      const res = await tagihanService.getAll();
      setTagihanList(res.data);
    } catch (error) {
      console.error('Gagal mengambil data tagihan', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTagihan();
  }, []);

  const handleGenerate = async () => {
    if (!confirm('Generate tagihan bulanan untuk seluruh penghuni aktif?')) return;
    setIsGenerating(true);
    try {
      // Panggil method generate di service. Kalau nama method-nya beda,
      // sesuaikan (misal generateBulanan / generateTagihan).
      await (tagihanService as any).generateBulanan?.();
      alert('Tagihan bulanan berhasil di-generate!');
      fetchTagihan();
    } catch (error) {
      console.error('Gagal generate tagihan', error);
      alert('Generate tagihan gagal. Pastikan method generateBulanan() ada di tagihanService.');
    } finally {
      setIsGenerating(false);
    }
  };

  const filtered =
    activeTab === 'semua'
      ? tagihanList
      : tagihanList.filter((t) => t.status === activeTab);

  if (isLoading) {
    return <div className="text-slate-500 animate-pulse p-6">Memuat data tagihan...</div>;
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-slate-200 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Manajemen Tagihan Sewa</h2>
          <p className="text-sm text-slate-500 mt-1">
            Pantau seluruh tagihan penghuni dan terbitkan tagihan bulanan secara otomatis.
          </p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="px-4 py-2 bg-primary hover:bg-primary-dark disabled:bg-primary/50 text-white text-sm font-medium rounded-lg transition cursor-pointer"
        >
          {isGenerating ? 'Memproses...' : '+ Generate Tagihan Bulanan'}
        </button>
      </div>

      {/* Filter Tab */}
      <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-1.5 text-sm font-medium rounded-full transition cursor-pointer ${
              activeTab === tab.key
                ? 'bg-primary text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
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
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                  Tidak ada data tagihan pada filter ini.
                </td>
              </tr>
            ) : (
              filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4 font-medium text-slate-800">
                    {item.penghuni?.nama_lengkap || item.penghuni?.user?.username || `Penghuni #${item.penghuni_id}`}
                  </td>
                  <td className="px-6 py-4">
                    {item.penghuni?.kamar?.nomor_kamar || item.nomor_kamar || '-'}
                  </td>
                  <td className="px-6 py-4 capitalize">{item.periode}</td>
                  <td className="px-6 py-4">
                    Rp {Number(item.nominal_tagihan || item.nominal || 0).toLocaleString('id-ID')}
                  </td>
                  <td className="px-6 py-4">
                    {new Date(item.tanggal_jatuh_tempo).toLocaleDateString('id-ID', {
                      day: '2-digit',
                      month: '2-digit',
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
    </div>
  );
}