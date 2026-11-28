import { useEffect, useState, type FormEvent } from "react";
import {
  informasiService,
  type InformasiPayload,
} from "../../services/informasiService";
import type { InformasiItem } from "../../types/kos";
import { tglPendek } from "../../lib/format";
import PageHeader from "../../components/portal/PageHeader";
import { Skeleton } from "../../components/portal/Skeleton";
import { useToast } from "../../components/portal/toastContext";
import { btnOutline, btnPrimary } from "../../components/portal/buttons";
import {
  BookIcon,
  ClockIcon,
  InfoCircleIcon,
  WifiIcon,
} from "../../components/portal/icons";
import Modal from "../../components/admin/Modal";
import EmptyState from "../../components/admin/EmptyState";
import {
  inputCls,
  labelCls,
  tdCls,
  thCls,
} from "../../components/admin/styles";

const PILIHAN_IKON = [
  { value: "aturan-kos", label: "Buku / Aturan Kos", icon: BookIcon },
  {
    value: "jadwal-gerbang",
    label: "Jam / Jadwal Operasional",
    icon: ClockIcon,
  },
  { value: "wifi", label: "Wi-Fi / Jaringan", icon: WifiIcon },
  { value: "umum", label: "Pengumuman Umum", icon: InfoCircleIcon },
];

export default function KelolaInformasi() {
  const toast = useToast();
  const [list, setList] = useState<InformasiItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<InformasiItem | null>(null);
  const [hapusItem, setHapusItem] = useState<InformasiItem | null>(null);

  const [kategori, setKategori] = useState("");
  const [ringkasan, setRingkasan] = useState("");
  const [ikon, setIkon] = useState("aturan-kos");
  const [isi, setIsi] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchInformasi = async () => {
    try {
      const res = await informasiService.getAll();
      setList(res.data);
    } catch (error) {
      console.error("Gagal memuat data informasi", error);
      toast.error("Data pusat informasi belum bisa dimuat.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchInformasi();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bukaTambah = () => {
    setEditItem(null);
    setKategori("");
    setRingkasan("");
    setIkon("aturan-kos");
    setIsi("");
    setModalOpen(true);
  };

  const bukaEdit = (item: InformasiItem) => {
    setEditItem(item);
    setKategori(item.kategori);
    setRingkasan(item.ringkasan || "");
    setIkon(item.ikon || "aturan-kos");
    setIsi(item.isi || "");
    setModalOpen(true);
  };

  const simpan = async (e: FormEvent) => {
    e.preventDefault();
    if (!kategori.trim()) {
      toast.error("Judul / kategori informasi wajib diisi.");
      return;
    }

    const payload: InformasiPayload = {
      kategori: kategori.trim(),
      ringkasan: ringkasan.trim(),
      ikon,
      isi: isi.trim(),
    };

    setIsSubmitting(true);
    try {
      if (editItem) {
        await informasiService.update(editItem.id, payload);
        toast.success("Informasi berhasil diperbarui.");
      } else {
        await informasiService.create(payload);
        toast.success("Informasi baru berhasil ditambahkan.");
      }
      setModalOpen(false);
      await fetchInformasi();
    } catch (error) {
      console.error("Gagal menyimpan informasi", error);
      toast.error("Terjadi kesalahan saat menyimpan informasi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const konfirmasiHapus = async () => {
    if (!hapusItem) return;
    setIsSubmitting(true);
    try {
      await informasiService.remove(hapusItem.id);
      toast.success(`Informasi "${hapusItem.kategori}" telah dihapus.`);
      setHapusItem(null);
      await fetchInformasi();
    } catch (error) {
      console.error("Gagal menghapus informasi", error);
      toast.error("Informasi gagal dihapus.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderIkon = (kode: string) => {
    const found = PILIHAN_IKON.find((p) => p.value === kode);
    const IkonComp = found ? found.icon : BookIcon;
    return <IkonComp size={18} />;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        crumbs={[
          { label: "Beranda", to: "/dashboard" },
          { label: "Pusat Informasi" },
        ]}
        title="Manajemen Pusat Informasi"
        subtitle="Kelola tata tertib, jadwal gerbang, status Wi-Fi, dan pengumuman yang tampil di portal penghuni."
        action={
          list.length > 0 ? (
            <button type="button" onClick={bukaTambah} className={btnPrimary}>
              + Tambah Informasi
            </button>
          ) : undefined
        }
      />

      {list.length === 0 ? (
        <EmptyState
          icon={<InfoCircleIcon size={26} />}
          title="Belum ada informasi"
          text="Tambahkan aturan kos, jadwal gerbang, atau pengumuman untuk penghuni."
          action={
            <button type="button" onClick={bukaTambah} className={btnPrimary}>
              + Tambah Informasi
            </button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-field-line bg-white">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-field-line bg-cream/50">
                  <th className={thCls}>Kategori / Judul</th>
                  <th className={thCls}>Ringkasan & Cuplikan Isi</th>
                  <th className={thCls}>Status Konten</th>
                  <th className={thCls}>Diperbarui</th>
                  <th className={`${thCls} text-right`}>Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-field-line">
                {list.map((item) => {
                  const terisi = Boolean(
                    item.isi && item.isi.trim().length > 0,
                  );
                  return (
                    <tr
                      key={item.id}
                      className="transition hover:bg-cream/40"
                    >
                      <td className={tdCls}>
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-kos-100/60 text-kos-700">
                            {renderIkon(item.ikon)}
                          </span>
                          <span className="font-bold text-ink">
                            {item.kategori}
                          </span>
                        </div>
                      </td>
                      <td className={`${tdCls} max-w-md`}>
                        {item.ringkasan && (
                          <p className="text-sm font-medium text-ink">
                            {item.ringkasan}
                          </p>
                        )}
                        <p className="mt-0.5 line-clamp-2 text-xs text-ink-soft">
                          {terisi
                            ? item.isi
                            : "Belum ada isi detail yang ditulis pengurus."}
                        </p>
                      </td>
                      <td className={tdCls}>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                            terisi
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {terisi ? "Terisi" : "Kosong"}
                        </span>
                      </td>
                      <td
                        className={`${tdCls} whitespace-nowrap text-xs text-ink-soft`}
                      >
                        {tglPendek(item.tanggal_pembaruan)}
                      </td>
                      <td className={`${tdCls} text-right whitespace-nowrap`}>
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => bukaEdit(item)}
                            className="cursor-pointer rounded-lg border border-field-line px-3 py-1.5 text-xs font-semibold text-ink transition hover:bg-slate-50"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setHapusItem(item)}
                            className="cursor-pointer rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Tambah / Edit Informasi */}
      <Modal
        open={modalOpen}
        onClose={() => !isSubmitting && setModalOpen(false)}
        title={editItem ? "Edit Informasi" : "Tambah Informasi Baru"}
      >
        <form onSubmit={simpan} className="space-y-4">
          <div>
            <label htmlFor="info-kategori" className={labelCls}>
              Judul / Kategori Informasi{" "}
              <span className="text-rose-600">*</span>
            </label>
            <input
              id="info-kategori"
              type="text"
              value={kategori}
              onChange={(e) => setKategori(e.target.value)}
              placeholder="Contoh: Aturan Kos, Jadwal Gerbang, Status Wi-Fi"
              className={inputCls}
              required
            />
          </div>

          <div>
            <label htmlFor="info-ikon" className={labelCls}>
              Ikon Tampilan
            </label>
            <select
              id="info-ikon"
              value={ikon}
              onChange={(e) => setIkon(e.target.value)}
              className={inputCls}
            >
              {PILIHAN_IKON.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="info-ringkasan" className={labelCls}>
              Ringkasan Singkat (Tampil di Kartu)
            </label>
            <input
              id="info-ringkasan"
              type="text"
              value={ringkasan}
              onChange={(e) => setRingkasan(e.target.value)}
              placeholder="Deskripsi singkat 1 kalimat..."
              className={inputCls}
            />
          </div>

          <div>
            <label htmlFor="info-isi" className={labelCls}>
              Isi Lengkap Informasi
            </label>
            <textarea
              id="info-isi"
              rows={8}
              value={isi}
              onChange={(e) => setIsi(e.target.value)}
              placeholder="Tuliskan rincian aturan, jadwal, atau pengumuman di sini (pisahkan paragraf dengan Enter)..."
              className={`${inputCls} !h-auto resize-y py-3 leading-relaxed`}
            />
          </div>

          <div className="sticky -bottom-6 -mx-6 -mb-6 flex justify-end gap-2.5 border-t border-field-line bg-white px-6 py-4">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setModalOpen(false)}
              className={btnOutline}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={btnPrimary}
            >
              {isSubmitting
                ? "Menyimpan..."
                : editItem
                  ? "Simpan Perubahan"
                  : "Tambah Informasi"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Konfirmasi Hapus */}
      <Modal
        open={Boolean(hapusItem)}
        onClose={() => !isSubmitting && setHapusItem(null)}
        title="Hapus Informasi"
      >
        <div className="space-y-4">
          <p className="text-sm text-ink-soft">
            Apakah Anda yakin ingin menghapus informasi{" "}
            <span className="font-bold text-ink">{hapusItem?.kategori}</span>?
            Informasi ini tidak akan lagi muncul di portal penghuni.
          </p>
          <div className="sticky -bottom-6 -mx-6 -mb-6 flex justify-end gap-2.5 border-t border-field-line bg-white px-6 py-4">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setHapusItem(null)}
              className={btnOutline}
            >
              Batal
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => void konfirmasiHapus()}
              className="cursor-pointer rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-50"
            >
              {isSubmitting ? "Menghapus..." : "Ya, Hapus"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
