import { Link, useNavigate, useParams } from "react-router-dom";
import { namaBerkas, tglWaktu } from "../../lib/format";
import { usePortal } from "../../components/portal/portalContext";
import PageHeader from "../../components/portal/PageHeader";
import StatusPill from "../../components/portal/StatusPill";
import { PageSkeleton } from "../../components/portal/Skeleton";
import { btnOutline, btnPrimary } from "../../components/portal/buttons";
import {
  ArrowLeftIcon,
  CheckIcon,
  FileImageIcon,
  WarningIcon,
  WrenchIcon,
} from "../../components/portal/icons";

const TAHAP = [
  {
    key: "diterima",
    label: "Diterima",
    desc: "Keluhan sudah masuk ke pengurus.",
  },
  {
    key: "diproses",
    label: "Diproses",
    desc: "Pengurus sedang menangani kendala.",
  },
  { key: "selesai", label: "Selesai", desc: "Kendala sudah ditangani." },
] as const;

const isCatatanPublik = (catatan?: string | null) => {
  if (!catatan) return false;
  if (catatan === "Keluhan dikirim oleh penghuni.") return false;
  if (catatan.startsWith("[Internal Pemilik]")) return false;
  if (/Diteruskan ke Pemilik|Pemilik (menyetujui|mencairkan|menolak)/i.test(catatan)) return false;
  return true;
};

const bersihkanCatatan = (catatan: string) =>
  catatan.replace(/\s*—\s*Diteruskan ke Pemilik.*$/i, "").trim();

export default function DetailKeluhan() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, kamar, keluhan, loading } = usePortal();

  if (loading) return <PageSkeleton />;

  const k = keluhan.find((x) => String(x.id) === id);
  if (!k) {
    return (
      <div className="mx-auto mt-10 max-w-md rounded-2xl border border-field-line bg-field p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
          <WarningIcon size={26} />
        </div>
        <h2 className="text-lg font-bold text-ink">Keluhan tidak ditemukan</h2>
        <Link to="/dashboard/keluhan-saya" className={`${btnPrimary} mt-5`}>
          Kembali ke Keluhan
        </Link>
      </div>
    );
  }

  const idxSaatIni = TAHAP.findIndex((t) => t.key === k.status);
  const noKamar = k.nomor_kamar ?? kamar?.nomor;

  return (
    <div>
      <PageHeader
        crumbs={[
          { label: "Keluhan", to: "/dashboard/keluhan-saya" },
          { label: "Detail Keluhan" },
        ]}
        title="Detail Keluhan"
        badge={<StatusPill status={k.status} />}
        subtitle="Pantau penanganan kendala fasilitas Anda."
        action={
          <button
            type="button"
            onClick={() => navigate("/dashboard/keluhan-saya")}
            className={btnOutline}
          >
            <ArrowLeftIcon size={16} /> Kembali
          </button>
        }
      />

      <div className="grid items-start gap-5 lg:grid-cols-[1.3fr_1fr]">
        <section className="rounded-2xl border border-field-line bg-field p-6">
          <h2 className="mb-5 flex items-center gap-2 text-base font-bold text-ink">
            <WrenchIcon size={19} className="text-kos-600" /> Informasi Keluhan
          </h2>

          <dl className="grid gap-5 sm:grid-cols-2">
            <div>
              <dt className="text-[11px] font-semibold text-ink-soft">
                Kategori
              </dt>
              <dd className="mt-1 font-semibold text-ink">
                {k.nama_kategori || "Lainnya"}
              </dd>
            </div>
            <div className="hidden sm:block" />
            <div>
              <dt className="text-[11px] font-semibold text-ink-soft">
                Pelapor
              </dt>
              <dd className="mt-1 font-semibold text-ink">
                {k.nama_penghuni || user.nama_lengkap || user.username}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold text-ink-soft">
                Kamar
              </dt>
              <dd className="mt-1 font-semibold text-ink">
                {noKamar ? `Kamar ${noKamar}` : "-"}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-[11px] font-semibold text-ink-soft">
                Deskripsi
              </dt>
              <dd className="mt-1 rounded-2xl bg-slate-50 p-4 text-sm leading-relaxed text-ink">
                {k.deskripsi}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-[11px] font-semibold text-ink-soft">
                Foto lampiran
              </dt>
              <dd className="mt-2">
                {k.foto ? (
                  <div className="flex items-center gap-3 rounded-2xl border border-field-line p-3">
                    <a
                      href={k.foto}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0"
                    >
                      <img
                        src={k.foto}
                        alt="Lampiran keluhan"
                        className="h-16 w-16 rounded-lg object-cover ring-1 ring-slate-200"
                      />
                    </a>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">
                        {namaBerkas(k.foto)}
                      </p>
                      <p className="text-xs text-ink-soft">
                        Lampiran bukti kendala fasilitas
                      </p>
                    </div>
                    <a
                      href={k.foto}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 text-xs font-semibold text-kos-700 hover:underline"
                    >
                      Lihat
                    </a>
                  </div>
                ) : (
                  <p className="flex items-center gap-2 text-sm text-ink-soft">
                    <FileImageIcon size={16} /> Tidak ada foto dilampirkan
                  </p>
                )}
              </dd>
            </div>
          </dl>
        </section>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-field-line bg-field p-6">
            <h2 className="mb-5 text-base font-bold text-ink">
              Riwayat Status
            </h2>
            <ol>
              {TAHAP.map((t, i) => {
                const selesai =
                  i < idxSaatIni || (i === idxSaatIni && t.key === "selesai");
                const saatIni = i === idxSaatIni;
                const terakhir = i === TAHAP.length - 1;
                const logTahap = [...(k.riwayat_status ?? [])]
                  .reverse()
                  .find((r) => r.status === t.key);
                const waktuTahap =
                  i === 0
                    ? tglWaktu(k.tanggal_kirim)
                    : logTahap
                      ? tglWaktu(logTahap.waktu)
                      : i <= idxSaatIni && k.tanggal_diperbarui
                        ? tglWaktu(k.tanggal_diperbarui)
                        : null;

                return (
                  <li
                    key={t.key}
                    className="relative flex gap-4 pb-6 last:pb-0"
                  >
                    {!terakhir && (
                      <span
                        className={`absolute left-[15px] top-8 h-[calc(100%-2rem)] w-0.5 ${i < idxSaatIni ? "bg-kos-600" : "bg-slate-200"}`}
                        aria-hidden="true"
                      />
                    )}
                    <span
                      className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        selesai
                          ? "bg-kos-600 text-white"
                          : saatIni
                            ? "bg-field text-kos-700 ring-2 ring-kos-600"
                            : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {selesai ? <CheckIcon size={16} /> : i + 1}
                    </span>
                    <div className="pt-0.5">
                      <p
                        className={`flex items-center gap-2 text-sm font-semibold ${i <= idxSaatIni ? "text-ink" : "text-slate-400"}`}
                      >
                        {t.label}
                        {saatIni && t.key !== "selesai" && (
                          <span className="rounded-full bg-kos-100 px-2 py-0.5 text-[10px] font-bold text-kos-700">
                            Saat Ini
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-soft">
                        {waktuTahap
                          ? `${waktuTahap}${i > 0 ? ` • ${t.desc}` : ""}`
                          : t.desc}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

          <section className="rounded-2xl border border-field-line bg-field p-6">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-ink">
                  Catatan Tindak Lanjut
                </h2>
                {k.tanggal_diperbarui && (
                  <p className="mt-0.5 text-[11px] font-medium text-ink-soft">
                    Diperbarui pada {tglWaktu(k.tanggal_diperbarui)}
                  </p>
                )}
              </div>
              <span className="rounded-full bg-kos-100/60 px-2.5 py-0.5 text-[11px] font-semibold text-kos-700">
                Pengurus
              </span>
            </div>
            {k.catatan_tindak_lanjut ? (
              <p className="rounded-2xl bg-kos-100/25 p-4 text-sm leading-relaxed text-ink">
                {k.catatan_tindak_lanjut}
              </p>
            ) : (
              <p className="text-sm italic text-ink-soft">
                Belum ada catatan dari pengurus.
              </p>
            )}

            {(k.riwayat_status?.filter((r) => isCatatanPublik(r.catatan)).length ?? 0) > 1 && (
              <div className="mt-4 border-t border-field-line pt-3">
                <p className="mb-2 text-[11px] font-bold text-ink-soft">
                  Riwayat Pembaruan Pengurus
                </p>
                <ul className="space-y-2">
                  {[...(k.riwayat_status ?? [])]
                    .filter((r) => isCatatanPublik(r.catatan))
                    .reverse()
                    .map((r) => (
                      <li
                        key={r.id}
                        className="rounded-lg bg-slate-50 px-3 py-2 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2 text-[11px] font-semibold text-ink-soft">
                          <span className="capitalize text-kos-700">
                            {r.status}
                          </span>
                          <span>{tglWaktu(r.waktu)}</span>
                        </div>
                        <p className="mt-1 text-ink">{bersihkanCatatan(r.catatan ?? '')}</p>
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
