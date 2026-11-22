import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import {
  kamarService,
  type CreateKamarPayload,
} from "../../services/kamarService";
import type { Kamar } from "../../types/kos";
import { pecahKamar, rupiah } from "../../lib/format";
import DenahKamar from "./DenahKamar";
import PageHeader from "../../components/portal/PageHeader";
import StatusPill from "../../components/portal/StatusPill";
import { Skeleton } from "../../components/portal/Skeleton";
import { useToast } from "../../components/portal/toastContext";
import {
  btnGhost,
  btnOutline,
  btnPrimary,
} from "../../components/portal/buttons";
import {
  DoorIcon,
  GridIcon,
  ListIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from "../../components/portal/icons";
import Modal from "../../components/admin/Modal";
import ConfirmDialog from "../../components/admin/ConfirmDialog";
import Pagination from "../../components/admin/Pagination";
import SearchInput from "../../components/admin/SearchInput";
import EmptyState from "../../components/admin/EmptyState";
import {
  inputCls,
  labelCls,
  tdCls,
  thCls,
} from "../../components/admin/styles";

const KOSONG: CreateKamarPayload = {
  nomor_kamar: "",
  tipe: "individu",
  harga_individu: 550000,
  harga_berdua: 800000,
  biaya_fasilitas: 0,
  fasilitas: "",
  status: "tersedia",
};
const PER_HALAMAN = 10;
const DAFTAR_BLOK = [
  { kode: "A", label: "Blok A (Slot 01–13)", maks: 13 },
  { kode: "B", label: "Blok B (Slot 01–14)", maks: 14 },
  { kode: "C", label: "Blok C (Slot 01–14)", maks: 14 },
  { kode: "D", label: "Blok D (Slot 01–04)", maks: 4 },
  { kode: "LAINNYA", label: "Blok Lainnya / Kustom", maks: 99 },
];

function formatKodeKamar(blok: string, nomor: string): string {
  const bersih = nomor.trim();
  if (blok === "LAINNYA") return bersih.toUpperCase();
  const angka = parseInt(bersih.replace(/\D/g, ""), 10);
  if (Number.isNaN(angka) || angka <= 0) return "";
  return `${blok}${String(angka).padStart(2, "0")}`;
}

export default function DataKamar() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "denah" ? "denah" : "daftar";

  const [kamarList, setKamarList] = useState<Kamar[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cari, setCari] = useState("");
  const [filterBlok, setFilterBlok] = useState<string>("SEMUA");
  const [halaman, setHalaman] = useState(1);
  const [denahKey, setDenahKey] = useState(0);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingJumlahPenghuni, setEditingJumlahPenghuni] = useState<number>(0);
  const [blokForm, setBlokForm] = useState<string>("A");
  const [nomorForm, setNomorForm] = useState<string>("1");
  const [form, setForm] = useState<CreateKamarPayload>(KOSONG);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hapus, setHapus] = useState<Kamar | null>(null);
  const [menghapus, setMenghapus] = useState(false);

  const fetchKamar = async () => {
    try {
      const res = await kamarService.getAllKamar();
      setKamarList(res.data);
    } catch (error) {
      console.error("Gagal mengambil data kamar", error);
      toast.error("Data kamar belum bisa dimuat.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchKamar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ringkas = useMemo(
    () => ({
      total: kamarList.length,
      terisi: kamarList.filter((k) => k.status === "terisi").length,
      tersedia: kamarList.filter((k) => k.status === "tersedia").length,
    }),
    [kamarList],
  );

  const tersaring = useMemo(() => {
    const q = cari.trim().toLowerCase().replace(/\s+/g, " ");
    return kamarList.filter((k) => {
      const { blok } = pecahKamar(k.nomor_kamar);
      if (filterBlok === "TANPA_BLOK" && blok !== null) return false;
      if (filterBlok !== "SEMUA" && filterBlok !== "TANPA_BLOK" && blok !== filterBlok) return false;
      if (!q) return true;
      const nomor = k.nomor_kamar.toLowerCase();
      if (/^\d+$/.test(q)) {
        return nomor === q || nomor.endsWith(q.padStart(2, "0"));
      }
      return (
        nomor.includes(q) ||
        `kamar ${nomor}`.includes(q) ||
        (k.fasilitas || "").toLowerCase().includes(q) ||
        (k.status || "").toLowerCase().includes(q) ||
        (k.tipe || "").toLowerCase().includes(q)
      );
    });
  }, [kamarList, cari, filterBlok]);
  const baris = tersaring.slice(
    (halaman - 1) * PER_HALAMAN,
    halaman * PER_HALAMAN,
  );

  const bukaTambah = (blokAwal = "A", nomorAwal = "") => {
    setEditingId(null);
    setEditingJumlahPenghuni(0);
    setBlokForm(blokAwal);
    setNomorForm(nomorAwal);
    const kodeAwal = nomorAwal ? formatKodeKamar(blokAwal, nomorAwal) : "";
    setForm({ ...KOSONG, nomor_kamar: kodeAwal });
    setFormOpen(true);
  };

  const bukaEdit = (k: Kamar) => {
    setEditingId(k.id);
    setEditingJumlahPenghuni(
      k.jumlah_penghuni ?? (k.status === "terisi" ? 1 : 0),
    );
    const hasil = pecahKamar(k.nomor_kamar);
    if (hasil.blok && ["A", "B", "C", "D"].includes(hasil.blok)) {
      setBlokForm(hasil.blok);
      setNomorForm(String(hasil.nomor));
    } else if (hasil.blok) {
      setBlokForm("LAINNYA");
      setNomorForm(k.nomor_kamar);
    } else {
      const angkaSaja = k.nomor_kamar.replace(/\D/g, "");
      setBlokForm("A");
      setNomorForm(angkaSaja || k.nomor_kamar);
    }
    setForm({
      nomor_kamar: k.nomor_kamar,
      tipe: k.tipe,
      harga_individu: k.harga_individu ?? 550000,
      harga_berdua: k.harga_berdua ?? 800000,
      biaya_fasilitas: k.biaya_fasilitas ?? 0,
      fasilitas: k.fasilitas,
      status: k.status,
    });
    setFormOpen(true);
  };

  const simpan = async (e: FormEvent) => {
    e.preventDefault();
    const kodeFinal = formatKodeKamar(blokForm, nomorForm) || form.nomor_kamar.trim();
    if (!kodeFinal) {
      toast.error("Nomor kamar wajib diisi.");
      return;
    }
    const payload: CreateKamarPayload = { ...form, nomor_kamar: kodeFinal };
    setIsSubmitting(true);
    try {
      if (editingId) {
        await kamarService.updateKamar(editingId, payload);
        toast.success(`Data kamar ${kodeFinal} berhasil diperbarui.`);
      } else {
        await kamarService.createKamar(payload);
        toast.success(`Kamar ${kodeFinal} berhasil ditambahkan.`);
      }
      setFormOpen(false);
      await fetchKamar();
      setDenahKey((n) => n + 1);
    } catch (error) {
      console.error("Gagal menyimpan data kamar", error);
      toast.error(
        "Gagal menyimpan kamar. Pastikan nomor kamar tidak duplikat.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const konfirmasiHapus = async () => {
    if (!hapus) return;
    setMenghapus(true);
    try {
      await kamarService.deleteKamar(hapus.id);
      toast.success(`Kamar ${hapus.nomor_kamar} dihapus.`);
      setHapus(null);
      await fetchKamar();
    } catch (error) {
      console.error("Gagal menghapus kamar", error);
      toast.error(
        "Gagal menghapus kamar. Kamar yang masih dihuni tidak bisa dihapus.",
      );
    } finally {
      setMenghapus(false);
    }
  };

  const pilihTab = (t: "daftar" | "denah") =>
    setParams(t === "denah" ? { tab: "denah" } : {}, { replace: true });

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
          { label: "Data Kamar" },
        ]}
        title="Manajemen Data Kamar"
        subtitle="Kelola tarif individu/berdua, tambahan biaya fasilitas, dan ketersediaan kamar."
        action={
          <button type="button" onClick={() => bukaTambah()} className={btnPrimary}>
            <PlusIcon size={17} /> Tambah Kamar
          </button>
        }
      />

      <div
        className="mb-5 inline-flex rounded-xl bg-slate-100 p-1 text-[13px] font-semibold"
        role="tablist"
      >
        {(
          [
            ["daftar", "Daftar Kamar", ListIcon],
            ["denah", "Denah Operasional", GridIcon],
          ] as const
        ).map(([key, label, Ikon]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => pilihTab(key)}
            className={`inline-flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 transition ${
              tab === key
                ? "bg-white text-kos-700 shadow-sm"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            <Ikon size={16} /> {label}
          </button>
        ))}
      </div>

      {tab === "denah" ? (
        <DenahKamar
          key={denahKey}
          onTambahSlot={(blok, nomor) => bukaTambah(blok, String(nomor))}
          onEditKamar={(k) => bukaEdit(k)}
        />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-3 gap-3">
            {[
              ["Total Kamar", ringkas.total, "text-ink"],
              ["Terisi", ringkas.terisi, "text-sky-600"],
              ["Tersedia", ringkas.tersedia, "text-emerald-600"],
            ].map(([label, nilai, warna]) => (
              <div
                key={label as string}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5"
              >
                <p className="text-xs text-ink-soft">{label}</p>
                <p
                  className={`mt-0.5 text-2xl font-bold tabular-nums ${warna}`}
                >
                  {nilai}
                </p>
              </div>
            ))}
          </div>

          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
            <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="mr-1 text-base font-bold text-ink">Daftar Kamar</h2>
                <div className="flex flex-wrap items-center gap-1 rounded-xl bg-slate-100 p-1 text-xs font-semibold">
                  {[
                    { id: "SEMUA", label: "Semua Blok" },
                    { id: "A", label: "Blok A" },
                    { id: "B", label: "Blok B" },
                    { id: "C", label: "Blok C" },
                    { id: "D", label: "Blok D" },
                    ...(kamarList.some((k) => !pecahKamar(k.nomor_kamar).blok)
                      ? [{ id: "TANPA_BLOK", label: "Belum Berblok" }]
                      : []),
                  ].map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => {
                        setFilterBlok(b.id);
                        setHalaman(1);
                      }}
                      className={`cursor-pointer rounded-lg px-2.5 py-1 transition ${
                        filterBlok === b.id
                          ? "bg-white text-kos-700 shadow-xs"
                          : "text-ink-soft hover:text-ink"
                      }`}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>
              <SearchInput
                value={cari}
                onChange={(v) => {
                  setCari(v);
                  setHalaman(1);
                }}
                placeholder="Cari kamar, fasilitas, atau status..."
              />
            </div>

            {tersaring.length === 0 ? (
              <EmptyState
                icon={<DoorIcon size={26} />}
                title={
                  kamarList.length === 0
                    ? "Belum ada data kamar"
                    : "Kamar tidak ditemukan"
                }
                text={
                  kamarList.length === 0
                    ? "Tambahkan kamar pertama untuk mulai mengelola kos."
                    : "Coba kata kunci lain."
                }
                action={
                  kamarList.length === 0 && (
                    <button
                      type="button"
                      onClick={() => bukaTambah()}
                      className={btnPrimary}
                    >
                      <PlusIcon size={17} /> Tambah Kamar
                    </button>
                  )
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50/70">
                    <tr>
                      <th className={thCls}>No. Kamar</th>
                      <th className={thCls}>Tipe Aktif</th>
                      <th className={thCls}>Tarif Dasar (1 / 2 Org)</th>
                      <th className={thCls}>Harga Aktif / Bulan</th>
                      <th className={thCls}>Fasilitas</th>
                      <th className={thCls}>Status</th>
                      <th className={`${thCls} text-right`}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {baris.map((k) => {
                      const jml =
                        k.jumlah_penghuni ?? (k.status === "terisi" ? 1 : 0);
                      return (
                        <tr
                          key={k.id}
                          className="transition hover:bg-slate-50/70"
                        >
                          <td className={`${tdCls} font-bold`}>
                            <div className="flex items-center gap-2">
                              <span>{k.nomor_kamar}</span>
                              {(() => {
                                const info = pecahKamar(k.nomor_kamar);
                                return info.blok ? (
                                  <span className="rounded-md bg-kos-100/70 px-2 py-0.5 text-[11px] font-semibold text-kos-700">
                                    Blok {info.blok}
                                  </span>
                                ) : (
                                  <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                                    Belum berblok
                                  </span>
                                );
                              })()}
                            </div>
                          </td>
                          <td className={tdCls}>
                            <span className="capitalize">{k.tipe}</span>
                            <span className="ml-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-ink-soft">
                              {jml}/2 org
                            </span>
                          </td>
                          <td
                            className={`${tdCls} text-xs text-ink-soft tabular-nums`}
                          >
                            <div>
                              1 org:{" "}
                              <span className="font-semibold text-ink">
                                {rupiah(k.harga_individu ?? 550000)}
                              </span>
                            </div>
                            <div>
                              2 org:{" "}
                              <span className="font-semibold text-ink">
                                {rupiah(k.harga_berdua ?? 800000)}
                              </span>
                            </div>
                          </td>
                          <td className={`${tdCls} tabular-nums`}>
                            <div className="font-bold text-ink">
                              {rupiah(k.harga_sewa)}
                            </div>
                            {(k.biaya_fasilitas ?? 0) > 0 && (
                              <span className="text-[11px] font-medium text-kos-700">
                                + {rupiah(k.biaya_fasilitas)} fasilitas
                              </span>
                            )}
                          </td>
                          <td
                            className={`${tdCls} max-w-xs truncate text-ink-soft`}
                            title={k.fasilitas}
                          >
                            {k.fasilitas || "-"}
                          </td>
                          <td className={tdCls}>
                            <StatusPill status={k.status} />
                          </td>
                          <td className={`${tdCls} text-right`}>
                            <div className="inline-flex gap-1">
                              <button
                                type="button"
                                onClick={() => bukaEdit(k)}
                                aria-label={`Edit kamar ${k.nomor_kamar}`}
                                className={`${btnGhost} h-9 w-9 !px-0`}
                              >
                                <PencilIcon size={17} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setHapus(k)}
                                aria-label={`Hapus kamar ${k.nomor_kamar}`}
                                className={`${btnGhost} h-9 w-9 !px-0 hover:!bg-rose-50 hover:!text-rose-600`}
                              >
                                <TrashIcon size={17} />
                              </button>
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
        </>
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={
          editingId ? `Edit Kamar ${form.nomor_kamar}` : "Tambah Kamar Baru"
        }
        description="Tipe kamar (Individu/Berdua) & status otomatis menyesuaikan jumlah penghuni aktif (maks. 2 orang)."
      >
        <form onSubmit={simpan} className="space-y-4">
          <div>
            <label className={labelCls}>Blok &amp; Nomor Kamar</label>
            <div className="grid grid-cols-[1.25fr_1fr] gap-2.5">
              <select
                aria-label="Pilih Blok Kamar"
                value={blokForm}
                onChange={(e) => {
                  const b = e.target.value;
                  setBlokForm(b);
                  const kode = formatKodeKamar(b, nomorForm);
                  setForm({ ...form, nomor_kamar: kode });
                }}
                className={inputCls}
              >
                {DAFTAR_BLOK.map((b) => (
                  <option key={b.kode} value={b.kode}>
                    {b.label}
                  </option>
                ))}
              </select>
              <input
                id="nomor"
                required
                type={blokForm === "LAINNYA" ? "text" : "number"}
                min={blokForm === "LAINNYA" ? undefined : 1}
                max={
                  blokForm === "LAINNYA"
                    ? undefined
                    : (DAFTAR_BLOK.find((b) => b.kode === blokForm)?.maks ?? 99)
                }
                placeholder={blokForm === "LAINNYA" ? "Contoh: VIP-1" : "No. 1–14"}
                value={nomorForm}
                onChange={(e) => {
                  const val = e.target.value;
                  setNomorForm(val);
                  const kode = formatKodeKamar(blokForm, val);
                  setForm({ ...form, nomor_kamar: kode || val });
                }}
                className={inputCls}
              />
            </div>
            <div className="mt-2 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs">
              <span className="text-ink-soft">Kode &amp; posisi di denah:</span>
              <span className="font-bold text-kos-700">
                {formatKodeKamar(blokForm, nomorForm)
                  ? `${formatKodeKamar(blokForm, nomorForm)} · ${
                      blokForm === "LAINNYA" ? "Blok Tambahan" : `Blok ${blokForm}`
                    }`
                  : "Isi nomor kamar"}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="harga-individu" className={labelCls}>
                Tarif Dasar Sendiri (Rp)
              </label>
              <input
                id="harga-individu"
                type="number"
                required
                min={0}
                value={form.harga_individu}
                onChange={(e) =>
                  setForm({ ...form, harga_individu: Number(e.target.value) })
                }
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="harga-berdua" className={labelCls}>
                Tarif Dasar Berdua (Rp)
              </label>
              <input
                id="harga-berdua"
                type="number"
                required
                min={0}
                value={form.harga_berdua}
                onChange={(e) =>
                  setForm({ ...form, harga_berdua: Number(e.target.value) })
                }
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label htmlFor="paket-fasilitas" className={labelCls}>
              Paket Fasilitas Kamar
            </label>
            <select
              id="paket-fasilitas"
              value={(form.biaya_fasilitas ?? 0) > 0 ? "fasilitas" : "standar"}
              onChange={(e) => {
                const pakaiFasilitas = e.target.value === "fasilitas";
                const tambahan = !pakaiFasilitas
                  ? 0
                  : editingJumlahPenghuni >= 2
                    ? 310000
                    : 200000;
                setForm({ ...form, biaya_fasilitas: tambahan });
              }}
              className={inputCls}
            >
              <option value="standar">
                Tanpa Fasilitas Tambahan (Sendiri Rp550.000 · Berdua Rp800.000)
              </option>
              <option value="fasilitas">
                Pakai Fasilitas Tambahan (Sendiri Rp750.000 · Berdua
                Rp1.110.000)
              </option>
            </select>
            <p className="mt-1.5 text-xs text-ink-soft">
              Tarif fasilitas otomatis menyesuaikan kapasitas kamar (+Rp200.000
              sendiri, +Rp310.000 berdua). Saat kamar kosong (0 penghuni), biaya
              fasilitas otomatis kembali ke 0.
            </p>
          </div>

          <div className="rounded-2xl border border-kos-200 bg-kos-50/70 px-4 py-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-ink-soft">
                Estimasi Harga Aktif ({editingJumlahPenghuni} penghuni):
              </span>
              <span className="text-sm font-bold text-kos-700 tabular-nums">
                {rupiah(
                  (editingJumlahPenghuni >= 2
                    ? Number(form.harga_berdua || 800000)
                    : Number(form.harga_individu || 550000)) +
                    (editingJumlahPenghuni === 0
                      ? 0
                      : (form.biaya_fasilitas ?? 0) > 0
                        ? editingJumlahPenghuni >= 2
                          ? 310000
                          : 200000
                        : 0),
                )}{" "}
                / bulan
              </span>
            </div>
          </div>
          <div>
            <label htmlFor="fasilitas" className={labelCls}>
              Keterangan Fasilitas
            </label>
            <textarea
              id="fasilitas"
              rows={2}
              placeholder="Kasur, lemari, kamar mandi dalam, AC, Wi-Fi..."
              value={form.fasilitas}
              onChange={(e) => setForm({ ...form, fasilitas: e.target.value })}
              className={inputCls}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className={btnOutline}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={btnPrimary}
            >
              {isSubmitting ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!hapus}
        title="Hapus kamar?"
        message={`Kamar ${hapus?.nomor_kamar ?? ""} akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.`}
        confirmLabel="Hapus"
        tone="danger"
        loading={menghapus}
        onConfirm={konfirmasiHapus}
        onCancel={() => setHapus(null)}
      />
    </div>
  );
}
