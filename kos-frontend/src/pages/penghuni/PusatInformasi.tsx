import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { informasiService } from "../../services/informasiService";
import type { InformasiItem } from "../../types/kos";
import { tglPendek } from "../../lib/format";
import PageHeader from "../../components/portal/PageHeader";
import { PageSkeleton } from "../../components/portal/Skeleton";
import {
  ArrowRightIcon,
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

export default function PusatInformasi() {
  const [daftar, setDaftar] = useState<InformasiItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    informasiService
      .getAll()
      .then((res) => setDaftar(res.data))
      .catch((err) => console.error("Gagal memuat pusat informasi", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageSkeleton />;

  return (
    <div>
      <PageHeader
        crumbs={[{ label: "Beranda" }, { label: "Pusat Informasi" }]}
        title="Pusat Informasi"
        subtitle="Pilih salah satu kategori untuk membaca informasi terbaru."
      />

      {daftar.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center">
          <p className="font-semibold text-ink">Belum ada informasi tersedia</p>
          <p className="mt-1 text-sm text-ink-soft">
            Pengurus belum menambahkan informasi kos.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {daftar.map((info) => {
            const Ikon = IKON[info.ikon] ?? BookIcon;
            return (
              <Link
                key={info.id}
                to={`/dashboard/informasi/${info.id}`}
                className="group flex flex-col rounded-3xl border border-slate-200 bg-white p-6 transition hover:-translate-y-0.5 hover:border-kos-500/40 hover:shadow-xl hover:shadow-kos-950/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kos-600"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-kos-100/60 text-kos-700 transition group-hover:bg-kos-600 group-hover:text-white">
                  <Ikon size={26} />
                </span>
                <h2 className="mt-5 text-xl font-bold leading-snug text-ink">
                  {info.kategori}
                </h2>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-soft">
                  {info.ringkasan ||
                    "Klik untuk membaca informasi selengkapnya."}
                </p>
                <span className="mt-5 inline-flex w-fit items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-ink-soft">
                  <CalendarIcon size={13} /> Diperbarui{" "}
                  {tglPendek(info.tanggal_pembaruan)}
                </span>
                <span className="mt-4 flex h-11 items-center justify-center gap-2 rounded-xl border border-kos-600 text-sm font-semibold text-kos-700 transition group-hover:bg-kos-600 group-hover:text-white">
                  Buka{" "}
                  <ArrowRightIcon
                    size={16}
                    className="transition group-hover:translate-x-0.5"
                  />
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
