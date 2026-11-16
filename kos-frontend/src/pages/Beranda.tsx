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

  // ═══ LOGIKA API ASLI — TIDAK DIUBAH ═══
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

  // ═══ STYLING DIUPDATE KE TEMA PDF (TEAL) ═══
  const cardClass =
    'bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-primary hover:shadow-md transition cursor-pointer';

  return (
    <div className="space-y-6">
      {/* Header Selamat Datang */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800">
          Selamat Datang, {user.nama_lengkap || user.username}
        </h3>
        <p className="text-sm text-slate-500 mt-1">
          Ringkasan operasional Sistem Manajemen Kos Rafasya hari ini.
        </p>
      </div>

      {/* ── PENGURUS / SUPERADMIN ── */}
      {(role === 'pengurus' || role === 'superadmin') && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link to="/dashboard/kamar" className={cardClass}>
            <p className="text-xs font-medium text-slate-500">Kamar Tersedia</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.kamarTersedia}</p>
          </Link>
          <Link to="/dashboard/kamar" className={cardClass}>
            <p className="text-xs font-medium text-slate-500">Kamar Terisi</p>
            <p className="text-2xl font-bold text-primary mt-1">{stats.kamarTerisi}</p>
          </Link>
          <Link to="/dashboard/verifikasi" className={cardClass}>
            <p className="text-xs font-medium text-slate-500">Antrean Verifikasi Bayar</p>
            <p className="text-2xl font-bold text-sky-600 mt-1">{stats.menungguVerifikasi}</p>
          </Link>
          <Link to="/dashboard/keluhan" className={cardClass}>
            <p className="text-xs font-medium text-slate-500">Keluhan Belum Selesai</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{stats.keluhanAktif}</p>
          </Link>
        </div>
      )}

      {/* ── PENGHUNI ── */}
      {role === 'penghuni' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link to="/dashboard/tagihan-saya" className={cardClass}>
            <p className="text-xs font-medium text-slate-500">Tagihan Perlu Dibayar</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{stats.tagihanBelumBayar}</p>
          </Link>
          <Link to="/dashboard/keluhan-saya" className={cardClass}>
            <p className="text-xs font-medium text-slate-500">Keluhan Dalam Penanganan</p>
            <p className="text-2xl font-bold text-primary mt-1">{stats.keluhanAktif}</p>
          </Link>
        </div>
      )}

      {/* ── PEMILIK ── */}
      {role === 'pemilik' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link to="/dashboard/laporan" className={cardClass}>
            <p className="text-xs font-medium text-slate-500">Total Pemasukan Lunas</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">
              Rp {Number(stats.totalPemasukan).toLocaleString('id-ID')}
            </p>
          </Link>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs font-medium text-slate-500">Okupansi Kamar</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">
              {stats.kamarTerisi} / {stats.kamarTerisi + stats.kamarTersedia} Terisi
            </p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs font-medium text-slate-500">Kamar Kosong</p>
            <p className="text-2xl font-bold text-primary mt-1">{stats.kamarTersedia} Kamar</p>
          </div>
        </div>
      )}
    </div>
  );
}