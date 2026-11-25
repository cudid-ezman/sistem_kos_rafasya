import { useEffect, useMemo, useState, type FormEvent } from "react";
import axios from "axios";
import { useSearchParams } from "react-router-dom";
import { tagihanService } from "../../services/tagihanService";
import type { Tagihan } from "../../types/kos";
import {
  hitungDenda,
  inisial,
  BULAN,
  periodeSekarang,
  rupiah,
  statusTampil,
  sudahTerbitH7,
  tanggalTerbitH7,
  tglPendek,
} from "../../lib/format";
import PageHeader from "../../components/portal/PageHeader";
import StatusPill from "../../components/portal/StatusPill";
import { Skeleton } from "../../components/portal/Skeleton";
import { useToast } from "../../components/portal/toastContext";
import { btnOutline, btnPrimary } from "../../components/portal/buttons";
import { PlusIcon, ReceiptIcon } from "../../components/portal/icons";
import Modal from "../../components/admin/Modal";
import Pagination from "../../components/admin/Pagination";
import SearchInput from "../../components/admin/SearchInput";
import FilterTabs from "../../components/admin/FilterTabs";
import EmptyState from "../../components/admin/EmptyState";
import {
  inputCls,
  labelCls,
  tdCls,
  thCls,
} from "../../components/admin/styles";

type Filter =
  | "semua"
  | "belum_dibayar"
  | "terlambat"
  | "menunggu_verifikasi"
  | "dispensasi"
  | "lunas"
  | "ditolak";
const PER_HALAMAN = 10;

export default function DataTagihan() {
  const toast = useToast();
  const [params] = useSearchParams();
  const [list, setList] = useState<Tagihan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("semua");
  const [cari, setCari] = useState(params.get("cari") ?? "");
  const [halaman, setHalaman] = useState(1);

  const [genOpen, setGenOpen] = useState(false);
  const [periode, setPeriode] = useState(periodeSekarang());
  const [isGenerating, setIsGenerating] = useState(false);
  const [memprosesDispensasiId, setMemprosesDispensasiId] = useState<number | null>(null);

  const fetchTagihan = async () => {
    try {
      const res = await tagihanService.getAll();
      setList(res.data);
    } catch (error) {
      console.error("Gagal mengambil data tagihan", error);
      toast.error("Data tagihan belum bisa dimuat.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchTagihan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hitung = useMemo(() => {
    const m: Record<Filter, number> = {
      semua: list.length,
      belum_dibayar: 0,
      terlambat: 0,
      menunggu_verifikasi: 0,
      dispensasi: 0,
      lunas: 0,
      ditolak: 0,
    };
    list.forEach((t) => {
      m[statusTampil(t)] += 1;
      if (t.status_perpanjangan && t.status_perpanjangan !== "tidak_ada") {
        m.dispensasi += 1;
      }
    });
    return m;
  }, [list]);

  const prosesDispensasi = async (t: Tagihan, aksi: "setujui" | "tolak") => {
    setMemprosesDispensasiId(t.id);
    try {
      await tagihanService.responPerpanjangan(t.id, aksi);
      toast.success(
        aksi === "setujui"
          ? `Perpanjangan jatuh tempo Kamar ${t.nomor_kamar || ""} disetujui.`
          : `Pengajuan perpanjangan Kamar ${t.nomor_kamar || ""} ditolak.`,
      );
      await fetchTagihan();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Gagal memproses pengajuan perpanjangan.";
      toast.error(msg);
    } finally {
      setMemprosesDispensasiId(null);
    }
  };

  const totalLunas = useMemo(
    () =>
      list
        .filter((t) => t.status === "lunas")
        .reduce((s, t) => s + (Number(t.nominal || 0) + Number(t.denda || 0)), 0),
    [list],
  );

  const tersaring = useMemo(() => {
    const q = cari.trim().toLowerCase().replace(/\s+/g, " ");
    return list.filter((t) => {
      if (filter === "dispensasi") {
        if (!t.status_perpanjangan || t.status_perpanjangan === "tidak_ada") return false;
      } else if (filter !== "semua" && statusTampil(t) !== filter) {
        return false;
      }
      if (!q) return true;
      const kamar = (t.nomor_kamar || "").toLowerCase();
      if (/^\d+$/.test(q)) {
        return kamar === q || kamar.endsWith(q.padStart(2, "0"));
      }
      return (
        (t.nama_penghuni || "").toLowerCase().includes(q) ||
        kamar.includes(q) ||
        `kamar ${kamar}`.includes(q) ||
        t.periode.toLowerCase().includes(q)
      );
    });
  }, [list, filter, cari]);
  const baris = tersaring.slice(
    (halaman - 1) * PER_HALAMAN,
    halaman * PER_HALAMAN,
  );

  const generate = async (e: FormEvent) => {
    e.preventDefault();
    if (!periode.trim()) return;
    setIsGenerating(true);
    try {
      const res = await tagihanService.generateBulanan(periode.trim());
      toast.success(res.data?.detail || "Tagihan bulanan berhasil dibuat.");
      setGenOpen(false);
      await fetchTagihan();
    } catch (error) {
      console.error("Gagal generate tagihan", error);
      const pesan = axios.isAxiosError(error)
        ? error.response?.data?.detail
        : null;
      toast.error(pesan || "Generate tagihan gagal. Coba lagi.");
    } finally {
      setIsGenerating(false);
    }
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
        crumbs={[
          { label: "Beranda", to: "/dashboard" },
          { label: "Data Tagihan" },
        ]}
        title="Manajemen Tagihan Sewa"
        subtitle="Pantau seluruh tagihan kamar dan terbitkan tagihan bulanan secara otomatis."
        action={
          <button
            type="button"
            onClick={() => setGenOpen(true)}
            className={btnPrimary}
          >
            <PlusIcon size={17} /> Generate Tagihan Bulanan
          </button>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Total Lunas", rupiah(totalLunas), "text-emerald-600"],
          ["Belum Dibayar", hitung.belum_dibayar, "text-amber-600"],
          ["Terlambat", hitung.terlambat, "text-rose-600"],
          ["Menunggu Verifikasi", hitung.menunggu_verifikasi, "text-sky-600"],
        ].map(([label, nilai, warna]) => (
          <div
            key={label as string}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-4"
          >
            <p className="text-xs text-ink-soft">{label}</p>
            <p className={`mt-0.5 text-2xl font-bold tabular-nums ${warna}`}>
              {nilai}
            </p>
          </div>
        ))}
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <FilterTabs
            value={filter}
            onChange={(k) => {
              setFilter(k);
              setHalaman(1);
            }}
            tabs={[
              { key: "semua", label: "Semua", count: hitung.semua },
              {
                key: "belum_dibayar",
                label: "Belum Bayar",
                count: hitung.belum_dibayar,
              },
              { key: "terlambat", label: "Terlambat", count: hitung.terlambat },
              {
                key: "menunggu_verifikasi",
                label: "Menunggu",
                count: hitung.menunggu_verifikasi,
              },
              {
                key: "dispensasi",
                label: "Dispensasi",
                count: hitung.dispensasi,
              },
              { key: "lunas", label: "Lunas", count: hitung.lunas },
              { key: "ditolak", label: "Ditolak", count: hitung.ditolak },
            ]}
          />
          <SearchInput
            value={cari}
            onChange={(v) => {
              setCari(v);
              setHalaman(1);
            }}
            placeholder="Cari penghuni, kamar, periode..."
          />
        </div>

        {tersaring.length === 0 ? (
          <EmptyState
            icon={<ReceiptIcon size={26} />}
            title={
              list.length === 0
                ? "Belum ada tagihan"
                : "Tidak ada tagihan pada filter ini"
            }
            text={
              list.length === 0
                ? "Gunakan tombol Generate Tagihan Bulanan untuk menerbitkan tagihan seluruh kamar aktif."
                : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50/70">
                <tr>
                  <th className={thCls}>Penghuni</th>
                  <th className={thCls}>Kamar</th>
                  <th className={thCls}>Periode</th>
                  <th className={thCls}>Nominal</th>
                  <th className={thCls}>Jatuh Tempo</th>
                  <th className={thCls}>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {baris.map((t) => {
                  const { denda } = hitungDenda(t);
                  const nama =
                    t.nama_penghuni || t.penghuni?.nama_lengkap || "-";
                  return (
                    <tr key={t.id} className="transition hover:bg-slate-50/70">
                      <td className={tdCls}>
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-kos-100/70 text-xs font-bold text-kos-700">
                            {inisial(nama)}
                          </span>
                          <span className="font-semibold">{nama}</span>
                        </div>
                      </td>
                      <td className={`${tdCls} font-semibold`}>
                        {t.nomor_kamar || t.penghuni?.kamar?.nomor_kamar || "-"}
                      </td>
                      <td className={`${tdCls} capitalize`}>{t.periode}</td>
                      <td className={`${tdCls} tabular-nums`}>
                        <p className="font-semibold">{rupiah(t.nominal)}</p>
                        {denda > 0 && (
                          <p className="text-[11px] font-medium text-orange-600">
                            + denda {rupiah(denda)}
                          </p>
                        )}
                      </td>
                      <td className={`${tdCls} text-ink-soft`}>
                        <div className="whitespace-nowrap">
                          {tglPendek(t.jatuh_tempo)}
                        </div>
                        {t.status_perpanjangan === "menunggu" &&
                          t.tanggal_perpanjangan && (
                            <div className="mt-1.5 max-w-[230px] rounded-lg border border-sky-200 bg-sky-50 p-2 text-[11px] text-sky-900">
                              <p className="font-semibold">
                                Minta undur s/d{" "}
                                {tglPendek(t.tanggal_perpanjangan)}
                              </p>
                              {t.alasan_perpanjangan && (
                                <p className="mt-0.5 line-clamp-2 text-sky-800/80">
                                  “{t.alasan_perpanjangan}”
                                </p>
                              )}
                              <div className="mt-2 flex gap-1.5">
                                <button
                                  type="button"
                                  disabled={memprosesDispensasiId === t.id}
                                  onClick={() => prosesDispensasi(t, "setujui")}
                                  className="cursor-pointer rounded-lg bg-emerald-600 px-2.5 py-1 font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                                >
                                  Setujui
                                </button>
                                <button
                                  type="button"
                                  disabled={memprosesDispensasiId === t.id}
                                  onClick={() => prosesDispensasi(t, "tolak")}
                                  className="cursor-pointer rounded-lg border border-rose-200 bg-white px-2.5 py-1 font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
                                >
                                  Tolak
                                </button>
                              </div>
                            </div>
                          )}
                        {t.status_perpanjangan === "disetujui" &&
                          t.tanggal_perpanjangan && (
                            <span
                              title={t.alasan_perpanjangan || ""}
                              className="mt-1 inline-block rounded-md bg-emerald-100/80 px-2 py-0.5 text-[11px] font-semibold text-emerald-800"
                            >
                              Diperpanjang s/d{" "}
                              {tglPendek(t.tanggal_perpanjangan)}
                            </span>
                          )}
                        {t.status_perpanjangan === "ditolak" && (
                          <span className="mt-1 inline-block rounded-md bg-rose-100/80 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                            Dispensasi ditolak
                          </span>
                        )}
                      </td>
                      <td className={tdCls}>
                        <div className="flex flex-col items-start gap-1">
                          <StatusPill status={statusTampil(t)} />
                          {t.status === "belum_dibayar" && !sudahTerbitH7(t) && (
                            <span
                              title={`Otomatis muncul di portal penghuni mulai ${tglPendek(tanggalTerbitH7(t.jatuh_tempo))}`}
                              className="rounded-md bg-slate-100 px-2 py-0.5 text-[10.5px] font-medium text-ink-soft"
                            >
                              Terjadwal (tampil {tglPendek(tanggalTerbitH7(t.jatuh_tempo))})
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <Pagination
          total={tersaring.length}
          page={halaman}
          perPage={PER_HALAMAN}
          onChange={setHalaman}
        />
      </section>

      <Modal
        open={genOpen}
        onClose={() => setGenOpen(false)}
        title="Generate Tagihan Bulanan"
        description="Tagihan diterbitkan 1 tagihan per kamar terisi sesuai tarif aktif kamar."
      >
        <form onSubmit={generate} className="space-y-4">
          <div>
            <span className={labelCls}>Periode Tagihan</span>
            <div className="grid grid-cols-[1.4fr_1fr] gap-2.5">
              <select
                aria-label="Bulan tagihan"
                value={periode.split(' ')[0] || BULAN[new Date().getMonth()]}
                onChange={(e) => {
                  const thn = periode.split(' ')[1] || String(new Date().getFullYear());
                  setPeriode(`${e.target.value} ${thn}`);
                }}
                className={inputCls}
              >
                {BULAN.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
              <select
                aria-label="Tahun tagihan"
                value={periode.split(' ')[1] || String(new Date().getFullYear())}
                onChange={(e) => {
                  const bln = periode.split(' ')[0] || BULAN[new Date().getMonth()];
                  setPeriode(`${bln} ${e.target.value}`);
                }}
                className={inputCls}
              >
                {[new Date().getFullYear(), new Date().getFullYear() + 1].map((y) => (
                  <option key={y} value={String(y)}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <p className="mt-1.5 text-xs text-ink-soft">
              "Jatuh tempo otomatis mengikuti tanggal masuk penghuni utama
              kamar. Nominal tagihan dihitung per kamar (tidak dibagi dua)."
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setGenOpen(false)}
              className={btnOutline}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isGenerating || !periode.trim()}
              className={btnPrimary}
            >
              {isGenerating ? "Memproses..." : "Terbitkan Tagihan"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
