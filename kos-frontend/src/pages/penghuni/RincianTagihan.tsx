import type { ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  hitungDenda,
  namaBerkas,
  rentangPeriode,
  rupiah,
  tglAngka,
  tglPendek,
  tglWaktu,
  totalTagihan,
  DENDA_PER_HARI,
} from '../../lib/format';
import { usePortal } from '../../components/portal/portalContext';
import PageHeader from '../../components/portal/PageHeader';
import StatusPill from '../../components/portal/StatusPill';
import { PageSkeleton } from '../../components/portal/Skeleton';
import { btnOutline, btnPrimary } from '../../components/portal/buttons';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  ClockIcon,
  DownloadIcon,
  FileImageIcon,
  PrinterIcon,
  ReceiptIcon,
  UploadCloudIcon,
  WarningIcon,
  XCircleIcon,
} from '../../components/portal/icons';

function Baris({ label, sub, children }: { label: string; sub?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3.5">
      <div className="min-w-0">
        <p className="text-sm text-ink-soft">{label}</p>
        {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
      </div>
      <div className="text-right text-sm font-semibold text-ink">{children}</div>
    </div>
  );
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

export default function RincianTagihan() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, kamar, tagihan, bukti, loading } = usePortal();

  if (loading) return <PageSkeleton />;

  const t = tagihan.find((x) => String(x.id) === id);
  if (!t) {
    return (
      <div className="mx-auto mt-10 max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
          <ReceiptIcon size={26} />
        </div>
        <h2 className="text-lg font-bold text-ink">Tagihan tidak ditemukan</h2>
        <p className="mt-1.5 text-sm text-ink-soft">Tagihan ini mungkin sudah dihapus atau bukan milik Anda.</p>
        <Link to="/dashboard/tagihan-saya" className={`${btnPrimary} mt-5`}>
          Kembali ke Tagihan Saya
        </Link>
      </div>
    );
  }

  const { hari, denda } = hitungDenda(t);
  const total = totalTagihan(t);
  const periode = rentangPeriode(t.periode, t.jatuh_tempo);
  const labelPeriode = t.periode.replace(/\b\w/g, (c) => c.toUpperCase());
  const berdua = t.penghuni?.kamar?.tipe === 'berdua';
  const buktiTagihan = bukti.filter((b) => b.tagihan === t.id);
  const buktiTerbaru = buktiTagihan[0];
  const buktiDiterima = buktiTagihan.find((b) => b.status === 'diterima');
  const bisaUpload = ['belum_dibayar', 'ditolak', 'terlambat'].includes(t.status);
  const noKamar = t.nomor_kamar ?? kamar?.nomor;

  const cetakBukti = () => {
    const w = window.open('', '_blank', 'width=720,height=900');
    if (!w) return;
    const baris = (k: string, v: string) =>
      `<tr><td style="padding:8px 0;color:#55636e">${esc(k)}</td><td style="padding:8px 0;text-align:right;font-weight:600">${esc(v)}</td></tr>`;
    w.document.write(`<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Bukti Pembayaran ${esc(t.periode)}</title>
<style>body{font-family:Inter,Arial,sans-serif;color:#12202b;padding:40px;max-width:560px;margin:auto}h1{font-size:20px;margin:0}
.badge{display:inline-block;background:#e8fbf3;color:#067647;border-radius:99px;padding:4px 12px;font-size:12px;font-weight:700}
table{width:100%;border-collapse:collapse;margin-top:20px}td{border-bottom:1px solid #e5e9ec;font-size:14px}
.total{margin-top:20px;background:#103e3b;color:#fff;border-radius:14px;padding:18px 20px;display:flex;justify-content:space-between;align-items:center}
.total b{font-size:22px}</style></head><body>
<div style="display:flex;align-items:center;gap:12px"><svg width="44" height="39" viewBox="0 0 64 56" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M5 27 16 12l8 8 8-12 8 12 8-8 11 15" stroke="#b5543c" stroke-width="4.5"/><g stroke="#0f3d36" stroke-width="3.5"><path d="M11 27v21h42V27"/><rect x="18" y="32" width="10" height="10" rx="1.5" stroke-width="2.5"/><rect x="36" y="32" width="10" height="10" rx="1.5" stroke-width="2.5"/><path d="M23 32v10M18 37h10M41 32v10M36 37h10" stroke-width="1.8"/></g></svg><div><div style="font-size:9px;letter-spacing:.25em;color:#157f6b;font-weight:600">— KOST PUTRA —</div><h1 style="font-family:Nunito,Inter,Arial,sans-serif;font-weight:800;font-size:26px;line-height:1.1"><span style="color:#b5543c">R</span>affasya</h1></div></div><p style="color:#55636e;margin:14px 0 20px">Bukti Pembayaran Sewa</p><span class="badge">LUNAS</span>
<table>${baris('Nama penghuni', user.nama_lengkap || user.username)}${baris('Kamar', noKamar ? `Kamar ${noKamar}` : '-')}
${baris('Periode', t.periode)}${baris('Nominal tagihan', rupiah(t.nominal))}
${baris('Tanggal bayar', tglAngka(buktiDiterima?.tanggal_bayar))}${baris('Tanggal verifikasi', tglAngka(buktiDiterima?.tanggal_verifikasi))}</table>
<div class="total"><span>Total dibayar</span><b>${esc(rupiah(t.nominal))}</b></div>
<p style="margin-top:28px;font-size:12px;color:#55636e">Dokumen ini dibuat otomatis oleh Sistem Kost Putra Raffasya dan sah tanpa tanda tangan.</p>
<script>window.onload=function(){window.print()}</script></body></html>`);
    w.document.close();
  };

  return (
    <div>
      <PageHeader
        crumbs={[{ label: 'Tagihan Saya', to: '/dashboard/tagihan-saya' }, { label: 'Lihat Rincian' }]}
        title="Rincian Tagihan"
        badge={<StatusPill status={t.status} />}
        subtitle="Informasi detail tagihan sewa kamar dan status verifikasi pembayaran."
        action={
          <button type="button" onClick={() => navigate('/dashboard/tagihan-saya')} className={btnOutline}>
            <ArrowLeftIcon size={16} /> Kembali
          </button>
        }
      />

      <div className="grid items-start gap-5 lg:grid-cols-[1.35fr_1fr]">
        {/* Rincian biaya */}
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h2 className="text-base font-bold text-ink">Rincian Biaya Sewa</h2>
            <span className="rounded-full bg-kos-100/60 px-3 py-1 text-xs font-semibold text-kos-700 capitalize">{t.periode}</span>
          </div>

          <div className="divide-y divide-slate-100 px-6">
            <Baris label="Periode Sewa">{periode ? `${labelPeriode} (${periode.mulai} - ${periode.selesai})` : labelPeriode}</Baris>
            <Baris label="Tipe Kamar" sub={berdua ? 'Tagihan kolektif 1 kamar untuk 2 penghuni' : undefined}>
              {noKamar ? `Kamar ${noKamar}` : '-'}
              {t.penghuni?.kamar?.tipe ? ` (${berdua ? 'Kamar Berdua' : 'Kamar Individu'})` : ''}
            </Baris>
            <Baris
              label="Nominal Tagihan Kamar"
              sub={berdua ? 'Tarif penuh kamar berdua per bulan' : undefined}
            >
              {rupiah(t.nominal)}
            </Baris>
            {denda > 0 && (
              <Baris label="Denda Keterlambatan" sub={`Terlambat ${hari} hari (@ ${rupiah(DENDA_PER_HARI)} / hari)`}>
                <span className="text-orange-600">{rupiah(denda)}</span>
              </Baris>
            )}
            <Baris
              label="Jatuh Tempo Pembayaran"
              sub={hari > 0 && t.status !== 'lunas' ? `Telah melewati batas jatuh tempo (${tglPendek(t.jatuh_tempo)})` : undefined}
            >
              {tglPendek(t.jatuh_tempo)}
            </Baris>
            <Baris label="Status Tagihan Saat Ini">
              <StatusPill status={t.status} />
            </Baris>
            {t.status === 'lunas' && buktiDiterima?.tanggal_verifikasi && (
              <Baris label="Tanggal Verifikasi">{tglAngka(buktiDiterima.tanggal_verifikasi)}</Baris>
            )}
          </div>

          <div className="m-4 flex items-center justify-between gap-4 rounded-2xl bg-gradient-to-br from-kos-950 to-kos-700 px-5 py-4 text-white">
            <div>
              <p className="text-xs font-semibold tracking-wide text-white/70 uppercase">
                {t.status === 'lunas' ? 'Total dibayar' : 'Total harus dibayar'}
              </p>
              <p className="mt-0.5 text-xs text-white/60">
                {t.status === 'lunas'
                  ? 'Tagihan pokok telah dibayar lunas'
                  : denda > 0
                    ? 'Tagihan pokok + denda keterlambatan'
                    : 'Tagihan pokok'}
              </p>
            </div>
            <p className="text-2xl font-bold tabular-nums sm:text-3xl">{rupiah(total)}</p>
          </div>
        </section>

        {/* Panel status */}
        <aside className="space-y-4">
          {t.status === 'ditolak' && (
            <>
              <div className="rounded-3xl border border-rose-200 bg-rose-50/60 p-5">
                <div className="flex items-center gap-2 text-rose-700">
                  <XCircleIcon size={20} />
                  <h3 className="font-bold">Alasan Verifikasi Ditolak</h3>
                </div>
                <blockquote className="mt-3 rounded-2xl bg-white/80 p-4 text-sm leading-relaxed text-ink">
                  “{buktiTagihan.find((b) => b.status === 'ditolak')?.catatan_penolakan ||
                    'Bukti pembayaran tidak sesuai. Silakan bayar ulang dan unggah bukti yang jelas.'}”
                </blockquote>
                {buktiTagihan.find((b) => b.status === 'ditolak')?.tanggal_verifikasi && (
                  <p className="mt-3 text-xs text-rose-700/80">
                    Ditinjau oleh: Pengurus Kos • {tglAngka(buktiTagihan.find((b) => b.status === 'ditolak')?.tanggal_verifikasi)}
                  </p>
                )}
              </div>
              {buktiTerbaru && <BuktiKartu b={buktiTerbaru} judul="Bukti Pembayaran Sebelumnya" />}
            </>
          )}

          {t.status === 'lunas' && (
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-5">
              <div className="flex items-center gap-2 text-emerald-700">
                <CheckCircleIcon size={20} />
                <h3 className="font-bold">Pembayaran Telah Diverifikasi</h3>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-ink">
                Transaksi pembayaran sewa {t.periode} telah diverifikasi dan dinyatakan sah
                {buktiDiterima?.tanggal_verifikasi ? ` pada tanggal ${tglAngka(buktiDiterima.tanggal_verifikasi)}` : ''}.
              </p>
              <p className="mt-2 text-xs text-emerald-800/70">Simpan bukti pembayaran ini untuk arsip pribadi Anda.</p>
              <button type="button" onClick={cetakBukti} className={`${btnPrimary} mt-4 w-full`}>
                <DownloadIcon size={17} /> Download Bukti PDF
              </button>
              <p className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-emerald-800/60">
                <PrinterIcon size={13} /> Pilih “Simpan sebagai PDF” pada jendela cetak
              </p>
            </div>
          )}

          {t.status === 'menunggu_verifikasi' && (
            <>
              <div className="rounded-3xl border border-sky-200 bg-sky-50/60 p-5">
                <div className="flex items-center gap-2 text-sky-700">
                  <ClockIcon size={20} />
                  <h3 className="font-bold">Pembayaran Sedang Diperiksa</h3>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-ink">
                  Bukti pembayaran yang Anda unggah sedang diverifikasi oleh Pengurus Kos Rafasya. Proses verifikasi
                  membutuhkan waktu maksimal 1x24 jam kerja.
                </p>
              </div>
              {buktiTerbaru && <BuktiKartu b={buktiTerbaru} judul="Bukti Pembayaran Terkirim" />}
            </>
          )}

          {(t.status === 'belum_dibayar' || t.status === 'terlambat') && (
            <div className="rounded-3xl border border-amber-200 bg-amber-50/60 p-5">
              <div className="flex items-center gap-2 text-amber-700">
                <WarningIcon size={20} />
                <h3 className="font-bold">Menunggu pembayaran Anda</h3>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-ink">
                Bayar lewat QRIS sesuai nominal {rupiah(total)}, lalu unggah bukti pembayaran agar segera diverifikasi
                pengurus.
              </p>
            </div>
          )}

          {bisaUpload && (
            <div className="rounded-3xl border border-slate-200 bg-white p-5">
              <div className="flex gap-3">
                <Link to={`/dashboard/tagihan-saya/${t.id}/upload`} className={`${btnPrimary} flex-1`}>
                  <UploadCloudIcon size={17} /> Upload Bukti
                </Link>
                <Link to="/dashboard/tagihan-saya" className={btnOutline}>
                  Kembali
                </Link>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-ink-soft">
                Tombol Upload Bukti tampil jika status Belum Dibayar atau Ditolak. Bukti pembayaran baru yang Anda unggah
                akan diverifikasi ulang oleh Pengurus dalam waktu maksimal 1x24 jam.
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function BuktiKartu({ b, judul }: { b: import('../../types/kos').BuktiPembayaran; judul: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-ink">{judul}</h3>
        <StatusPill status={b.status === 'diterima' ? 'lunas' : b.status} />
      </div>
      <div className="mt-3 flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-kos-600 ring-1 ring-slate-200">
          <FileImageIcon size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{namaBerkas(b.berkas)}</p>
          <p className="text-xs text-ink-soft">Diunggah {tglWaktu(b.waktu_unggah)}</p>
        </div>
        <a
          href={b.berkas}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 text-xs font-semibold text-kos-700 hover:underline"
        >
          Lihat
        </a>
      </div>
    </div>
  );
}
