import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { tagihanService } from '../../services/tagihanService';
import type { BuktiPembayaran } from '../../types/kos';
import { inisial, rupiah, tglAngka, tglWaktu } from '../../lib/format';
import PageHeader from '../../components/portal/PageHeader';
import StatusPill from '../../components/portal/StatusPill';
import { Skeleton } from '../../components/portal/Skeleton';
import { useToast } from '../../components/portal/toastContext';
import { btnOutline, btnPrimary } from '../../components/portal/buttons';
import { CheckIcon, ImageIcon, ShieldCheckIcon, XIcon } from '../../components/portal/icons';
import Modal from '../../components/admin/Modal';
import ConfirmDialog from '../../components/admin/ConfirmDialog';
import FilterTabs from '../../components/admin/FilterTabs';
import EmptyState from '../../components/admin/EmptyState';
import { inputCls, labelCls } from '../../components/admin/styles';

type Tab = 'menunggu' | 'semua';

const ALASAN_CEPAT = ['Bukti buram / tidak terbaca', 'Nominal tidak sesuai tagihan', 'Bukan bukti pembayaran QRIS'];

const statusPill = (s: BuktiPembayaran['status']) => (s === 'diterima' ? 'disetujui' : s);

export default function VerifikasiPembayaran() {
  const toast = useToast();
  const [list, setList] = useState<BuktiPembayaran[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('menunggu');
  const [terpilih, setTerpilih] = useState<number | null>(null);
  const [gambarError, setGambarError] = useState<number | null>(null);

  const [setujuiOpen, setSetujuiOpen] = useState(false);
  const [tolakOpen, setTolakOpen] = useState(false);
  const [alasan, setAlasan] = useState('');
  const [memproses, setMemproses] = useState(false);

  const fetchData = async () => {
    try {
      const res = await tagihanService.getBuktiPembayaran();
      setList(res.data);
    } catch (error) {
      console.error('Gagal mengambil data bukti pembayaran', error);
      toast.error('Data bukti pembayaran belum bisa dimuat.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const urut = useMemo(() => [...list].sort((a, b) => b.waktu_unggah.localeCompare(a.waktu_unggah)), [list]);
  const menunggu = urut.filter((b) => b.status === 'menunggu_verifikasi');
  const tampil = tab === 'menunggu' ? menunggu : urut;
  const dipilih = tampil.find((b) => b.id === terpilih) ?? tampil[0];

  const proses = async (aksi: 'terima' | 'tolak', catatan = '') => {
    if (!dipilih) return;
    setMemproses(true);
    try {
      await tagihanService.prosesVerifikasi(dipilih.id, aksi, catatan);
      toast.success(aksi === 'terima' ? 'Pembayaran disetujui. Tagihan ditandai lunas.' : 'Pembayaran ditolak. Penghuni akan diminta mengunggah ulang.');
      setSetujuiOpen(false);
      setTolakOpen(false);
      setAlasan('');
      await fetchData();
    } catch (error) {
      console.error('Gagal memverifikasi', error);
      toast.error('Gagal memproses verifikasi. Coba lagi.');
    } finally {
      setMemproses(false);
    }
  };

  const kirimTolak = (e: FormEvent) => {
    e.preventDefault();
    if (alasan.trim().length < 3) return;
    void proses('tolak', alasan.trim());
  };

  if (isLoading) {
    return (
      <div aria-busy="true">
        <Skeleton className="mb-3 h-4 w-40" />
        <Skeleton className="mb-6 h-9 w-72" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        crumbs={[{ label: 'Beranda', to: '/dashboard' }, { label: 'Verifikasi Pembayaran' }]}
        title="Verifikasi Pembayaran"
        subtitle="Periksa dan validasi bukti pembayaran yang diunggah penghuni."
      />

      <div className="mb-5">
        <FilterTabs
          value={tab}
          onChange={(t) => {
            setTab(t);
            setTerpilih(null);
          }}
          tabs={[
            { key: 'menunggu', label: 'Perlu Verifikasi', count: menunggu.length },
            { key: 'semua', label: 'Semua Riwayat', count: list.length },
          ]}
        />
      </div>

      {tampil.length === 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white">
          <EmptyState
            icon={<ShieldCheckIcon size={26} />}
            title={tab === 'menunggu' ? 'Antrean kosong' : 'Belum ada pembayaran'}
            text={tab === 'menunggu' ? 'Semua bukti pembayaran sudah diperiksa. Kerja bagus!' : 'Bukti pembayaran dari penghuni akan muncul di sini.'}
          />
        </section>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,380px)_1fr]">
          {/* Daftar */}
          <ul className="space-y-2.5" aria-label="Daftar bukti pembayaran">
            {tampil.map((b) => {
              const aktif = dipilih?.id === b.id;
              return (
                <li key={b.id}>
                  <button
                    type="button"
                    onClick={() => setTerpilih(b.id)}
                    aria-pressed={aktif}
                    className={`flex w-full cursor-pointer items-center gap-3 rounded-2xl border bg-white p-4 text-left transition ${
                      aktif ? 'border-kos-600 ring-1 ring-kos-600' : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                    }`}
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-kos-100/70 text-sm font-bold text-kos-700">
                      {inisial(b.nama_penghuni || '?')}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">{b.nama_penghuni || '-'}</span>
                      <span className="block truncate text-xs text-ink-soft capitalize">
                        Kamar {b.nomor_kamar || '-'} • {b.periode_tagihan}
                      </span>
                    </span>
                    <span className="flex flex-col items-end gap-1">
                      <span className="text-sm font-bold text-ink tabular-nums">{rupiah(b.nominal_tagihan)}</span>
                      {Number(b.denda_tagihan || 0) > 0 && (
                        <span className="text-[10.5px] font-medium text-orange-600">
                          + denda {rupiah(b.denda_tagihan || 0)}
                        </span>
                      )}
                      <StatusPill status={statusPill(b.status)} />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Detail & pratinjau */}
          {dipilih && (
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white lg:sticky lg:top-24">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-kos-600 text-sm font-bold text-white">
                    {inisial(dipilih.nama_penghuni || '?')}
                  </span>
                  <div>
                    <p className="font-bold text-ink">{dipilih.nama_penghuni || '-'}</p>
                    <p className="text-xs text-ink-soft capitalize">
                      Kamar {dipilih.nomor_kamar || '-'} • {dipilih.periode_tagihan}
                    </p>
                  </div>
                </div>
                <StatusPill status={statusPill(dipilih.status)} />
              </div>

              <div className="grid gap-5 p-6 md:grid-cols-[1fr_220px]">
                <a
                  href={dipilih.berkas}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex min-h-[260px] items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
                  aria-label="Buka bukti pembayaran ukuran penuh"
                >
                  {gambarError === dipilih.id || !dipilih.berkas ? (
                    <span className="flex flex-col items-center gap-2 p-6 text-center text-sm text-ink-soft">
                      <ImageIcon size={32} className="text-slate-300" />
                      Gambar tidak dapat ditampilkan
                    </span>
                  ) : (
                    <img
                      src={dipilih.berkas}
                      alt={`Bukti pembayaran ${dipilih.nama_penghuni ?? ''}`}
                      onError={() => setGambarError(dipilih.id)}
                      className="max-h-[440px] w-full object-contain transition group-hover:scale-[1.02]"
                    />
                  )}
                </a>

                <dl className="space-y-4 text-sm">
                  {[
                    [
                      'Nominal tagihan',
                      Number(dipilih.denda_tagihan || 0) > 0
                        ? `${rupiah(dipilih.nominal_tagihan)} (Pokok ${rupiah(dipilih.nominal_pokok || 0)} + denda ${rupiah(dipilih.denda_tagihan || 0)})`
                        : rupiah(dipilih.nominal_tagihan),
                    ],
                    ['Tanggal transfer', tglAngka(dipilih.tanggal_bayar)],
                    ['Diunggah', tglWaktu(dipilih.waktu_unggah)],
                    ...(dipilih.tanggal_verifikasi ? [['Diverifikasi', tglAngka(dipilih.tanggal_verifikasi)]] : []),
                  ].map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-[11px] font-semibold text-ink-soft">{k}</dt>
                      <dd className="mt-0.5 font-semibold text-ink tabular-nums">{v}</dd>
                    </div>
                  ))}
                  {dipilih.catatan_penolakan && (
                    <div className="rounded-lg bg-rose-50 p-3 text-xs leading-relaxed text-rose-800">
                      <p className="font-bold">Alasan penolakan</p>
                      {dipilih.catatan_penolakan}
                    </div>
                  )}
                </dl>
              </div>

              {dipilih.status === 'menunggu_verifikasi' && (
                <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50/60 px-6 py-4 sm:flex-row sm:justify-end">
                  <button type="button" onClick={() => setTolakOpen(true)} className={`${btnOutline} text-rose-600 hover:!border-rose-200 hover:!bg-rose-50`}>
                    <XIcon size={17} /> Tolak
                  </button>
                  <button type="button" onClick={() => setSetujuiOpen(true)} className={btnPrimary}>
                    <CheckIcon size={17} /> Setujui Pembayaran
                  </button>
                </div>
              )}
            </section>
          )}
        </div>
      )}

      <ConfirmDialog
        open={setujuiOpen}
        title="Setujui pembayaran?"
        message={`Bukti pembayaran ${dipilih?.nama_penghuni ?? ''} (${dipilih?.periode_tagihan ?? ''}) akan disetujui dan tagihan ditandai Lunas.`}
        confirmLabel="Ya, setujui"
        loading={memproses}
        onConfirm={() => proses('terima')}
        onCancel={() => setSetujuiOpen(false)}
      />

      <Modal open={tolakOpen} onClose={() => setTolakOpen(false)} title="Tolak bukti pembayaran" description="Alasan akan ditampilkan kepada penghuni agar bisa mengunggah ulang.">
        <form onSubmit={kirimTolak} className="space-y-4">
          <div>
            <label htmlFor="alasan" className={labelCls}>Alasan penolakan <span className="text-rose-600">*</span></label>
            <textarea id="alasan" rows={3} required value={alasan} onChange={(e) => setAlasan(e.target.value)} placeholder="Jelaskan kenapa bukti ditolak..." className={inputCls} />
            <div className="mt-2 flex flex-wrap gap-2">
              {ALASAN_CEPAT.map((a) => (
                <button key={a} type="button" onClick={() => setAlasan(a)} className="cursor-pointer rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-ink-soft transition hover:border-kos-500 hover:text-kos-700">
                  {a}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setTolakOpen(false)} className={btnOutline}>Batal</button>
            <button type="submit" disabled={memproses || alasan.trim().length < 3} className="inline-flex h-10 cursor-pointer items-center justify-center rounded-lg bg-rose-600 px-4 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50">
              {memproses ? 'Memproses...' : 'Tolak Pembayaran'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
