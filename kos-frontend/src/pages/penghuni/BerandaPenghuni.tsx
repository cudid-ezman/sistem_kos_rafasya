import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { informasiService } from "../../services/informasiService";
import type { InformasiItem, Tagihan } from "../../types/kos";
import {
  hariSelisih,
  hitungDenda,
  parseTanggal,
  rupiah,
  sudahTerbitH7,
  tglPendek,
  totalTagihan,
} from "../../lib/format";
import { usePortal } from "../../components/portal/portalContext";
import { Atap, panelCls } from "../../components/admin/DashboardParts";
import StatusPill from "../../components/portal/StatusPill";
import { PageSkeleton } from "../../components/portal/Skeleton";
import { btnOutline, btnPrimary } from "../../components/portal/buttons";
import {
  ArrowRightIcon,
  BookIcon,
  CheckCircleIcon,
  ClockIcon,
  InfoCircleIcon,
  ReceiptIcon,
  WarningIcon,
  WifiIcon,
  WrenchIcon,
} from "../../components/portal/icons";

const PERLU_BAYAR = ["belum_dibayar", "ditolak", "terlambat"];

const IKON_INFO: Record<string, typeof BookIcon> = {
  "aturan-kos": BookIcon,
  "jadwal-gerbang": ClockIcon,
  wifi: WifiIcon,
  umum: InfoCircleIcon,
};

function sapaan(jam: number) {
  if (jam < 11) return "Selamat pagi";
  if (jam < 15) return "Selamat siang";
  if (jam < 18) return "Selamat sore";
  return "Selamat malam";
}

function Tile({
  to,
  ikon,
  judul,
  teks,
}: {
  to: string;
  ikon: ReactNode;
  judul: string;
  teks: string;
}) {
  return (
    <Link
      to={to}
      className="group flex flex-col gap-3 rounded-2xl border border-field-line bg-field p-4 transition hover:border-kos-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kos-600"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-cream text-gerbang transition group-hover:bg-kos-600 group-hover:text-white">
        {ikon}
      </span>
      <span>
        <span className="block text-sm font-bold text-ink">{judul}</span>
        <span className="mt-0.5 block text-xs leading-snug text-ink-soft">
          {teks}
        </span>
      </span>
    </Link>
  );
}

export default function BerandaPenghuni() {
  const { user, kamar, tagihan, keluhan, loading } = usePortal();
  const [info, setInfo] = useState<InformasiItem[]>([]);

  useEffect(() => {
    let batal = false;
    informasiService
      .getAll()
      .then((res) => {
        if (!batal) setInfo(res.data);
      })
      .catch((err) => console.error("Gagal memuat informasi", err));
    return () => {
      batal = true;
    };
  }, []);

  const tagihanTerbit = useMemo(() => {
    const terlamaId = [...tagihan].sort((a, b) => a.id - b.id)[0]?.id;
    return tagihan.filter((t) =>
      sudahTerbitH7(t, tagihan.length === 1 && t.id === terlamaId),
    );
  }, [tagihan]);

  const ringkas = useMemo(() => {
    const harusBayar = tagihanTerbit.filter((t) => PERLU_BAYAR.includes(t.status));
    const terdekat: Tagihan | undefined = [...harusBayar].sort(
      (a, b) =>
        parseTanggal(a.jatuh_tempo).getTime() -
        parseTanggal(b.jatuh_tempo).getTime(),
    )[0];
    const diperiksa = tagihanTerbit.filter(
      (t) => t.status === "menunggu_verifikasi",
    );
    const terakhirLunas = [...tagihanTerbit]
      .filter((t) => t.status === "lunas")
      .sort((a, b) => b.id - a.id)[0];
    return { harusBayar, terdekat, diperiksa, terakhirLunas };
  }, [tagihanTerbit]);

  if (loading) return <PageSkeleton />;

  const nama = user.nama_lengkap || user.username;
  const namaDepan = nama.trim().split(" ")[0];
  const { harusBayar, terdekat, diperiksa, terakhirLunas } = ringkas;
  const keluhanAktif = keluhan.filter((k) => k.status !== "selesai");
  const fasilitas = (user.kamar?.fasilitas ?? "")
    .split(",")
    .map((f) => f.trim())
    .filter(Boolean);

  const telat = terdekat ? hitungDenda(terdekat).hari : 0;
  const sisaHari = terdekat
    ? hariSelisih(new Date(), parseTanggal(terdekat.jatuh_tempo))
    : 0;
  const terpakai = telat > 0 ? 100 : Math.min(100, Math.max(6, ((30 - sisaHari) / 30) * 100));
  const totalBayar = harusBayar.reduce((s, t) => s + totalTagihan(t), 0);

  return (
    <div>
      <header className="mb-5">
        <p className="text-sm font-medium text-ink-soft">
          {sapaan(new Date().getHours())}
        </p>
        <h1 className="mt-0.5 text-3xl font-extrabold tracking-tight text-ink lg:text-4xl">
          Halo, {namaDepan}
        </h1>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.15fr]">
        {/* Tagihan */}
        <section
          aria-label="Tagihan"
          className={`${panelCls} lg:col-start-2 lg:row-start-1`}
        >
          <Atap />
          {terdekat ? (
            <div className="p-5 lg:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-ink-soft">
                    {harusBayar.length > 1
                      ? `${harusBayar.length} tagihan perlu dibayar`
                      : "Tagihan yang perlu dibayar"}
                  </p>
                  <p className="mt-1 text-4xl font-extrabold tracking-tight text-ink tabular-nums">
                    {rupiah(totalBayar)}
                  </p>
                </div>
                <StatusPill status={terdekat.status} />
              </div>

              <div className="mt-5">
                <div
                  className="h-2.5 overflow-hidden rounded-full bg-cream"
                  role="img"
                  aria-label={
                    telat > 0
                      ? `Terlambat ${telat} hari`
                      : `Sisa ${sisaHari} hari sampai jatuh tempo`
                  }
                >
                  <div
                    className={`hatch h-full rounded-full ${telat > 0 ? "bg-terracotta" : "bg-kos-500"}`}
                    style={{ width: `${terpakai}%` }}
                  />
                </div>
                <p className="mt-2 flex justify-between text-[13px] text-ink-soft">
                  <span className="capitalize">Periode {terdekat.periode}</span>
                  <span
                    className={`font-semibold ${telat > 0 ? "text-terracotta" : "text-kos-700"}`}
                  >
                    {telat > 0
                      ? `Terlambat ${telat} hari`
                      : sisaHari === 0
                        ? "Jatuh tempo hari ini"
                        : `${sisaHari} hari lagi, ${tglPendek(terdekat.jatuh_tempo)}`}
                  </span>
                </p>
              </div>

              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <Link
                  to={`/dashboard/tagihan-saya/${terdekat.id}/upload`}
                  className={`${btnPrimary} flex-1`}
                >
                  Bayar sekarang
                </Link>
                <Link
                  to={`/dashboard/tagihan-saya/${terdekat.id}`}
                  className={`${btnOutline} flex-1`}
                >
                  Lihat rincian
                </Link>
              </div>
            </div>
          ) : (
            <div className="p-5 lg:p-6">
              <div className="flex items-center gap-3">
                <CheckCircleIcon size={40} className="shrink-0 text-kos-600" />
                <div>
                  <p className="text-xl font-extrabold text-ink">
                    {diperiksa.length > 0
                      ? "Pembayaran sedang diperiksa"
                      : "Semua tagihan beres"}
                  </p>
                  <p className="mt-0.5 text-sm text-ink-soft">
                    {diperiksa.length > 0
                      ? "Pengurus akan mengonfirmasi bukti yang kamu kirim."
                      : terakhirLunas
                        ? `Terakhir lunas untuk periode ${terakhirLunas.periode}.`
                        : "Belum ada tagihan yang perlu dibayar."}
                  </p>
                </div>
              </div>
              <Link
                to="/dashboard/tagihan-saya"
                className={`${btnOutline} mt-5 w-full`}
              >
                Lihat riwayat tagihan
              </Link>
            </div>
          )}
        </section>

        {/* Plat kamar */}
        <section
          aria-label="Kamar"
          className="overflow-hidden rounded-2xl border border-gerbang/20 lg:col-start-1 lg:row-start-1"
        >
          <Atap />
          <div className="bg-gerbang p-3">
            <div className="rounded-lg border border-cream/30 p-4">
              <p className="text-sm text-cream/70">Kamarmu</p>
              <div className="mt-1 flex items-end justify-between gap-3">
                <p className="font-display text-6xl font-extrabold leading-none tracking-tight text-cream">
                  {kamar?.nomor ?? "-"}
                </p>
                <p className="pb-1 text-right text-sm leading-snug text-cream/80">
                  {kamar?.blok && <span className="block">Blok {kamar.blok}</span>}
                  {kamar?.tipe && <span className="block capitalize">{kamar.tipe}</span>}
                </p>
              </div>
              {fasilitas.length > 0 && (
                <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Fasilitas kamar">
                  {fasilitas.map((f) => (
                    <li
                      key={f}
                      className="rounded-md bg-cream px-2 py-1 text-xs font-semibold capitalize text-gerbang"
                    >
                      {f}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>

        {/* Pintasan */}
        <div className="grid grid-cols-3 gap-3 lg:col-start-1 lg:row-start-2">
          <Tile
            to="/dashboard/tagihan-saya"
            ikon={<ReceiptIcon size={20} />}
            judul="Tagihan"
            teks="Riwayat dan bukti bayar"
          />
          <Tile
            to="/dashboard/keluhan-saya/baru"
            ikon={<WrenchIcon size={20} />}
            judul="Lapor"
            teks="Ada yang rusak? Kabari kami"
          />
          <Tile
            to="/dashboard/informasi"
            ikon={<InfoCircleIcon size={20} />}
            judul="Info kos"
            teks="Wifi, aturan, jam gerbang"
          />
        </div>

        {/* Keluhan aktif */}
        {keluhanAktif.length > 0 && (
          <section
            aria-label="Keluhan aktif"
            className={`${panelCls} lg:col-start-2 lg:row-start-2`}
          >
            <div className="flex items-center justify-between border-b border-field-line px-5 py-3.5">
              <h2 className="text-base font-bold text-ink">Keluhan yang berjalan</h2>
              <Link
                to="/dashboard/keluhan-saya"
                className="text-[13px] font-semibold text-kos-700 hover:underline"
              >
                Semua
              </Link>
            </div>
            <ul className="divide-y divide-field-line">
              {keluhanAktif.slice(0, 3).map((k) => (
                <li key={k.id}>
                  <Link
                    to={`/dashboard/keluhan-saya/${k.id}`}
                    className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-cream/40"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cream text-gerbang">
                      <WarningIcon size={18} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">
                        {k.nama_kategori || "Lainnya"}
                      </span>
                      <span className="block truncate text-xs text-ink-soft">
                        {k.deskripsi}
                      </span>
                    </span>
                    <StatusPill status={k.status} />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Informasi */}
        {info.length > 0 && (
          <section
            aria-label="Informasi kos"
            className={`${panelCls} lg:col-span-2`}
          >
            <div className="flex items-center justify-between border-b border-field-line px-5 py-3.5">
              <h2 className="text-base font-bold text-ink">Yang perlu kamu tahu</h2>
              <Link
                to="/dashboard/informasi"
                className="inline-flex items-center gap-1 text-[13px] font-semibold text-kos-700 hover:underline"
              >
                Semua info <ArrowRightIcon size={14} />
              </Link>
            </div>
            <ul className="grid divide-y divide-field-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              {info.slice(0, 3).map((i) => {
                const Ikon = IKON_INFO[i.ikon] ?? BookIcon;
                return (
                  <li key={i.id}>
                    <Link
                      to={`/dashboard/informasi/${i.id}`}
                      className="flex h-full gap-3 px-5 py-4 transition hover:bg-cream/40"
                    >
                      <Ikon size={20} className="mt-0.5 shrink-0 text-kos-700" />
                      <span className="min-w-0">
                        <span className="block text-sm font-bold text-ink">
                          {i.kategori}
                        </span>
                        <span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-ink-soft">
                          {i.ringkasan || "Baca selengkapnya."}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
