import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { tagihanService } from '../../services/tagihanService';
import { hariIniISO, hitungDenda, rupiah, totalTagihan } from '../../lib/format';
import { usePortal } from '../../components/portal/portalContext';
import { useToast } from '../../components/portal/toastContext';
import PageHeader from '../../components/portal/PageHeader';
import StatusPill from '../../components/portal/StatusPill';
import Dropzone from '../../components/portal/Dropzone';
import { PageSkeleton } from '../../components/portal/Skeleton';
import { btnOutline, btnPrimary } from '../../components/portal/buttons';
import {
  ArrowLeftIcon,
  CheckIcon,
  CopyIcon,
  DownloadIcon,
  LockIcon,
  QrIcon,
  ReceiptIcon,
  ShieldCheckIcon,
  WarningIcon,
  XIcon,
} from '../../components/portal/icons';

/** Taruh foto QRIS di kos-frontend/public/qris.png (atau ganti ekstensi di sini). */
const QRIS_SRC = '/qris.png';

export default function UploadBukti() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { tagihan, loading, reload } = usePortal();

  const [tanggal, setTanggal] = useState(hariIniISO());
  const [file, setFile] = useState<File | null>(null);
  const [kirim, setKirim] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [qrisError, setQrisError] = useState(false);

  if (loading) return <PageSkeleton />;

  const t = tagihan.find((x) => String(x.id) === id);
  const bisaUpload = t && ['belum_dibayar', 'ditolak', 'terlambat'].includes(t.status);

  if (!t || !bisaUpload) {
    return (
      <div className="mx-auto mt-10 max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
          <ReceiptIcon size={26} />
        </div>
        <h2 className="text-lg font-bold text-ink">{t ? 'Tagihan ini tidak perlu dibayar' : 'Tagihan tidak ditemukan'}</h2>
        <p className="mt-1.5 text-sm text-ink-soft">
          {t ? 'Status tagihan sudah lunas atau sedang diverifikasi pengurus.' : 'Periksa kembali tautan yang Anda buka.'}
        </p>
        <Link to="/dashboard/tagihan-saya" className={`${btnPrimary} mt-5`}>
          Kembali ke Tagihan Saya
        </Link>
      </div>
    );
  }

  const { denda } = hitungDenda(t);
  const total = totalTagihan(t);
  const periodeLabel = t.periode;

  const salin = async () => {
    try {
      await navigator.clipboard.writeText(String(Math.round(total)));
      toast.success('Nominal disalin. Tempel saat membayar.');
    } catch {
      toast.error('Gagal menyalin nominal.');
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file || !tanggal) {
      setGalat('Format atau ukuran berkas tidak sesuai / isian wajib kosong. Pastikan berkas berformat JPG atau PNG dengan ukuran maksimal 2 MB.');
      return;
    }
    setGalat(null);
    setKirim(true);

    const fd = new FormData();
    fd.append('tagihan', String(t.id));
    fd.append('berkas', file);
    fd.append('tanggal_bayar', tanggal);

    try {
      await tagihanService.uploadBukti(fd);
      await reload();
      toast.success('Bukti pembayaran terkirim. Pengurus akan memverifikasi maksimal 1x24 jam.');
      navigate(`/dashboard/tagihan-saya/${t.id}`, { replace: true });
    } catch (err) {
      console.error('Gagal mengunggah bukti', err);
      setGalat(
        axios.isAxiosError(err) && !err.response
          ? 'Tidak dapat terhubung ke server. Pastikan koneksi Anda aktif.'
          : 'Format atau ukuran berkas tidak sesuai / isian wajib kosong. Pastikan berkas berformat JPG atau PNG dengan ukuran maksimal 2 MB.'
      );
    } finally {
      setKirim(false);
    }
  };

  return (
    <div>
      <PageHeader
        crumbs={[
          { label: 'Tagihan Saya', to: '/dashboard/tagihan-saya' },
          { label: 'Upload Bukti' },
        ]}
        title="Upload Bukti Pembayaran"
        subtitle="Kirimkan bukti pembayaran QRIS untuk diperiksa pengurus."
      />

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,420px)_1fr]">
        {/* QRIS */}
        <section className="rounded-3xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-ink">
            <QrIcon size={19} className="text-kos-600" /> Bayar dengan QRIS
          </h2>

          <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-md shadow-slate-900/5">
            <div className="bg-gradient-to-r from-red-700 to-red-600 px-5 py-3 text-white">
              <div className="flex items-center justify-between">
                <span className="text-xl font-extrabold tracking-wide">QRIS</span>
                <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-bold">● GPN</span>
              </div>
              <p className="mt-0.5 text-[10px] tracking-wider text-white/85 uppercase">QR Code Standar Pembayaran Nasional</p>
            </div>
            <div className="bg-white px-5 py-4 text-center">
              <p className="text-lg font-extrabold tracking-wide text-ink">KOS RAFASYA</p>
            </div>
            <div className="border-t border-slate-100 bg-white p-5">
              {!qrisError ? (
                <img
                  src={QRIS_SRC}
                  alt="Kode QRIS pembayaran Kos Rafasya"
                  onError={() => setQrisError(true)}
                  className="mx-auto aspect-square w-full max-w-[260px] rounded-xl object-contain"
                />
              ) : (
                <div className="mx-auto flex aspect-square w-full max-w-[260px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-5 text-center">
                  <QrIcon size={36} className="text-slate-300" />
                  <p className="mt-3 text-sm font-semibold text-ink">QRIS belum dipasang</p>
                  <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                    Simpan foto QRIS sebagai <code className="rounded bg-white px-1 py-0.5 text-[11px]">public/qris.png</code>
                  </p>
                </div>
              )}
            </div>
          </div>

          {!qrisError && (
            <a href={QRIS_SRC} download="QRIS-Kos-Rafasya.png" className={`${btnOutline} mt-4 w-full`}>
              <DownloadIcon size={17} /> Unduh QRIS
            </a>
          )}
          <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-ink-soft">
            <ShieldCheckIcon size={14} className="text-kos-600" /> Pembayaran resmi &amp; terenkripsi otomatis
          </p>

          <div className="mt-5 rounded-2xl border border-kos-100 bg-kos-100/25 p-4">
            <p className="text-[11px] font-semibold tracking-wider text-kos-700 uppercase">Total yang harus dibayar</p>
            <div className="mt-1 flex items-center justify-between gap-3">
              <p className="text-3xl font-bold text-kos-950 tabular-nums">{rupiah(total)}</p>
              <button
                type="button"
                onClick={salin}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-kos-700 ring-1 ring-kos-100 transition hover:bg-kos-100/40"
              >
                <CopyIcon size={14} /> Salin
              </button>
            </div>
            <p className="mt-1 text-xs text-ink-soft">
              Sewa kamar {rupiah(t.nominal)}
              {denda > 0 ? ` + denda ${rupiah(denda)}` : ''}
            </p>
          </div>

          <ol className="mt-5 space-y-3">
            {['Scan QRIS melalui m-Banking / e-Wallet', 'Bayar tepat sesuai nominal yang tertera', 'Kembali ke form & unggah bukti pembayaran'].map(
              (s, i) => (
                <li key={s} className="flex items-start gap-3 text-sm text-ink">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-kos-600 text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  <span className="pt-0.5">{s}</span>
                </li>
              )
            )}
          </ol>
        </section>

        {/* Form */}
        <form onSubmit={submit} className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6" noValidate>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <p className="flex items-center gap-2 text-sm text-ink-soft">
              Periode Tagihan:
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-ink capitalize">{periodeLabel}</span>
            </p>
            <StatusPill status={t.status === 'ditolak' ? 'ditolak' : 'belum_dibayar'} />
          </div>

          {galat && (
            <div role="alert" className="mt-5 flex gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              <WarningIcon size={19} className="mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="font-bold">Gagal Mengunggah Bukti Pembayaran</p>
                <p className="mt-0.5 text-[13px] leading-relaxed">{galat}</p>
              </div>
              <button type="button" onClick={() => setGalat(null)} aria-label="Tutup pesan" className="cursor-pointer self-start opacity-70 hover:opacity-100">
                <XIcon size={16} />
              </button>
            </div>
          )}

          <div className="mt-5 space-y-6">
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-sm font-semibold text-ink">Nominal yang harus dibayar</span>
                <span className="text-xs text-ink-soft">Terkunci otomatis</span>
              </div>
              <div className="flex h-12 items-center justify-between rounded-xl border border-slate-200 bg-slate-100/70 px-4">
                <span className="font-bold text-ink tabular-nums">{rupiah(total)}</span>
                <span className="flex items-center gap-1.5 text-xs text-ink-soft">
                  Otomatis <LockIcon size={14} />
                </span>
              </div>
              <p className="mt-1.5 text-xs text-ink-soft">
                {t.penghuni?.kamar?.tipe === 'berdua' ? 'Bagian Anda (kamar berdua dibagi rata) ' : 'Tagihan sewa '}
                {rupiah(t.nominal)}
                {denda > 0 ? ` + denda ${rupiah(denda)}` : ''}
              </p>
            </div>

            <div>
              <label htmlFor="tgl-bayar" className="mb-1.5 block text-sm font-semibold text-ink">
                Tanggal bayar <span className="text-rose-600">*</span>
              </label>
              <input
                id="tgl-bayar"
                type="date"
                required
                max={hariIniISO()}
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="h-12 w-full rounded-xl border border-field-line bg-field px-4 text-sm text-ink outline-none transition focus:border-kos-600 focus:ring-2 focus:ring-kos-600/20"
              />
              <p className="mt-1.5 text-xs text-ink-soft">
                Sesuaikan dengan tanggal transaksi pada bukti pembayaran Anda. Tanggal tidak boleh lebih dari hari ini.
              </p>
            </div>

            <div>
              <p className="mb-1.5 text-sm font-semibold text-ink">
                Unggah Berkas Bukti <span className="text-rose-600">*</span>
              </p>
              <Dropzone file={file} onChange={setFile} />
            </div>
          </div>

          <div className="mt-7 flex justify-end gap-3 border-t border-slate-100 pt-5">
            <Link to={`/dashboard/tagihan-saya/${t.id}`} className={btnOutline}>
              <ArrowLeftIcon size={16} /> Batal
            </Link>
            <button type="submit" disabled={kirim || !file || !tanggal} className={btnPrimary}>
              {kirim ? (
                'Mengirim...'
              ) : (
                <>
                  <CheckIcon size={17} /> Kirim Bukti
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
