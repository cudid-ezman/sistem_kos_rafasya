import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { informasiService } from "../../services/informasiService";
import type { InformasiItem } from "../../types/kos";
import { tglPendek } from "../../lib/format";
import LinkWhatsAppPengurus from "../../components/common/LinkWhatsAppPengurus";
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
        <div className="rounded-2xl border border-field-line bg-field p-10 text-center">
          <p className="font-semibold text-ink">Belum ada informasi tersedia</p>
          <p className="mt-1 text-sm text-ink-soft">
            Pengurus belum menambahkan informasi kos.
          </p>
          <p className="mt-4 text-sm text-ink-soft">
            Sementara itu, tanya langsung ke pengurus lewat{" "}
            <LinkWhatsAppPengurus label="WhatsApp" pesan="Halo Pengurus Kos Putra Raffasya, saya ingin menanyakan informasi kos (Wi-Fi, aturan, jam gerbang)." />.
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
                className="group flex flex-col rounded-2xl border border-field-line bg-field p-6 transition hover:border-kos-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kos-600"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-cream text-gerbang transition group-hover:bg-kos-600 group-hover:text-white">
                  <Ikon size={26} />
                </span>
                <h2 className="mt-5 text-xl font-bold leading-snug text-ink">
                  {info.kategori}
                </h2>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-soft">
                  {info.ringkasan ||
                    "Klik untuk membaca informasi selengkapnya."}
                </p>
                <span className="mt-5 inline-flex w-fit items-center gap-1.5 rounded-md bg-cream px-2.5 py-1 text-[11px] font-semibold text-gerbang">
                  <CalendarIcon size={13} /> Diperbarui{" "}
                  {tglPendek(info.tanggal_pembaruan)}
                </span>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-kos-700">
                  Baca selengkapnya
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
