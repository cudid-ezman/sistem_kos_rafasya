import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { informasiService } from "../../services/informasiService";
import type { InformasiItem } from "../../types/kos";
import { tglPendek } from "../../lib/format";
import PageHeader from "../../components/portal/PageHeader";
import { PageSkeleton } from "../../components/portal/Skeleton";
import { btnPrimary, btnOutline } from "../../components/portal/buttons";
import {
  ArrowLeftIcon,
  BookIcon,
  CalendarIcon,
  ClockIcon,
  InfoCircleIcon,
  WifiIcon,
} from "../../components/portal/icons";

const IKON: Record<string, typeof BookIcon> = {
  "aturan-kos": BookIcon,
  "jadwal-gerbang": ClockIcon,
  wifi: WifiIcon,
  umum: InfoCircleIcon,
};

export default function DetailInformasi() {
  const { slug } = useParams();
  const [info, setInfo] = useState<InformasiItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      return;
    }
    informasiService
      .getById(slug)
      .then((res) => setInfo(res.data))
      .catch(() => setInfo(null))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <PageSkeleton />;

  if (!info) {
    return (
      <div className="mx-auto mt-10 max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <h2 className="text-lg font-bold text-ink">
          Informasi tidak ditemukan
        </h2>
        <Link to="/dashboard/informasi" className={`${btnPrimary} mt-5`}>
          Kembali ke Pusat Informasi
        </Link>
      </div>
    );
  }

  const Ikon = IKON[info.ikon] ?? BookIcon;
  const paragrafList = (info.isi || "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div>
      <PageHeader
        crumbs={[
          { label: "Pusat Informasi", to: "/dashboard/informasi" },
          { label: info.kategori },
        ]}
        title={info.kategori}
        action={
          <Link to="/dashboard/informasi" className={btnOutline}>
            <ArrowLeftIcon size={16} /> Kembali
          </Link>
        }
      />

      <article className="max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-5">
          <h2 className="flex items-center gap-3 text-lg font-bold text-ink">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-kos-100/60 text-kos-700">
              <Ikon size={20} />
            </span>
            {info.kategori}
          </h2>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-ink-soft">
            <CalendarIcon size={13} /> Diperbarui:{" "}
            {tglPendek(info.tanggal_pembaruan)}
          </span>
        </div>

        {paragrafList.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <InfoCircleIcon size={26} />
            </div>
            <p className="font-semibold text-ink">Informasi belum tersedia</p>
            <p className="mt-1 text-sm text-ink-soft">
              Pengurus belum mengisi bagian ini. Silakan hubungi pengurus kos.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-ink-soft">
            {info.ringkasan && (
              <p className="rounded-2xl bg-slate-50 p-4 font-medium text-ink">
                {info.ringkasan}
              </p>
            )}
            {paragrafList.map((paragraf, idx) => (
              <p key={idx} className="whitespace-pre-line">
                {paragraf}
              </p>
            ))}
          </div>
        )}
      </article>
    </div>
  );
}
