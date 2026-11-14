import { useEffect, useState } from 'react';
import { tagihanService } from '../../services/tagihanService';
import type { Tagihan } from '../../types/kos';
import StatusBadge from '../../components/StatusBadge';

export default function LaporanKeuangan() {
  const [totalPemasukan, setTotalPemasukan] = useState<number>(0);
  const [transaksi, setTransaksi] = useState<Tagihan[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLaporan = async () => {
      try {
        const res = await tagihanService.getLaporanKeuangan();
        setTotalPemasukan(res.data.total_pemasukan || 0);
        setTransaksi(res.data.transaksi || []);
      } catch (error) {
        console.error('Gagal memuat laporan keuangan', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLaporan();
  }, []);

  const filteredTransaksi = transaksi.filter((item) => {
    const keyword = searchQuery.toLowerCase();
    const nama = (item.nama_penghuni || item.penghuni?.nama_lengkap || '').toLowerCase();
    const periode = (item.periode || '').toLowerCase();
    const kamar = (item.nomor_kamar || item.penghuni?.kamar?.nomor_kamar || '').toLowerCase();
    return nama.includes(keyword) || periode.includes(keyword) || kamar.includes(keyword);
  });

  if (isLoading) {
    return <div className="text-slate-500 animate-pulse p-6">Memuat laporan keuangan...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Kartu Ringkasan Pemasukan */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Total Pemasukan Lunas</p>
          <p className="text-3xl font-bold text-green-600 mt-2">
            Rp {Number(totalPemasukan).toLocaleString('id-ID')}
          </p>
          <p className="text-xs text-slate-400 mt-2">
            Akumulasi dari seluruh pembayaran sewa yang telah diverifikasi pengurus.
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Total Transaksi Lunas</p>
            <p className="text-3xl font-bold text-slate-800 mt-2">{transaksi.length} Transaksi</p>
          </div>
          <div className="mt-4">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-medium rounded-lg transition cursor-pointer"
            >
              Cetak / Simpan PDF
            </button>
          </div>
        </div>
      </div>

      {/* Tabel Rincian Pemasukan */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Rincian Pemasukan Sewa</h2>
            <p className="text-sm text-slate-500 mt-1">Daftar tagihan penghuni yang berstatus Lunas.</p>
          </div>
          <input
            type="text"
            placeholder="Cari periode, nama, atau kamar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="text-sm border border-slate-300 rounded-lg px-3 py-2 w-full sm:w-64 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Periode</th>
                <th className="px-6 py-4">Penghuni</th>
                <th className="px-6 py-4">Nomor Kamar</th>
                <th className="px-6 py-4">Nominal Masuk</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredTransaksi.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    Belum ada transaksi pemasukan yang tercatat.
                  </td>
                </tr>
              ) : (
                filteredTransaksi.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4 font-medium capitalize">{item.periode}</td>
                    <td className="px-6 py-4">
                      {item.nama_penghuni || item.penghuni?.nama_lengkap || '-'}
                    </td>
                    <td className="px-6 py-4">
                      Kamar {item.nomor_kamar || item.penghuni?.kamar?.nomor_kamar || '-'}
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-800">
                      Rp {Number(item.nominal || 0).toLocaleString('id-ID')}
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
    </div>
  );
}