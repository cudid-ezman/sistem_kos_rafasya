import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import axios from "axios";
import {
  kamarService,
  type CreatePenghuniPayload,
  type UpdatePenghuniPayload,
} from "../../services/kamarService";
import type { Kamar, Penghuni } from "../../types/kos";
import { inisial, tglPendek } from "../../lib/format";
import PageHeader from "../../components/portal/PageHeader";
import StatusPill from "../../components/portal/StatusPill";
import { Skeleton } from "../../components/portal/Skeleton";
import { useToast } from "../../components/portal/toastContext";
import { btnOutline, btnPrimary } from "../../components/portal/buttons";
import {
  CheckCircleIcon,
  CopyIcon,
  PlusIcon,
  UsersIcon,
} from "../../components/portal/icons";
import Modal from "../../components/admin/Modal";
import ConfirmDialog from "../../components/admin/ConfirmDialog";
import FilterTabs from "../../components/admin/FilterTabs";
import Pagination from "../../components/admin/Pagination";
import SearchInput from "../../components/admin/SearchInput";
import EmptyState from "../../components/admin/EmptyState";
import {
  inputCls,
  labelCls,
  tdCls,
  thCls,
} from "../../components/admin/styles";

const PER_HALAMAN = 10;
const hariIni = () => new Date().toISOString().split("T")[0];

const formKosong = (kamar = 0): CreatePenghuniPayload => ({
  nama_lengkap: "",
  email: "",
  password: "",
  no_identitas: "",
  no_kontak: "",
  kamar,
  tanggal_masuk: hariIni(),
});

interface EditFormState {
  nama_lengkap: string;
  email: string;
  no_identitas: string;
  no_kontak: string;
  kamar: number;
  tanggal_masuk: string;
}

export default function DataPenghuni() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();

  const [penghuniList, setPenghuniList] = useState<Penghuni[]>([]);
  const [kamarList, setKamarList] = useState<Kamar[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cari, setCari] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "semua" | "aktif" | "nonaktif"
  >("semua");
  const [halaman, setHalaman] = useState(1);

  // Modal tambah penghuni baru
  const [formOpen, setFormOpen] = useState(params.get("tambah") === "1");
  const [form, setForm] = useState<CreatePenghuniPayload>(formKosong());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [akunBaru, setAkunBaru] = useState<{
    nama: string;
    email: string;
    password: string;
  } | null>(null);

  // Modal edit / pindah kamar / aktifkan kembali
  const [editTarget, setEditTarget] = useState<Penghuni | null>(null);
  const [modeAktifkan, setModeAktifkan] = useState(false);
  const [editForm, setEditForm] = useState<EditFormState>({
    nama_lengkap: "",
    email: "",
    no_identitas: "",
    no_kontak: "",
    kamar: 0,
    tanggal_masuk: hariIni(),
  });
  const [isUpdating, setIsUpdating] = useState(false);

  // Dialog konfirmasi checkout
  const [checkoutTarget, setCheckoutTarget] = useState<Penghuni | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const kamarTersedia = useMemo(
    () =>
      kamarList.filter((k) => {
        const jml = k.jumlah_penghuni ?? (k.status === "terisi" ? 1 : 0);
        return jml < 2;
      }),
    [kamarList],
  );

  const fetchData = async () => {
    try {
      const [resPenghuni, resKamar] = await Promise.all([
        kamarService.getAllPenghuni(),
        kamarService.getAllKamar(),
      ]);
      setPenghuniList(resPenghuni.data);
      setKamarList(resKamar.data);
      const tersedia = resKamar.data.filter(
        (k) => (k.jumlah_penghuni ?? (k.status === "terisi" ? 1 : 0)) < 2,
      );
      const diminta = Number(params.get("kamar"));
      const awal =
        tersedia.find((k) => k.id === diminta)?.id ?? tersedia[0]?.id ?? 0;
      setForm((prev) => ({
        ...prev,
        kamar:
          prev.kamar && tersedia.some((k) => k.id === prev.kamar)
            ? prev.kamar
            : awal,
      }));
    } catch (error) {
      console.error("Gagal memuat data penghuni", error);
      toast.error("Data penghuni belum bisa dimuat.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hitungStatus = useMemo(() => {
    let aktif = 0;
    let nonaktif = 0;
    for (const p of penghuniList) {
      if (p.status_aktif) aktif += 1;
      else nonaktif += 1;
    }
    return { semua: aktif, aktif, nonaktif };
  }, [penghuniList]);

  const tersaring = useMemo(() => {
    const q = cari.trim().toLowerCase().replace(/\s+/g, " ");
    return penghuniList.filter((p) => {
      if (filterStatus === "nonaktif") {
        if (p.status_aktif) return false;
      } else if (!p.status_aktif) {
        return false;
      }
      if (!q) return true;
      const kamar = (p.nomor_kamar || "").toLowerCase();
      if (/^\d+$/.test(q)) {
        return kamar === q || kamar.endsWith(q.padStart(2, "0"));
      }
      return (
        p.nama_lengkap.toLowerCase().includes(q) ||
        (p.email || "").toLowerCase().includes(q) ||
        (p.no_identitas || "").toLowerCase().includes(q) ||
        kamar.includes(q) ||
        (kamar !== "" && `kamar ${kamar}`.includes(q))
      );
    });
  }, [penghuniList, cari, filterStatus]);

  const baris = tersaring.slice(
    (halaman - 1) * PER_HALAMAN,
    halaman * PER_HALAMAN,
  );

  const tutupForm = () => {
    setFormOpen(false);
    if (params.has("tambah") || params.has("kamar"))
      setParams({}, { replace: true });
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.kamar) {
      toast.error("Pilih kamar yang tersedia terlebih dahulu.");
      return;
    }
    if (form.password.length < 8) {
      toast.error("Kata sandi awal minimal 8 karakter.");
      return;
    }
    setIsSubmitting(true);
    try {
      await kamarService.createPenghuni(form);
      setAkunBaru({
        nama: form.nama_lengkap,
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });
      tutupForm();
      setForm(formKosong());
      await fetchData();
    } catch (error) {
      console.error("Gagal menambah penghuni", error);
      const msg = axios.isAxiosError(error)
        ? error.response?.data?.detail
        : undefined;
      toast.error(
        msg || "Gagal menambah penghuni. Pastikan email belum terdaftar.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const bukaModalEdit = (p: Penghuni, aktifkan = false) => {
    setEditTarget(p);
    setModeAktifkan(aktifkan);
    const kamarDefault = aktifkan
      ? (kamarTersedia[0]?.id ?? 0)
      : (p.kamar ?? kamarTersedia[0]?.id ?? 0);
    setEditForm({
      nama_lengkap: p.nama_lengkap,
      email: p.email || "",
      no_identitas: p.no_identitas === "-" ? "" : p.no_identitas,
      no_kontak: p.no_kontak,
      kamar: kamarDefault,
      tanggal_masuk: aktifkan ? hariIni() : p.tanggal_masuk,
    });
  };

  const tutupModalEdit = () => {
    setEditTarget(null);
    setModeAktifkan(false);
  };

  const submitEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    if (!editForm.kamar) {
      toast.error("Pilih kamar yang tersedia.");
      return;
    }

    setIsUpdating(true);
    try {
      const payload: UpdatePenghuniPayload = {
        nama_lengkap: editForm.nama_lengkap.trim(),
        email: editForm.email.trim().toLowerCase(),
        no_identitas: editForm.no_identitas.trim() || "-",
        no_kontak: editForm.no_kontak.trim(),
        kamar: editForm.kamar,
        tanggal_masuk: editForm.tanggal_masuk,
      };
      if (modeAktifkan) {
        payload.aksi = "aktifkan";
      }

      await kamarService.updatePenghuni(editTarget.id, payload);
      toast.success(
        modeAktifkan
          ? `${editForm.nama_lengkap} berhasil diaktifkan kembali.`
          : "Data penghuni berhasil diperbarui.",
      );
      tutupModalEdit();
      await fetchData();
    } catch (error) {
      console.error("Gagal memperbarui penghuni", error);
      const msg = axios.isAxiosError(error)
        ? error.response?.data?.detail
        : undefined;
      toast.error(msg || "Gagal memperbarui data penghuni.");
    } finally {
      setIsUpdating(false);
    }
  };

  const prosesCheckout = async () => {
    if (!checkoutTarget) return;
    setIsCheckingOut(true);
    try {
      await kamarService.updatePenghuni(checkoutTarget.id, {
        aksi: "checkout",
      });
      toast.success(
        `${checkoutTarget.nama_lengkap} telah di-checkout. Kamar ${checkoutTarget.nomor_kamar || ""} kini tersedia.`,
      );
      setCheckoutTarget(null);
      await fetchData();
    } catch (error) {
      console.error("Gagal melakukan checkout", error);
      const msg = axios.isAxiosError(error)
        ? error.response?.data?.detail
        : undefined;
      toast.error(msg || "Gagal melakukan checkout penghuni.");
    } finally {
      setIsCheckingOut(false);
    }
  };

  // Pilihan kamar untuk modal Edit: kamar saat ini (jika masih aktif) + semua kamar tersedia
  const opsiKamarEdit = useMemo(() => {
    if (!editTarget) return kamarTersedia;
    const kamarSekarang =
      !modeAktifkan && editTarget.kamar
        ? kamarList.find((k) => k.id === editTarget.kamar)
        : undefined;
    if (
      !kamarSekarang ||
      kamarTersedia.some((k) => k.id === kamarSekarang.id)
    ) {
      return kamarTersedia;
    }
    return [kamarSekarang, ...kamarTersedia];
  }, [editTarget, modeAktifkan, kamarList, kamarTersedia]);

  const salin = async (teks: string) => {
    try {
      await navigator.clipboard.writeText(teks);
      toast.success("Disalin.");
    } catch {
      toast.error("Gagal menyalin.");
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
          { label: "Data Penghuni" },
        ]}
        title="Daftar Penghuni Kos"
        subtitle="Kelola registrasi penghuni baru, pindah kamar, maupun proses checkout penghuni keluar."
        action={
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className={btnPrimary}
          >
            <PlusIcon size={17} /> Tambah Penghuni
          </button>
        }
      />

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="flex items-center gap-2 text-base font-bold text-ink">
              Penghuni{" "}
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-ink-soft">
                {hitungStatus.aktif}
              </span>
            </h2>
            <FilterTabs
              value={filterStatus}
              onChange={(v) => {
                setFilterStatus(v);
                setHalaman(1);
              }}
              tabs={[
                { key: "semua", label: "Semua", count: hitungStatus.semua },
                { key: "aktif", label: "Aktif", count: hitungStatus.aktif },
                {
                  key: "nonaktif",
                  label: "Checkout",
                  count: hitungStatus.nonaktif,
                },
              ]}
            />
          </div>
          <SearchInput
            value={cari}
            onChange={(v) => {
              setCari(v);
              setHalaman(1);
            }}
            placeholder="Cari nama, email, atau kamar..."
          />
        </div>

        {tersaring.length === 0 ? (
          <EmptyState
            icon={<UsersIcon size={26} />}
            title={
              penghuniList.length === 0
                ? "Belum ada penghuni terdaftar"
                : "Penghuni tidak ditemukan"
            }
            text={
              penghuniList.length === 0
                ? "Tambahkan penghuni pertama, akun login email akan dibuat otomatis."
                : "Coba ubah filter atau kata kunci pencarian."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50/70">
                <tr>
                  <th className={thCls}>Nama Lengkap</th>
                  <th className={thCls}>Email Akun</th>
                  <th className={thCls}>No. Kontak</th>
                  <th className={thCls}>Kamar</th>
                  <th className={thCls}>Tanggal Masuk</th>
                  <th className={thCls}>Status</th>
                  <th className={`${thCls} text-right`}>Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {baris.map((p) => (
                  <tr key={p.id} className="transition hover:bg-slate-50/70">
                    <td className={tdCls}>
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-kos-100/70 text-xs font-bold text-kos-700">
                          {inisial(p.nama_lengkap)}
                        </span>
                        <div>
                          <span className="block font-semibold">
                            {p.nama_lengkap}
                          </span>
                          {p.no_identitas && p.no_identitas !== "-" && (
                            <span className="block font-mono text-[11px] text-ink-soft">
                              ID: {p.no_identitas}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className={`${tdCls} text-xs text-ink-soft`}>
                      {p.email || p.no_identitas}
                    </td>
                    <td className={tdCls}>{p.no_kontak}</td>
                    <td className={`${tdCls} font-semibold`}>
                      {p.nomor_kamar || <span className="text-ink-soft">-</span>}
                    </td>
                    <td className={`${tdCls} whitespace-nowrap text-ink-soft`}>
                      {tglPendek(p.tanggal_masuk)}
                    </td>
                    <td className={tdCls}>
                      <StatusPill
                        status={p.status_aktif ? "aktif" : "nonaktif"}
                      />
                    </td>
                    <td className={`${tdCls} whitespace-nowrap text-right`}>
                      {p.status_aktif ? (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => bukaModalEdit(p, false)}
                            className="cursor-pointer rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-ink transition hover:bg-slate-50"
                          >
                            Edit / Pindah
                          </button>
                          <button
                            type="button"
                            onClick={() => setCheckoutTarget(p)}
                            className="cursor-pointer rounded-lg px-2.5 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                          >
                            Checkout
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => bukaModalEdit(p, true)}
                          className="cursor-pointer rounded-lg border border-kos-200 bg-kos-50/70 px-2.5 py-1.5 text-xs font-semibold text-kos-700 transition hover:bg-kos-100/70"
                        >
                          Aktifkan Kembali
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
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

      {/* Modal Tambah Penghuni Baru */}
      <Modal
        open={formOpen}
        onClose={tutupForm}
        title="Registrasi Penghuni Baru"
        description="Masukkan email penghuni dan tentukan kata sandi awal untuk login."
      >
        {kamarTersedia.length === 0 ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm leading-relaxed text-rose-800">
            Semua kamar saat ini berstatus terisi. Tambahkan kamar baru atau
            ubah status kamar terlebih dahulu.
            <Link
              to="/dashboard/kamar"
              className="mt-3 block font-semibold underline"
            >
              Buka Data Kamar
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label htmlFor="nama" className={labelCls}>
                Nama Lengkap
              </label>
              <input
                id="nama"
                required
                placeholder="Nama lengkap penghuni"
                value={form.nama_lengkap}
                onChange={(e) =>
                  setForm({ ...form, nama_lengkap: e.target.value })
                }
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="email" className={labelCls}>
                Email Penghuni
              </label>
              <input
                id="email"
                type="email"
                required
                placeholder="penghuni@email.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={inputCls}
              />
              <p className="mt-1.5 text-xs text-ink-soft">
                Digunakan untuk login dan fitur lupa kata sandi.
              </p>
            </div>
            <div>
              <label htmlFor="password" className={labelCls}>
                Kata Sandi Awal
              </label>
              <input
                id="password"
                type="text"
                required
                minLength={8}
                placeholder="Minimal 8 karakter"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className={inputCls}
              />
              <p className="mt-1.5 text-xs text-ink-soft">
                Penghuni dapat mengganti kata sandi ini setelah berhasil masuk.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="hp" className={labelCls}>
                  No. HP / WhatsApp
                </label>
                <input
                  id="hp"
                  required
                  placeholder="0812xxxxxxxx"
                  value={form.no_kontak}
                  onChange={(e) =>
                    setForm({ ...form, no_kontak: e.target.value })
                  }
                  className={inputCls}
                />
              </div>
              <div>
                <label htmlFor="identitas" className={labelCls}>
                  No. Identitas (Opsional)
                </label>
                <input
                  id="identitas"
                  placeholder="NIK / KTM"
                  value={form.no_identitas || ""}
                  onChange={(e) =>
                    setForm({ ...form, no_identitas: e.target.value })
                  }
                  className={inputCls}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="kamar" className={labelCls}>
                  Pilih Kamar
                </label>
                <select
                  id="kamar"
                  value={form.kamar}
                  onChange={(e) =>
                    setForm({ ...form, kamar: Number(e.target.value) })
                  }
                  className={inputCls}
                >
                  {kamarTersedia.map((k) => (
                    <option key={k.id} value={k.id}>
                      Kamar {k.nomor_kamar} —{" "}
                      {(k.jumlah_penghuni ??
                        (k.status === "terisi" ? 1 : 0)) === 0
                        ? "Kosong (1 org: Rp550rb)"
                        : "Terisi 1/2 org (Tambah teman sekamar → Berdua)"}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="masuk" className={labelCls}>
                  Tanggal Masuk
                </label>
                <input
                  id="masuk"
                  type="date"
                  required
                  value={form.tanggal_masuk}
                  onChange={(e) =>
                    setForm({ ...form, tanggal_masuk: e.target.value })
                  }
                  className={inputCls}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={tutupForm} className={btnOutline}>
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={btnPrimary}
              >
                {isSubmitting ? "Menyimpan..." : "Daftarkan Penghuni"}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal Edit Data / Pindah Kamar / Aktifkan Kembali */}
      <Modal
        open={!!editTarget}
        onClose={tutupModalEdit}
        title={
          modeAktifkan
            ? "Aktifkan Kembali Penghuni"
            : "Edit Data & Pindah Kamar"
        }
        description={
          modeAktifkan
            ? "Pilih kamar yang tersedia dan perbarui data penghuni untuk mengaktifkan akun kembali."
            : "Perbarui profil penghuni atau pindahkan penghuni ke kamar lain yang tersedia."
        }
      >
        {opsiKamarEdit.length === 0 ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm leading-relaxed text-rose-800">
            Tidak ada kamar yang tersedia saat ini. Tambahkan kamar atau
            kosongkan kamar terlebih dahulu.
          </div>
        ) : (
          <form onSubmit={submitEdit} className="space-y-4">
            <div>
              <label htmlFor="edit-nama" className={labelCls}>
                Nama Lengkap
              </label>
              <input
                id="edit-nama"
                required
                value={editForm.nama_lengkap}
                onChange={(e) =>
                  setEditForm({ ...editForm, nama_lengkap: e.target.value })
                }
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="edit-email" className={labelCls}>
                Email Login
              </label>
              <input
                id="edit-email"
                type="email"
                required
                value={editForm.email}
                onChange={(e) =>
                  setEditForm({ ...editForm, email: e.target.value })
                }
                className={inputCls}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="edit-hp" className={labelCls}>
                  No. HP / WhatsApp
                </label>
                <input
                  id="edit-hp"
                  required
                  value={editForm.no_kontak}
                  onChange={(e) =>
                    setEditForm({ ...editForm, no_kontak: e.target.value })
                  }
                  className={inputCls}
                />
              </div>
              <div>
                <label htmlFor="edit-identitas" className={labelCls}>
                  No. Identitas (Opsional)
                </label>
                <input
                  id="edit-identitas"
                  placeholder="NIK / KTM"
                  value={editForm.no_identitas}
                  onChange={(e) =>
                    setEditForm({ ...editForm, no_identitas: e.target.value })
                  }
                  className={inputCls}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="edit-kamar" className={labelCls}>
                  Kamar Ditempati
                </label>
                <select
                  id="edit-kamar"
                  value={editForm.kamar}
                  onChange={(e) =>
                    setEditForm({ ...editForm, kamar: Number(e.target.value) })
                  }
                  className={inputCls}
                >
                  {opsiKamarEdit.map((k) => (
                    <option key={k.id} value={k.id}>
                      Kamar {k.nomor_kamar} —{" "}
                      {(k.jumlah_penghuni ??
                        (k.status === "terisi" ? 1 : 0)) === 0
                        ? "Kosong (1 org: Rp550rb)"
                        : "Terisi 1/2 org (Tambah teman sekamar → Berdua)"}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="edit-masuk" className={labelCls}>
                  Tanggal Masuk
                </label>
                <input
                  id="edit-masuk"
                  type="date"
                  required
                  value={editForm.tanggal_masuk}
                  onChange={(e) =>
                    setEditForm({ ...editForm, tanggal_masuk: e.target.value })
                  }
                  className={inputCls}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={tutupModalEdit}
                className={btnOutline}
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isUpdating}
                className={btnPrimary}
              >
                {isUpdating
                  ? "Menyimpan..."
                  : modeAktifkan
                    ? "Aktifkan Penghuni"
                    : "Simpan Perubahan"}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Dialog Konfirmasi Checkout */}
      <ConfirmDialog
        open={!!checkoutTarget}
        onCancel={() => setCheckoutTarget(null)}
        onConfirm={prosesCheckout}
        loading={isCheckingOut}
        tone="danger"
        title="Checkout Penghuni"
        message={`Yakin ingin menonaktifkan (checkout) ${checkoutTarget?.nama_lengkap}? Status Kamar ${checkoutTarget?.nomor_kamar || ""} akan otomatis kembali Tersedia dan akun penghuni dinonaktifkan, sementara riwayat tagihan tetap tersimpan.`}
        confirmLabel="Ya, Checkout Penghuni"
      />

      {/* Modal Info Akun Baru */}
      <Modal
        open={!!akunBaru}
        onClose={() => setAkunBaru(null)}
        title="Penghuni berhasil ditambahkan"
        size="sm"
      >
        <div className="mb-4 flex items-center gap-3 rounded-2xl bg-emerald-50 p-3.5 text-sm text-emerald-800">
          <CheckCircleIcon size={20} className="shrink-0" />
          <span>
            Akun login untuk <b>{akunBaru?.nama}</b> sudah dibuat.
          </span>
        </div>
        <dl className="space-y-3">
          {[
            ["Email Login", akunBaru?.email ?? ""],
            ["Kata Sandi Awal", akunBaru?.password ?? ""],
          ].map(([k, v]) => (
            <div
              key={k}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-2.5"
            >
              <div>
                <dt className="text-[11px] font-semibold tracking-wide text-ink-soft uppercase">
                  {k}
                </dt>
                <dd className="font-mono text-sm font-semibold text-ink">
                  {v}
                </dd>
              </div>
              <button
                type="button"
                onClick={() => salin(v)}
                aria-label={`Salin ${k}`}
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-ink-soft hover:bg-slate-100"
              >
                <CopyIcon size={17} />
              </button>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs leading-relaxed text-ink-soft">
          Berikan kredensial ini ke penghuni dan minta mereka segera mengganti
          kata sandi setelah login.
        </p>
        <button
          type="button"
          onClick={() => setAkunBaru(null)}
          className={`${btnPrimary} mt-5 w-full`}
        >
          Selesai
        </button>
      </Modal>
    </div>
  );
}
