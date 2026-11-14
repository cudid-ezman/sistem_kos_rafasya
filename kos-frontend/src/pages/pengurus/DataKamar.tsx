import { useEffect, useState } from 'react';
import { kamarService, type CreateKamarPayload } from '../../services/kamarService';
import type { Kamar } from '../../types/kos';
import StatusBadge from '../../components/StatusBadge';

export default function DataKamar() {
  const [kamarList, setKamarList] = useState<Kamar[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<CreateKamarPayload>({
    nomor_kamar: '',
    tipe: 'individu',
    harga_sewa: 375000,
    fasilitas: '',
    status: 'tersedia',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchKamar = async () => {
    try {
      const res = await kamarService.getAllKamar();
      setKamarList(res.data);
    } catch (error) {
      console.error('Gagal mengambil data kamar', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchKamar();
  }, []);

  const openCreateModal = () => {
    setEditingId(null);
    setFormData({
      nomor_kamar: '',
      tipe: 'individu',
      harga_sewa: 375000,
      fasilitas: '',
      status: 'tersedia',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (kamar: Kamar) => {
    setEditingId(kamar.id);
    setFormData({
      nomor_kamar: kamar.nomor_kamar,
      tipe: kamar.tipe,
      harga_sewa: kamar.harga_sewa,
      fasilitas: kamar.fasilitas,
      status: kamar.status,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingId) {
        await kamarService.updateKamar(editingId, formData);
        alert('Data kamar berhasil diperbarui!');
      } else {
        await kamarService.createKamar(formData);
        alert('Kamar baru berhasil ditambahkan!');
      }
      setIsModalOpen(false);
      fetchKamar();
    } catch (error) {
      console.error('Gagal menyimpan data kamar', error);
      alert('Gagal menyimpan data kamar. Pastikan nomor kamar tidak duplikat.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (kamar: Kamar) => {
    if (!confirm(`Hapus kamar nomor ${kamar.nomor_kamar}?`)) return;
    try {
      await kamarService.deleteKamar(kamar.id);
      fetchKamar();
    } catch (error) {
      console.error('Gagal menghapus kamar', error);
      alert('Gagal menghapus kamar.');
    }
  };

  if (isLoading) {
    return <div className="text-slate-500 animate-pulse p-6">Memuat data kamar...</div>;
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-200 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Manajemen Data Kamar</h2>
          <p className="text-sm text-slate-500 mt-1">Kelola daftar kamar, harga sewa, fasilitas, dan ketersediaan.</p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition cursor-pointer"
        >
          + Tambah Kamar
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
            <tr>
              <th className="px-6 py-4">No. Kamar</th>
              <th className="px-6 py-4">Tipe</th>
              <th className="px-6 py-4">Harga Sewa / Bulan</th>
              <th className="px-6 py-4">Fasilitas</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {kamarList.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                  Belum ada data kamar.
                </td>
              </tr>
            ) : (
              kamarList.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4 font-bold text-slate-800">{item.nomor_kamar}</td>
                  <td className="px-6 py-4 capitalize">{item.tipe}</td>
                  <td className="px-6 py-4">Rp {Number(item.harga_sewa).toLocaleString('id-ID')}</td>
                  <td className="px-6 py-4 max-w-xs truncate" title={item.fasilitas}>
                    {item.fasilitas}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="px-6 py-4 flex gap-3">
                    <button
                      onClick={() => openEditModal(item)}
                      className="text-blue-600 hover:text-blue-800 font-medium text-xs cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(item)}
                      className="text-red-600 hover:text-red-800 font-medium text-xs cursor-pointer"
                    >
                      Hapus
                    </button>
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
            <h3 className="text-xl font-bold text-slate-800 mb-4">
              {editingId ? 'Edit Data Kamar' : 'Tambah Kamar Baru'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nomor Kamar</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: A-01"
                  value={formData.nomor_kamar}
                  onChange={(e) => setFormData({ ...formData, nomor_kamar: e.target.value })}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tipe Kamar</label>
                  <select
                    value={formData.tipe}
                    onChange={(e) =>
                      setFormData({ ...formData, tipe: e.target.value as 'individu' | 'berdua' })
                    }
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                  >
                    <option value="individu">Individu</option>
                    <option value="berdua">Berdua</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value as 'tersedia' | 'terisi' })
                    }
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                  >
                    <option value="tersedia">Tersedia</option>
                    <option value="terisi">Terisi</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Harga Sewa (Rp)</label>
                <input
                  type="number"
                  required
                  min={0}
                  value={formData.harga_sewa}
                  onChange={(e) => setFormData({ ...formData, harga_sewa: Number(e.target.value) })}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Fasilitas</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Kasur, Lemari, Kamar Mandi Dalam, Wi-Fi..."
                  value={formData.fasilitas}
                  onChange={(e) => setFormData({ ...formData, fasilitas: e.target.value })}
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
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg transition cursor-pointer"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}