import { useEffect, useState } from 'react';
import { kamarService, type CreatePenghuniPayload } from '../../services/kamarService';
import type { Kamar, Penghuni } from '../../types/kos';

export default function DataPenghuni() {
  const [penghuniList, setPenghuniList] = useState<Penghuni[]>([]);
  const [kamarTersedia, setKamarTersedia] = useState<Kamar[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<CreatePenghuniPayload>({
    nama_lengkap: '',
    no_identitas: '',
    no_kontak: '',
    kamar: 0,
    tanggal_masuk: new Date().toISOString().split('T')[0],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      const [resPenghuni, resKamar] = await Promise.all([
        kamarService.getAllPenghuni(),
        kamarService.getAllKamar(),
      ]);
      setPenghuniList(resPenghuni.data);
      const tersedia = resKamar.data.filter((k) => k.status === 'tersedia');
      setKamarTersedia(tersedia);
      if (tersedia.length > 0) {
        setFormData((prev) => ({ ...prev, kamar: tersedia[0].id }));
      }
    } catch (error) {
      console.error('Gagal memuat data penghuni', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.kamar) {
      alert('Pilih kamar yang tersedia terlebih dahulu.');
      return;
    }

    setIsSubmitting(true);
    try {
      await kamarService.createPenghuni(formData);
      alert(
        `Penghuni berhasil ditambahkan!\nAkun login otomatis dibuat:\nUsername: ${formData.no_identitas}\nPassword: kos12345`
      );
      setIsModalOpen(false);
      setFormData({
        nama_lengkap: '',
        no_identitas: '',
        no_kontak: '',
        kamar: 0,
        tanggal_masuk: new Date().toISOString().split('T')[0],
      });
      fetchData();
    } catch (error) {
      console.error('Gagal menambah penghuni', error);
      alert('Gagal menambah penghuni. Pastikan NIK belum terdaftar.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="text-slate-500 animate-pulse p-6">Memuat data penghuni...</div>;
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-200 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Daftar Penghuni Kos</h2>
          <p className="text-sm text-slate-500 mt-1">
            Penambahan penghuni otomatis membuatkan akun login & mengisi status kamar.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition cursor-pointer"
        >
          + Tambah Penghuni
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
            <tr>
              <th className="px-6 py-4">Nama Lengkap</th>
              <th className="px-6 py-4">NIK / Username</th>
              <th className="px-6 py-4">No. Kontak</th>
              <th className="px-6 py-4">Kamar</th>
              <th className="px-6 py-4">Tanggal Masuk</th>
              <th className="px-6 py-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {penghuniList.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                  Belum ada penghuni terdaftar.
                </td>
              </tr>
            ) : (
              penghuniList.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4 font-medium text-slate-800">{item.nama_lengkap}</td>
                  <td className="px-6 py-4 font-mono text-xs">{item.no_identitas}</td>
                  <td className="px-6 py-4">{item.no_kontak}</td>
                  <td className="px-6 py-4 font-medium">Kamar {item.nomor_kamar || '-'}</td>
                  <td className="px-6 py-4">
                    {new Date(item.tanggal_masuk).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-6 py-4">
                    {item.status_aktif ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        Aktif
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-200 text-slate-600">
                        Nonaktif
                      </span>
                    )}
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
            <h3 className="text-xl font-bold text-slate-800 mb-4">Registrasi Penghuni Baru</h3>
            {kamarTersedia.length === 0 ? (
              <div className="text-sm text-red-600 bg-red-50 p-4 rounded-lg mb-4">
                Semua kamar saat ini berstatus terisi. Tambahkan kamar baru atau ubah status kamar terlebih dahulu.
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nama Lengkap</label>
                  <input
                    type="text"
                    required
                    placeholder="Nama sesuai KTP"
                    value={formData.nama_lengkap}
                    onChange={(e) => setFormData({ ...formData, nama_lengkap: e.target.value })}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    No. Identitas (NIK) <span className="text-xs text-slate-400">(Jadi Username Login)</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="16 digit NIK"
                    value={formData.no_identitas}
                    onChange={(e) => setFormData({ ...formData, no_identitas: e.target.value })}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">No. HP / WhatsApp</label>
                  <input
                    type="text"
                    required
                    placeholder="0812xxxxxxxx"
                    value={formData.no_kontak}
                    onChange={(e) => setFormData({ ...formData, no_kontak: e.target.value })}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Pilih Kamar</label>
                    <select
                      value={formData.kamar}
                      onChange={(e) => setFormData({ ...formData, kamar: Number(e.target.value) })}
                      className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                    >
                      {kamarTersedia.map((k) => (
                        <option key={k.id} value={k.id}>
                          Kamar {k.nomor_kamar} ({k.tipe})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal Masuk</label>
                    <input
                      type="date"
                      required
                      value={formData.tanggal_masuk}
                      onChange={(e) => setFormData({ ...formData, tanggal_masuk: e.target.value })}
                      className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                    />
                  </div>
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
                    {isSubmitting ? 'Menyimpan...' : 'Daftarkan Penghuni'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}