import { useEffect, useState } from 'react';
import { keluhanService } from '../../services/keluhanService';
import type { Keluhan } from '../../types/kos';
import StatusBadge from '../../components/StatusBadge';

export default function DaftarKeluhan() {
  const [keluhanList, setKeluhanList] = useState<Keluhan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // State Modal Tindak Lanjut
  const [selectedKeluhan, setSelectedKeluhan] = useState<Keluhan | null>(null);
  const [statusBaru, setStatusBaru] = useState<'diterima' | 'diproses' | 'selesai'>('diproses');
  const [catatan, setCatatan] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchKeluhan = async () => {
    try {
      const res = await keluhanService.getAll();
      setKeluhanList(res.data);
    } catch (error) {
      console.error('Gagal mengambil daftar keluhan', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchKeluhan();
  }, []);

  const openModal = (item: Keluhan) => {
    setSelectedKeluhan(item);
    setStatusBaru(item.status === 'diterima' ? 'diproses' : item.status);
    setCatatan(item.catatan_tindak_lanjut || '');
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedKeluhan) return;

    setIsSubmitting(true);
    try {
      await keluhanService.updateStatus(selectedKeluhan.id, {
        status: statusBaru,
        catatan_tindak_lanjut: catatan,
      });
      alert('Status keluhan berhasil diperbarui!');
      setSelectedKeluhan(null);
      fetchKeluhan();
    } catch (error) {
      console.error('Gagal memperbarui keluhan', error);
      alert('Terjadi kesalahan saat memperbarui status keluhan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="text-slate-500 animate-pulse p-6">Memuat daftar keluhan...</div>;
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-200">
        <h2 className="text-lg font-bold text-slate-800">Daftar Keluhan Penghuni</h2>
        <p className="text-sm text-slate-500 mt-1">
          Kelola dan tindak lanjuti laporan kerusakan fasilitas dari penghuni kos.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
            <tr>
              <th className="px-6 py-4">Tanggal</th>
              <th className="px-6 py-4">Penghuni / Kamar</th>
              <th className="px-6 py-4">Kategori & Deskripsi</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Catatan Pengurus</th>
              <th className="px-6 py-4">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {keluhanList.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                  Belum ada laporan keluhan masuk.
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
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-800">{item.nama_penghuni || '-'}</div>
                    <div className="text-xs text-slate-500">Kamar {item.nomor_kamar || '-'}</div>
                  </td>
                  <td className="px-6 py-4 max-w-xs">
                    <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                      {item.nama_kategori || 'Umum'}
                    </span>
                    <p className="mt-1 text-slate-700">{item.deskripsi}</p>
                    {item.foto && (
                      <a
                        href={item.foto}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                      >
                        Lihat Foto Bukti
                      </a>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="px-6 py-4 text-slate-600 max-w-xs">
                    {item.catatan_tindak_lanjut || (
                      <span className="italic text-slate-400">Belum ditindaklanjuti</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => openModal(item)}
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-medium rounded-lg transition cursor-pointer"
                    >
                      Tindak Lanjut
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Tindak Lanjut */}
      {selectedKeluhan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-slate-800 mb-2">Update Tindak Lanjut</h3>
            <p className="text-sm text-slate-500 mb-4">
              Laporan dari <span className="font-semibold">{selectedKeluhan.nama_penghuni}</span> (Kamar {selectedKeluhan.nomor_kamar})
            </p>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Status Penanganan</label>
                <select
                  value={statusBaru}
                  onChange={(e) => setStatusBaru(e.target.value as 'diterima' | 'diproses' | 'selesai')}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                >
                  <option value="diterima">Diterima</option>
                  <option value="diproses">Sedang Diproses</option>
                  <option value="selesai">Selesai</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Catatan untuk Penghuni
                </label>
                <textarea
                  rows={3}
                  placeholder="Contoh: Teknisi dijadwalkan datang besok pukul 10.00 WIB..."
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setSelectedKeluhan(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg transition cursor-pointer"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}