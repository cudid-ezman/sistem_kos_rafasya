import { useEffect, useState } from 'react';
import api from '../../services/api';

interface Tagihan {
  id: number;
  periode: string;
  nominal: number;
  jatuh_tempo: string;
  status: string;
  penghuni?: {
    nama_lengkap?: string;
    kamar?: {
      nomor_kamar?: string;
    };
  };
  penghuni_id?: number;
}

export default function TagihanSaya() {
  const [tagihan, setTagihan] = useState<Tagihan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // State untuk Modal Upload
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTagihan, setSelectedTagihan] = useState<Tagihan | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const fetchTagihan = async () => {
    try {
      const res = await api.get<Tagihan[]>('/tagihan/');
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

  // Fungsi untuk membuka Modal
  const openModal = (item: Tagihan) => {
    setSelectedTagihan(item);
    setFile(null); // Reset file sebelumnya
    setIsModalOpen(true);
  };

  // Fungsi untuk mengirim File ke Django
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !selectedTagihan) return;

    setIsUploading(true);
    
    // Wajib menggunakan FormData untuk mengirim file
    const formData = new FormData();
    formData.append('bukti_pembayaran', file); 
    formData.append('status', 'menunggu_verifikasi'); // Ubah status agar diperiksa pengurus

    try {
      await api.patch(`/tagihan/${selectedTagihan.id}/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      alert('Bukti pembayaran berhasil diunggah!');
      setIsModalOpen(false);
      fetchTagihan(); // Refresh data tabel agar statusnya berubah
    } catch (error) {
      console.error('Gagal mengunggah bukti', error);
      alert('Gagal mengunggah bukti pembayaran.');
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
                    Kamar {item.penghuni?.kamar?.nomor_kamar || item.penghuni_id || '-'}
                  </td>
                  <td className="px-6 py-4">
                    Rp {Number(item.nominal || 0).toLocaleString('id-ID')}
                  </td>
                  <td className="px-6 py-4">
                    {item.status === 'lunas' ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">Lunas</span>
                    ) : item.status === 'ditolak' ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">Ditolak</span>
                    ) : item.status === 'menunggu_verifikasi' ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Menunggu Verifikasi</span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Belum Bayar</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {(item.status === 'belum_dibayar' || item.status === 'ditolak') && (
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

      {/* MODAL UPLOAD BUKTI */}
      {isModalOpen && selectedTagihan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-slate-800 mb-2">Upload Bukti Transfer</h3>
            <p className="text-sm text-slate-500 mb-6">
              Tagihan periode <span className="font-semibold capitalize">{selectedTagihan.periode}</span> sebesar <span className="font-semibold">Rp {Number(selectedTagihan.nominal).toLocaleString('id-ID')}</span>.
            </p>

            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Pilih Foto/Screenshot Bukti
                </label>
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
                  disabled={!file || isUploading}
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