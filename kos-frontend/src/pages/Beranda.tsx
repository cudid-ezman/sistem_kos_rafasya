import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { UserProfile } from '../types/auth';
import { kamarService } from '../services/kamarService';
import { tagihanService } from '../services/tagihanService';
import { keluhanService } from '../services/keluhanService';

interface Props {
  user: UserProfile;
}

export default function Beranda({ user }: Props) {
  const role = (user.role || '').toLowerCase();
  const [stats, setStats] = useState({
    kamarTersedia: 0,
    kamarTerisi: 0,
    menungguVerifikasi: 0,
    keluhanAktif: 0,
    tagihanBelumBayar: 0,
    totalPemasukan: 0,
  });

  useEffect(() => {
    const loadStats = async () => {
      try {
        if (role === 'pengurus' || role === 'superadmin') {
          const [resKamar, resBukti, resKeluhan] = await Promise.all([
            kamarService.getAllKamar(),
            tagihanService.getBuktiPembayaran(),
            keluhanService.getAll(),
          ]);
          setStats((prev) => ({
            ...prev,
            kamarTersedia: resKamar.data.filter((k) => k.status === 'tersedia').length,
            kamarTerisi: resKamar.data.filter((k) => k.status === 'terisi').length,
            menungguVerifikasi: resBukti.data.filter((b) => b.status === 'menunggu_verifikasi').length,
            keluhanAktif: resKeluhan.data.filter((c) => c.status !== 'selesai').length,
          }));
        } else if (role === 'penghuni') {
          const [resTagihan, resKeluhan] = await Promise.all([
            tagihanService.getAll(),
            keluhanService.getAll(),
          ]);
          setStats((prev) => ({
            ...prev,
            tagihanBelumBayar: resTagihan.data.filter(
              (t) => t.status === 'belum_dibayar' || t.status === 'ditolak' || t.status === 'terlambat'
            ).length,
            keluhanAktif: resKeluhan.data.filter((c) => c.status !== 'selesai').length,
          }));
        } else if (role === 'pemilik') {
          const [resLaporan, resKamar] = await Promise.all([
            tagihanService.getLaporanKeuangan(),
            kamarService.getAllKamar(),
          ]);
          setStats((prev) => ({
            ...prev,
            totalPemasukan: resLaporan.data.total_pemasukan || 0,
            kamarTerisi: resKamar.data.filter((k) => k.status === 'terisi').length,
            kamarTersedia: resKamar.data.filter((k) => k.status === 'tersedia').length,
          }));
        }
      } catch (error) {
        console.error('Gagal memuat statistik beranda', error);
      }
    };

    loadStats();
  }, [role]);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800">
          Selamat Datang, {user.nama_lengkap || user.username}
        </h3>
        <p className="text-sm text-slate-500 mt-1">
          Ringkasan operasional Sistem Manajemen Kos Rafasya hari ini.
        </p>
      </div>

      {(role === 'pengurus' || role === 'superadmin') && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link to="/dashboard/kamar" className="bg-white p-5 rounded-xl border border-slate-200 hover:border-blue-400 transition">
            <p className="text-xs font-medium text-slate-500">Kamar Tersedia</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{stats.kamarTersedia}</p>
          </Link>
          <Link to="/dashboard/kamar" className="bg-white p-5 rounded-xl border border-slate-200 hover:border-blue-400 transition">
            <p className="text-xs font-medium text-slate-500">Kamar Terisi</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{stats.kamarTerisi}</p>
          </Link>
          <Link to="/dashboard/verifikasi" className="bg-white p-5 rounded-xl border border-slate-200 hover:border-blue-400 transition">
            <p className="text-xs font-medium text-slate-500">Antrean Verifikasi Bayar</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{stats.menungguVerifikasi}</p>
          </Link>
          <Link to="/dashboard/keluhan" className="bg-white p-5 rounded-xl border border-slate-200 hover:border-blue-400 transition">
            <p className="text-xs font-medium text-slate-500">Keluhan Belum Selesai</p>
            <p className="text-2xl font-bold text-orange-600 mt-1">{stats.keluhanAktif}</p>
          </Link>
        </div>
      )}

      {role === 'penghuni' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link to="/dashboard/tagihan-saya" className="bg-white p-5 rounded-xl border border-slate-200 hover:border-blue-400 transition">
            <p className="text-xs font-medium text-slate-500">Tagihan Perlu Dibayar</p>
            <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.tagihanBelumBayar}</p>
          </Link>
          <Link to="/dashboard/keluhan-saya" className="bg-white p-5 rounded-xl border border-slate-200 hover:border-blue-400 transition">
            <p className="text-xs font-medium text-slate-500">Keluhan Dalam Penanganan</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{stats.keluhanAktif}</p>
          </Link>
        </div>
      )}

      {role === 'pemilik' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link to="/dashboard/laporan" className="bg-white p-5 rounded-xl border border-slate-200 hover:border-blue-400 transition">
            <p className="text-xs font-medium text-slate-500">Total Pemasukan Lunas</p>
            <p className="text-2xl font-bold text-green-600 mt-1">
              Rp {Number(stats.totalPemasukan).toLocaleString('id-ID')}
            </p>
          </Link>
          <div className="bg-white p-5 rounded-xl border border-slate-200">
            <p className="text-xs font-medium text-slate-500">Okupansi Kamar</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">
              {stats.kamarTerisi} / {stats.kamarTerisi + stats.kamarTersedia} Terisi
            </p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200">
            <p className="text-xs font-medium text-slate-500">Kamar Kosong</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{stats.kamarTersedia} Kamar</p>
          </div>
        </div>
      )}
    </div>
  );
}