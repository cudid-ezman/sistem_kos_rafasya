import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { kamarService, type CreatePenghuniPayload } from '../../services/kamarService';
import type { Kamar, Penghuni } from '../../types/kos';
import { inisial, tglPendek } from '../../lib/format';
import PageHeader from '../../components/portal/PageHeader';
import StatusPill from '../../components/portal/StatusPill';
import { Skeleton } from '../../components/portal/Skeleton';
import { useToast } from '../../components/portal/toastContext';
import { btnOutline, btnPrimary } from '../../components/portal/buttons';
import { CheckCircleIcon, CopyIcon, PlusIcon, UsersIcon } from '../../components/portal/icons';
import Modal from '../../components/admin/Modal';
import Pagination from '../../components/admin/Pagination';
import SearchInput from '../../components/admin/SearchInput';
import EmptyState from '../../components/admin/EmptyState';
import { inputCls, labelCls, tdCls, thCls } from '../../components/admin/styles';

const PER_HALAMAN = 10;
const PASSWORD_DEFAULT = 'kos12345';
const hariIni = () => new Date().toISOString().split('T')[0];

const formKosong = (kamar = 0): CreatePenghuniPayload => ({
  nama_lengkap: '',
  no_identitas: '',
  no_kontak: '',
  kamar,
  tanggal_masuk: hariIni(),
});

export default function DataPenghuni() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();

  const [penghuniList, setPenghuniList] = useState<Penghuni[]>([]);
  const [kamarTersedia, setKamarTersedia] = useState<Kamar[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cari, setCari] = useState('');
  const [halaman, setHalaman] = useState(1);

  const [formOpen, setFormOpen] = useState(params.get('tambah') === '1');
  const [form, setForm] = useState<CreatePenghuniPayload>(formKosong());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [akunBaru, setAkunBaru] = useState<{ nama: string; username: string } | null>(null);

  const fetchData = async () => {
    try {
      const [resPenghuni, resKamar] = await Promise.all([kamarService.getAllPenghuni(), kamarService.getAllKamar()]);
      setPenghuniList(resPenghuni.data);
      const tersedia = resKamar.data.filter((k) => k.status === 'tersedia');
      setKamarTersedia(tersedia);
      const diminta = Number(params.get('kamar'));
      const awal = tersedia.find((k) => k.id === diminta)?.id ?? tersedia[0]?.id ?? 0;
      setForm((prev) => ({ ...prev, kamar: prev.kamar && tersedia.some((k) => k.id === prev.kamar) ? prev.kamar : awal }));
    } catch (error) {
      console.error('Gagal memuat data penghuni', error);
      toast.error('Data penghuni belum bisa dimuat.');
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
    return penghuniList.filter(
      (p) =>
        p.nama_lengkap.toLowerCase().includes(q) ||
        p.no_identitas.toLowerCase().includes(q) ||
        (p.nomor_kamar || '').toLowerCase().includes(q)
    );
  }, [penghuniList, cari]);
  const baris = tersaring.slice((halaman - 1) * PER_HALAMAN, halaman * PER_HALAMAN);

  const tutupForm = () => {
    setFormOpen(false);
    if (params.has('tambah') || params.has('kamar')) setParams({}, { replace: true });
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.kamar) {
      toast.error('Pilih kamar yang tersedia terlebih dahulu.');
      return;
    }
    setIsSubmitting(true);
    try {
      await kamarService.createPenghuni(form);
      setAkunBaru({ nama: form.nama_lengkap, username: form.no_identitas });
      tutupForm();
      setForm(formKosong());
      await fetchData();
    } catch (error) {
      console.error('Gagal menambah penghuni', error);
      toast.error('Gagal menambah penghuni. Pastikan nomor identitas belum terdaftar.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const salin = async (teks: string) => {
    try {
      await navigator.clipboard.writeText(teks);
      toast.success('Disalin.');
    } catch {
      toast.error('Gagal menyalin.');
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
        crumbs={[{ label: 'Beranda', to: '/dashboard' }, { label: 'Data Penghuni' }]}
        title="Daftar Penghuni Kos"
        subtitle="Penambahan penghuni otomatis membuatkan akun login dan mengisi status kamar."
        action={
          <button type="button" onClick={() => setFormOpen(true)} className={btnPrimary}>
            <PlusIcon size={17} /> Tambah Penghuni
          </button>
        }
      />

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="flex items-center gap-2 text-base font-bold text-ink">
            Penghuni <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-ink-soft">{penghuniList.length}</span>
          </h2>
          <SearchInput
            value={cari}
            onChange={(v) => {
              setCari(v);
              setHalaman(1);
            }}
            placeholder="Cari nama, identitas, atau kamar..."
          />
        </div>

        {tersaring.length === 0 ? (
          <EmptyState
            icon={<UsersIcon size={26} />}
            title={penghuniList.length === 0 ? 'Belum ada penghuni terdaftar' : 'Penghuni tidak ditemukan'}
            text={penghuniList.length === 0 ? 'Tambahkan penghuni pertama, akun login dibuat otomatis.' : 'Coba kata kunci lain.'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50/70">
                <tr>
                  <th className={thCls}>Nama Lengkap</th>
                  <th className={thCls}>Username (No. Identitas)</th>
                  <th className={thCls}>No. Kontak</th>
                  <th className={thCls}>Kamar</th>
                  <th className={thCls}>Tanggal Masuk</th>
                  <th className={thCls}>Status</th>
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
                        <span className="font-semibold">{p.nama_lengkap}</span>
                      </div>
                    </td>
                    <td className={`${tdCls} font-mono text-xs text-ink-soft`}>{p.no_identitas}</td>
                    <td className={tdCls}>{p.no_kontak}</td>
                    <td className={`${tdCls} font-semibold`}>Kamar {p.nomor_kamar || '-'}</td>
                    <td className={`${tdCls} whitespace-nowrap text-ink-soft`}>{tglPendek(p.tanggal_masuk)}</td>
                    <td className={tdCls}>
                      <StatusPill status={p.status_aktif ? 'aktif' : 'nonaktif'} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination total={tersaring.length} page={halaman} perPage={PER_HALAMAN} onChange={setHalaman} />
      </section>

      <Modal open={formOpen} onClose={tutupForm} title="Registrasi Penghuni Baru" description="Akun login dibuat otomatis dari nomor identitas.">
        {kamarTersedia.length === 0 ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm leading-relaxed text-rose-800">
            Semua kamar saat ini berstatus terisi. Tambahkan kamar baru atau ubah status kamar terlebih dahulu.
            <Link to="/dashboard/kamar" className="mt-3 block font-semibold underline">
              Buka Data Kamar
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label htmlFor="nama" className={labelCls}>Nama Lengkap</label>
              <input id="nama" required placeholder="Nama sesuai identitas" value={form.nama_lengkap} onChange={(e) => setForm({ ...form, nama_lengkap: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label htmlFor="identitas" className={labelCls}>No. Identitas</label>
              <input id="identitas" required placeholder="Nomor identitas (mis. NIK)" value={form.no_identitas} onChange={(e) => setForm({ ...form, no_identitas: e.target.value })} className={inputCls} />
              <p className="mt-1.5 text-xs text-ink-soft">Dipakai sebagai username login penghuni.</p>
            </div>
            <div>
              <label htmlFor="hp" className={labelCls}>No. HP / WhatsApp</label>
              <input id="hp" required placeholder="0812xxxxxxxx" value={form.no_kontak} onChange={(e) => setForm({ ...form, no_kontak: e.target.value })} className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="kamar" className={labelCls}>Pilih Kamar</label>
                <select id="kamar" value={form.kamar} onChange={(e) => setForm({ ...form, kamar: Number(e.target.value) })} className={inputCls}>
                  {kamarTersedia.map((k) => (
                    <option key={k.id} value={k.id}>
                      Kamar {k.nomor_kamar} ({k.tipe})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="masuk" className={labelCls}>Tanggal Masuk</label>
                <input id="masuk" type="date" required value={form.tanggal_masuk} onChange={(e) => setForm({ ...form, tanggal_masuk: e.target.value })} className={inputCls} />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={tutupForm} className={btnOutline}>Batal</button>
              <button type="submit" disabled={isSubmitting} className={btnPrimary}>{isSubmitting ? 'Menyimpan...' : 'Daftarkan Penghuni'}</button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={!!akunBaru} onClose={() => setAkunBaru(null)} title="Penghuni berhasil ditambahkan" size="sm">
        <div className="mb-4 flex items-center gap-3 rounded-2xl bg-emerald-50 p-3.5 text-sm text-emerald-800">
          <CheckCircleIcon size={20} className="shrink-0" />
          <span>Akun login untuk <b>{akunBaru?.nama}</b> sudah dibuat.</span>
        </div>
        <dl className="space-y-3">
          {[
            ['Username', akunBaru?.username ?? ''],
            ['Password', PASSWORD_DEFAULT],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-2.5">
              <div>
                <dt className="text-[11px] font-semibold tracking-wide text-ink-soft uppercase">{k}</dt>
                <dd className="font-mono text-sm font-semibold text-ink">{v}</dd>
              </div>
              <button type="button" onClick={() => salin(v)} aria-label={`Salin ${k}`} className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-ink-soft hover:bg-slate-100">
                <CopyIcon size={17} />
              </button>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs leading-relaxed text-ink-soft">Berikan data ini ke penghuni dan minta mereka segera mengganti kata sandi.</p>
        <button type="button" onClick={() => setAkunBaru(null)} className={`${btnPrimary} mt-5 w-full`}>Selesai</button>
      </Modal>
    </div>
  );
}
