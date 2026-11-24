import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { keluhanService } from '../../services/keluhanService';
import type { Keluhan } from '../../types/kos';
import { inisial, rupiah, tglAngka, tglPendek } from '../../lib/format';
import PageHeader from '../../components/portal/PageHeader';
import StatusPill from '../../components/portal/StatusPill';
import { Skeleton } from '../../components/portal/Skeleton';
import { useToast } from '../../components/portal/toastContext';
import { btnOutline, btnPrimary } from '../../components/portal/buttons';
import { WarningIcon } from '../../components/portal/icons';
import Modal from '../../components/admin/Modal';
import FilterTabs from '../../components/admin/FilterTabs';
import SearchInput from '../../components/admin/SearchInput';
import EmptyState from '../../components/admin/EmptyState';
import { inputCls, labelCls, tdCls, thCls } from '../../components/admin/styles';

type Filter = 'semua' | 'menunggu' | 'selesai_respon';

const LABEL_RESPON: Record<string, { label: string; cls: string }> = {
  menunggu: { label: 'Menunggu Respon Anda', cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
  dicairkan: { label: 'Dana Dicairkan', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  dicairkan_sebagian: { label: 'Dicairkan Sebagian', cls: 'bg-sky-50 text-sky-700 ring-sky-200' },
  ditolak: { label: 'Ditolak / Ditunda', cls: 'bg-rose-50 text-rose-700 ring-rose-200' },
};

export default function KeluhanPemilik() {
  const toast = useToast();
  const [list, setList] = useState<Keluhan[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('semua');
  const [cari, setCari] = useState('');

  const [terpilih, setTerpilih] = useState<Keluhan | null>(null);
  const [statusRespon, setStatusRespon] = useState<'dicairkan' | 'dicairkan_sebagian' | 'ditolak'>('dicairkan');
  const [nominalCair, setNominalCair] = useState('');
  const [catatanPemilik, setCatatanPemilik] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const muatData = async () => {
    try {
      const res = await keluhanService.getAll();
      setList(res.data);
    } catch (err) {
      console.error('Gagal memuat keluhan eskalasi', err);
      toast.error('Daftar keluhan belum bisa dimuat.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void muatData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ringkasan = useMemo(() => {
    const menunggu = list.filter((k) => k.status_pemilik === 'menunggu').length;
    const totalAjuan = list.reduce((s, k) => s + Number(k.nominal_pengajuan || 0), 0);
    const totalCair = list.reduce((s, k) => s + Number(k.nominal_pencairan || 0), 0);
    return { menunggu, totalAjuan, totalCair };
  }, [list]);

  const tersaring = useMemo(() => {
    const q = cari.trim().toLowerCase();
    return list.filter((k) => {
      if (filter === 'menunggu' && k.status_pemilik !== 'menunggu') return false;
      if (filter === 'selesai_respon' && k.status_pemilik === 'menunggu') return false;
      if (!q) return true;
      return (
        (k.nama_penghuni || '').toLowerCase().includes(q) ||
        (k.nomor_kamar || '').toLowerCase().includes(q) ||
        (k.nama_kategori || '').toLowerCase().includes(q) ||
        k.deskripsi.toLowerCase().includes(q)
      );
    });
  }, [list, filter, cari]);

  const bukaModal = (k: Keluhan) => {
    setTerpilih(k);
    const ajuan = Number(k.nominal_pengajuan || 0);
    const sudahCair = Number(k.nominal_pencairan || 0);
    if (k.status_pemilik === 'dicairkan' || k.status_pemilik === 'dicairkan_sebagian' || k.status_pemilik === 'ditolak') {
      setStatusRespon(k.status_pemilik);
      setNominalCair(sudahCair > 0 ? String(Math.round(sudahCair)) : '');
    } else {
      setStatusRespon('dicairkan');
      setNominalCair(ajuan > 0 ? String(Math.round(ajuan)) : '');
    }
    setCatatanPemilik(k.catatan_pemilik || '');
  };

  const kirimRespon = async (e: FormEvent) => {
    e.preventDefault();
    if (!terpilih) return;
    const nom = statusRespon === 'ditolak' ? 0 : Math.max(0, Number(nominalCair || 0));
    const ajuan = Number(terpilih.nominal_pengajuan || 0);

    if (statusRespon === 'dicairkan_sebagian' && nom <= 0) {
      toast.error('Masukkan nominal pencairan sebagian yang valid.');
      return;
    }

    let statusFinal = statusRespon;
    if (statusRespon === 'dicairkan' && ajuan > 0 && nom > 0 && nom < ajuan) {
      statusFinal = 'dicairkan_sebagian';
    }

    setSubmitting(true);
    try {
      await keluhanService.responPemilik(terpilih.id, {
        status_pemilik: statusFinal,
        nominal_pencairan: nom,
        catatan_pemilik: catatanPemilik.trim(),
      });
      toast.success('Feedback & pencairan dana berhasil dikirim ke pengurus.');
      setTerpilih(null);
      await muatData();
    } catch (err) {
      console.error('Gagal mengirim feedback pemilik', err);
      toast.error('Gagal menyimpan respon pemilik.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div aria-busy="true" className="space-y-4">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        crumbs={[{ label: 'Beranda', to: '/dashboard' }, { label: 'Keluhan & Perbaikan' }]}
        title="Keluhan & Pengajuan Perbaikan"
        subtitle="Tinjau bukti kerusakan yang diteruskan pengurus dan catat pencairan dana perbaikan."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold text-ink-soft uppercase">Menunggu Respon</p>
          <p className="mt-2 text-3xl font-bold text-amber-600 tabular-nums">{ringkasan.menunggu}</p>
          <p className="mt-1 text-xs text-ink-soft">Laporan kerusakan perlu ditinjau</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold text-ink-soft uppercase">Total Pengajuan Pengurus</p>
          <p className="mt-2 text-3xl font-bold text-ink tabular-nums">{rupiah(ringkasan.totalAjuan)}</p>
          <p className="mt-1 text-xs text-ink-soft">Akumulasi estimasi biaya perbaikan</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold text-ink-soft uppercase">Total Dana Dicairkan</p>
          <p className="mt-2 text-3xl font-bold text-emerald-600 tabular-nums">{rupiah(ringkasan.totalCair)}</p>
          <p className="mt-1 text-xs text-ink-soft">Transfer manual ke pengurus kos</p>
        </div>
      </div>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <FilterTabs
            value={filter}
            onChange={setFilter}
            tabs={[
              { key: 'semua', label: 'Semua', count: list.length },
              { key: 'menunggu', label: 'Menunggu Respon', count: ringkasan.menunggu },
              { key: 'selesai_respon', label: 'Sudah Direspon', count: list.length - ringkasan.menunggu },
            ]}
          />
          <SearchInput value={cari} onChange={setCari} placeholder="Cari kamar, kategori, deskripsi..." />
        </div>

        {tersaring.length === 0 ? (
          <EmptyState
            icon={<WarningIcon size={26} />}
            title="Belum ada keluhan yang diteruskan pengurus"
            text="Keluhan kerusakan fasilitas yang membutuhkan persetujuan atau dana dari pemilik akan tampil di sini."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50/70">
                <tr>
                  <th className={thCls}>Tanggal</th>
                  <th className={thCls}>Kamar &amp; Penghuni</th>
                  <th className={thCls}>Bukti &amp; Detail Kerusakan</th>
                  <th className={thCls}>Pengajuan Pengurus</th>
                  <th className={thCls}>Pencairan &amp; Feedback Anda</th>
                  <th className={`${thCls} text-right`}>Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tersaring.map((k) => {
                  const badge = LABEL_RESPON[k.status_pemilik || 'menunggu'] || LABEL_RESPON.menunggu;
                  const ajuan = Number(k.nominal_pengajuan || 0);
                  const cair = Number(k.nominal_pencairan || 0);
                  return (
                    <tr key={k.id} className="align-top transition hover:bg-slate-50/70">
                      <td className={`${tdCls} whitespace-nowrap text-ink-soft`}>{tglPendek(k.tanggal_kirim)}</td>
                      <td className={tdCls}>
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-kos-100/70 text-xs font-bold text-kos-700">
                            {inisial(k.nama_penghuni || '?')}
                          </span>
                          <div>
                            <p className="font-semibold">Kamar {k.nomor_kamar || '-'}</p>
                            <p className="text-xs text-ink-soft">{k.nama_penghuni || '-'}</p>
                            <div className="mt-1">
                              <StatusPill status={k.status} />
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className={`${tdCls} max-w-sm`}>
                        <span className="rounded-md bg-violet-50 px-2 py-0.5 text-xs font-semibold text-violet-700">
                          {k.nama_kategori || 'Umum'}
                        </span>
                        <p className="mt-1.5 text-sm text-ink">{k.deskripsi}</p>
                        {k.foto && (
                          <a href={k.foto} target="_blank" rel="noreferrer" className="mt-2 inline-block">
                            <img
                              src={k.foto}
                              alt="Bukti kerusakan"
                              className="h-20 w-28 rounded-xl object-cover ring-1 ring-slate-200 transition hover:opacity-90"
                            />
                          </a>
                        )}
                      </td>
                      <td className={`${tdCls} max-w-[220px]`}>
                        <p className="font-bold text-ink tabular-nums">
                          {ajuan > 0 ? rupiah(ajuan) : <span className="font-medium text-ink-soft">Tidak mengajukan dana</span>}
                        </p>
                        {k.catatan_pengajuan && (
                          <p className="mt-1 text-xs leading-relaxed text-ink-soft">{k.catatan_pengajuan}</p>
                        )}
                      </td>
                      <td className={`${tdCls} max-w-[240px]`}>
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${badge.cls}`}>
                          {badge.label}
                        </span>
                        {cair > 0 && (
                          <p className="mt-1.5 text-sm font-bold text-emerald-700 tabular-nums">{rupiah(cair)}</p>
                        )}
                        {k.catatan_pemilik && (
                          <p className="mt-1 text-xs text-ink-soft">{k.catatan_pemilik}</p>
                        )}
                        {k.tanggal_pencairan && (
                          <p className="mt-1 text-[11px] text-slate-400">Direspon {tglAngka(k.tanggal_pencairan)}</p>
                        )}
                      </td>
                      <td className={`${tdCls} text-right`}>
                        <button type="button" onClick={() => bukaModal(k)} className={`${btnPrimary} h-9 text-[13px]`}>
                          {k.status_pemilik === 'menunggu' ? 'Beri Feedback' : 'Ubah Respon'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal
        open={!!terpilih}
        onClose={() => setTerpilih(null)}
        title="Feedback & Pencairan Dana Perbaikan"
        description={terpilih ? `Kamar ${terpilih.nomor_kamar ?? '-'} • Kategori ${terpilih.nama_kategori ?? 'Umum'}` : undefined}
      >
        {terpilih && (
          <form onSubmit={kirimRespon} className="space-y-4">
            <div className="rounded-2xl bg-slate-50 p-4 text-sm">
              <p className="font-semibold text-ink">{terpilih.deskripsi}</p>
              {terpilih.catatan_pengajuan && (
                <p className="mt-1.5 text-xs text-ink-soft">Catatan pengurus: {terpilih.catatan_pengajuan}</p>
              )}
              <p className="mt-2 text-xs font-bold text-kos-700">
                Pengajuan Dana Pengurus:{' '}
                {Number(terpilih.nominal_pengajuan || 0) > 0
                  ? rupiah(terpilih.nominal_pengajuan || 0)
                  : 'Tidak mengajukan dana'}
              </p>
              {terpilih.foto && (
                <a href={terpilih.foto} target="_blank" rel="noreferrer">
                  <img
                    src={terpilih.foto}
                    alt="Foto kerusakan"
                    className="mt-3 max-h-48 w-full rounded-xl object-cover ring-1 ring-slate-200"
                  />
                </a>
              )}
            </div>

            <fieldset>
              <legend className={labelCls}>Keputusan Pemilik</legend>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'dicairkan', label: 'Setujui & Cairkan' },
                  { key: 'dicairkan_sebagian', label: 'Cairkan Sebagian' },
                  { key: 'ditolak', label: 'Tolak / Tunda' },
                ].map((opt) => (
                  <label
                    key={opt.key}
                    className={`cursor-pointer rounded-xl border px-2.5 py-2.5 text-center text-xs font-semibold transition ${
                      statusRespon === opt.key
                        ? 'border-kos-600 bg-kos-100/50 text-kos-700 ring-1 ring-kos-600'
                        : 'border-slate-200 text-ink-soft hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="respon_pemilik"
                      value={opt.key}
                      checked={statusRespon === opt.key}
                      onChange={() => {
                        const val = opt.key as 'dicairkan' | 'dicairkan_sebagian' | 'ditolak';
                        setStatusRespon(val);
                        if (val === 'ditolak') setNominalCair('0');
                      }}
                      className="sr-only"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </fieldset>

            {statusRespon !== 'ditolak' && (
              <div>
                <label htmlFor="nom-cair" className={labelCls}>
                  Nominal Pencairan Dana (Rp) — Transfer Manual ke Pengurus
                </label>
                <input
                  id="nom-cair"
                  type="number"
                  min={0}
                  step={1000}
                  value={nominalCair}
                  onChange={(e) => setNominalCair(e.target.value)}
                  placeholder="Contoh: 200000 (isi 0 jika tanpa pencairan uang)"
                  className={inputCls}
                />
                {statusRespon === 'dicairkan' &&
                  Number(terpilih.nominal_pengajuan || 0) > 0 &&
                  Number(nominalCair || 0) > 0 &&
                  Number(nominalCair || 0) < Number(terpilih.nominal_pengajuan || 0) && (
                    <p className="mt-1 text-xs font-medium text-amber-700">
                      Nominal lebih kecil dari pengajuan pengurus ({rupiah(terpilih.nominal_pengajuan || 0)}); status otomatis dicatat sebagai Dicairkan Sebagian.
                    </p>
                  )}
              </div>
            )}

            <div>
              <label htmlFor="cat-pemilik" className={labelCls}>Deskripsi / Catatan Feedback untuk Pengurus</label>
              <textarea
                id="cat-pemilik"
                rows={3}
                value={catatanPemilik}
                onChange={(e) => setCatatanPemilik(e.target.value)}
                placeholder="Contoh: Sudah saya transfer manual Rp 200.000 ke rekening pengurus, silakan beli keran standar saja..."
                className={inputCls}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setTerpilih(null)} className={btnOutline}>
                Batal
              </button>
              <button type="submit" disabled={submitting} className={btnPrimary}>
                {submitting ? 'Mengirim...' : 'Kirim Feedback'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
