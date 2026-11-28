import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  createAkunStaff,
  deleteAkunStaff,
  extractMessages,
  getAkunStaff,
  type AkunStaffItem,
} from "../../services/authService";
import { inisial, tglPendek } from "../../lib/format";
import PageHeader from "../../components/portal/PageHeader";
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
import SearchInput from "../../components/admin/SearchInput";
import EmptyState from "../../components/admin/EmptyState";
import {
  inputCls,
  labelCls,
  tdCls,
  thCls,
} from "../../components/admin/styles";

export default function KelolaAkun() {
  const toast = useToast();
  const [targetRole, setTargetRole] = useState<"pemilik" | "pengurus">(
    "pengurus",
  );
  const [akunList, setAkunList] = useState<AkunStaffItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cari, setCari] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [namaLengkap, setNamaLengkap] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [akunBaru, setAkunBaru] = useState<{
    nama: string;
    email: string;
    password: string;
  } | null>(null);
  const [hapusTarget, setHapusTarget] = useState<AkunStaffItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const labelRole = targetRole === "pemilik" ? "Pemilik" : "Pengurus";

  const fetchData = async () => {
    try {
      const res = await getAkunStaff();
      setTargetRole(res.data.target_role);
      setAkunList(res.data.akun);
    } catch (err) {
      toast.error(extractMessages(err, "Gagal memuat daftar akun.")[0]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tersaring = useMemo(() => {
    const q = cari.trim().toLowerCase();
    return akunList.filter(
      (a) =>
        (a.nama_lengkap || "").toLowerCase().includes(q) ||
        (a.email || "").toLowerCase().includes(q),
    );
  }, [akunList, cari]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Kata sandi awal minimal 8 karakter.");
      return;
    }

    setIsSubmitting(true);
    try {
      await createAkunStaff({
        nama_lengkap: namaLengkap.trim(),
        email: email.trim().toLowerCase(),
        password,
      });
      setAkunBaru({
        nama: namaLengkap.trim(),
        email: email.trim().toLowerCase(),
        password,
      });
      setFormOpen(false);
      setNamaLengkap("");
      setEmail("");
      setPassword("");
      await fetchData();
    } catch (err) {
      toast.error(extractMessages(err, `Gagal membuat akun ${labelRole}.`)[0]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleHapus = async () => {
    if (!hapusTarget) return;
    setIsDeleting(true);
    try {
      await deleteAkunStaff(hapusTarget.id);
      toast.success(
        `Akun ${hapusTarget.nama_lengkap || hapusTarget.email} berhasil dihapus.`,
      );
      setHapusTarget(null);
      await fetchData();
    } catch (err) {
      toast.error(extractMessages(err, "Gagal menghapus akun.")[0]);
    } finally {
      setIsDeleting(false);
    }
  };

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
        <Skeleton className="h-80" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        crumbs={[
          { label: "Beranda", to: "/dashboard" },
          { label: `Kelola Akun ${labelRole}` },
        ]}
        title={`Kelola Akun ${labelRole}`}
        subtitle={`Tambahkan akun ${labelRole} baru menggunakan email dan tentukan kata sandi awal untuk login.`}
        action={
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className={btnPrimary}
          >
            <PlusIcon size={17} /> Tambah {labelRole}
          </button>
        }
      />

      <section className="overflow-hidden rounded-2xl border border-field-line bg-field">
        <div className="flex flex-col gap-3 border-b border-field-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="flex items-center gap-2 text-base font-bold text-ink">
            Daftar {labelRole}{" "}
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-ink-soft">
              {akunList.length}
            </span>
          </h2>
          <SearchInput
            value={cari}
            onChange={setCari}
            placeholder="Cari nama atau email..."
          />
        </div>

        {tersaring.length === 0 ? (
          <EmptyState
            icon={<UsersIcon size={26} />}
            title={
              akunList.length === 0
                ? `Belum ada akun ${labelRole}`
                : "Akun tidak ditemukan"
            }
            text={
              akunList.length === 0
                ? `Klik tombol Tambah ${labelRole} untuk membuat akun baru.`
                : "Coba kata kunci lain."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-cream/50">
                <tr>
                  <th className={thCls}>Nama Lengkap</th>
                  <th className={thCls}>Email Login</th>
                  <th className={thCls}>Peran</th>
                  <th className={thCls}>Tanggal Dibuat</th>
                  <th className={`${thCls} text-right`}>Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-field-line">
                {tersaring.map((a) => (
                  <tr key={a.id} className="transition hover:bg-cream/40">
                    <td className={tdCls}>
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-kos-100/70 text-xs font-bold text-kos-700">
                          {inisial(a.nama_lengkap || a.email)}
                        </span>
                        <span className="font-semibold">
                          {a.nama_lengkap || a.username}
                        </span>
                      </div>
                    </td>
                    <td className={`${tdCls} text-xs text-ink-soft`}>
                      {a.email}
                    </td>
                    <td className={tdCls}>
                      <span className="inline-block rounded-full bg-kos-100/70 px-2.5 py-0.5 text-xs font-semibold text-kos-700 capitalize">
                        {a.role}
                      </span>
                    </td>
                    <td className={`${tdCls} whitespace-nowrap text-ink-soft`}>
                      {tglPendek(a.date_joined.split("T")[0])}
                    </td>
                    <td className={`${tdCls} text-right`}>
                      <button
                        type="button"
                        onClick={() => setHapusTarget(a)}
                        className="cursor-pointer rounded-lg px-2.5 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={`Buat Akun ${labelRole}`}
        description={`Masukkan email ${labelRole.toLowerCase()} dan tentukan kata sandi awal untuk masuk.`}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="staff-nama" className={labelCls}>
              Nama Lengkap
            </label>
            <input
              id="staff-nama"
              required
              placeholder={`Nama lengkap ${labelRole.toLowerCase()}`}
              value={namaLengkap}
              onChange={(e) => setNamaLengkap(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="staff-email" className={labelCls}>
              Email
            </label>
            <input
              id="staff-email"
              type="email"
              required
              placeholder="nama@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="staff-pw" className={labelCls}>
              Kata Sandi Awal
            </label>
            <input
              id="staff-pw"
              type="text"
              required
              minLength={8}
              placeholder="Minimal 8 karakter"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputCls}
            />
            <p className="mt-1.5 text-xs text-ink-soft">
              Kata sandi ini dapat diubah sendiri setelah akun berhasil login.
            </p>
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
              {isSubmitting ? "Menyimpan..." : `Buat Akun ${labelRole}`}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!akunBaru}
        onClose={() => setAkunBaru(null)}
        title={`Akun ${labelRole} berhasil dibuat`}
        size="sm"
      >
        <div className="mb-4 flex items-center gap-3 rounded-2xl bg-emerald-50 p-3.5 text-sm text-emerald-800">
          <CheckCircleIcon size={20} className="shrink-0" />
          <span>
            Akun login untuk <b>{akunBaru?.nama}</b> siap digunakan.
          </span>
        </div>
        <dl className="space-y-3">
          {[
            ["Email Login", akunBaru?.email ?? ""],
            ["Kata Sandi Awal", akunBaru?.password ?? ""],
          ].map(([k, v]) => (
            <div
              key={k}
              className="flex items-center justify-between gap-3 rounded-lg border border-field-line px-4 py-2.5"
            >
              <div>
                <dt className="text-[11px] font-semibold text-ink-soft">
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
          Berikan kredensial ini kepada {labelRole.toLowerCase()} dan minta
          mereka segera mengganti kata sandi setelah login.
        </p>
        <button
          type="button"
          onClick={() => setAkunBaru(null)}
          className={`${btnPrimary} mt-5 w-full`}
        >
          Selesai
        </button>
      </Modal>

      <ConfirmDialog
        open={!!hapusTarget}
        onCancel={() => setHapusTarget(null)}
        onConfirm={handleHapus}
        loading={isDeleting}
        title={`Hapus Akun ${labelRole}`}
        message={`Yakin ingin menghapus akun ${hapusTarget?.nama_lengkap || hapusTarget?.email}? Akun ini tidak akan bisa lagi masuk ke sistem.`}
        confirmLabel="Ya, Hapus Akun"
      />
    </div>
  );
}
