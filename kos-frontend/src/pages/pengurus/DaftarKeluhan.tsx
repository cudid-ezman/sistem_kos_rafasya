import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { keluhanService } from '../../services/keluhanService';
import type { Keluhan } from '../../types/kos';
import { inisial, tglPendek } from '../../lib/format';
import PageHeader from '../../components/portal/PageHeader';
import StatusPill from '../../components/portal/StatusPill';
import { Skeleton } from '../../components/portal/Skeleton';
import { useToast } from '../../components/portal/toastContext';
import { btnOutline, btnPrimary } from '../../components/portal/buttons';
import { WarningIcon } from '../../components/portal/icons';
import Modal from '../../components/admin/Modal';
import Pagination from '../../components/admin/Pagination';
import SearchInput from '../../components/admin/SearchInput';
import FilterTabs from '../../components/admin/FilterTabs';
import EmptyState from '../../components/admin/EmptyState';
import { inputCls, labelCls, tdCls, thCls } from '../../components/admin/styles';

type Status = Keluhan['status'];
type Filter = 'semua' | Status;
const PER_HALAMAN = 8;

const PILIHAN: { key: Status; label: string }[] = [
  { key: 'diterima', label: 'Diterima' },
  { key: 'diproses', label: 'Diproses' },
  { key: 'selesai', label: 'Selesai' },
];

export default function DaftarKeluhan() {
  const toast = useToast();
  const [params] = useSearchParams();
  const [list, setList] = useState<Keluhan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('semua');
  const [cari, setCari] = useState(params.get('cari') ?? '');
  const [halaman, setHalaman] = useState(1);

  const [terpilih, setTerpilih] = useState<Keluhan | null>(null);
  const [statusBaru, setStatusBaru] = useState<Status>('diproses');
  const [catatan, setCatatan] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchKeluhan = async () => {
    try {
      const res = await keluhanService.getAll();
      setList(res.data);
    } catch (error) {
      console.error('Gagal mengambil daftar keluhan', error);
      toast.error('Daftar keluhan belum bisa dimuat.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchKeluhan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hitung = useMemo(
    () => ({
      semua: list.length,
      diterima: list.filter((k) => k.status === 'diterima').length,
      diproses: list.filter((k) => k.status === 'diproses').length,
      selesai: list.filter((k) => k.status === 'selesai').length,
    }),
    [list]
  );

  const tersaring = useMemo(() => {
    const q = cari.trim().toLowerCase().replace(/\s+/g, " ");
    return list.filter((k) => {
      if (filter !== 'semua' && k.status !== filter) return false;
      if (!q) return true;
      const kamar = (k.nomor_kamar || '').toLowerCase();
      if (/^\d+$/.test(q)) {
        return kamar === q || kamar.endsWith(q.padStart(2, '0'));
      }
      return (
        (k.nama_penghuni || '').toLowerCase().includes(q) ||
        kamar.includes(q) ||
        (kamar !== '' && `kamar ${kamar}`.includes(q)) ||
        (k.nama_kategori || '').toLowerCase().includes(q) ||
        k.deskripsi.toLowerCase().includes(q)
      );
    });
  }, [list, filter, cari]);
  const baris = tersaring.slice((halaman - 1) * PER_HALAMAN, halaman * PER_HALAMAN);

  const buka = (k: Keluhan) => {
    setTerpilih(k);
    setStatusBaru(k.status === 'diterima' ? 'diproses' : k.status);
    setCatatan(k.catatan_tindak_lanjut || '');
  };

  const simpan = async (e: FormEvent) => {
    e.preventDefault();
    if (!terpilih) return;
    setIsSubmitting(true);
    try {
      await keluhanService.updateStatus(terpilih.id, { status: statusBaru, catatan_tindak_lanjut: catatan });
      toast.success('Status keluhan berhasil diperbarui.');
      setTerpilih(null);
      await fetchKeluhan();
    } catch (error) {
      console.error('Gagal memperbarui keluhan', error);
      toast.error('Terjadi kesalahan saat memperbarui status keluhan.');
    } finally {
      setIsSubmitting(false);
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
        crumbs={[{ label: 'Beranda', to: '/dashboard' }, { label: 'Keluhan' }]}
        title="Daftar Keluhan Penghuni"
        subtitle="Kelola dan tindak lanjuti laporan kerusakan fasilitas dari penghuni kos."
      />

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <FilterTabs
            value={filter}
            onChange={(k) => {
              setFilter(k);
              setHalaman(1);
            }}
            tabs={[
              { key: 'semua', label: 'Semua', count: hitung.semua },
              { key: 'diterima', label: 'Diterima', count: hitung.diterima },
              { key: 'diproses', label: 'Diproses', count: hitung.diproses },
              { key: 'selesai', label: 'Selesai', count: hitung.selesai },
            ]}
          />
          <SearchInput
            value={cari}
            onChange={(v) => {
              setCari(v);
              setHalaman(1);
            }}
            placeholder="Cari penghuni, kamar, kategori..."
          />
        </div>

        {tersaring.length === 0 ? (
          <EmptyState
            icon={<WarningIcon size={26} />}
            title={list.length === 0 ? 'Belum ada keluhan masuk' : 'Tidak ada keluhan pada filter ini'}
            text={list.length === 0 ? 'Laporan dari penghuni akan muncul di sini.' : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50/70">
                <tr>
                  <th className={thCls}>Tanggal</th>
                  <th className={thCls}>Penghuni / Kamar</th>
                  <th className={thCls}>Kategori &amp; Deskripsi</th>
                  <th className={thCls}>Status</th>
                  <th className={thCls}>Catatan Pengurus</th>
                  <th className={`${thCls} text-right`}>Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {baris.map((k) => (
                  <tr key={k.id} className="align-top transition hover:bg-slate-50/70">
                    <td className={`${tdCls} whitespace-nowrap text-ink-soft`}>{tglPendek(k.tanggal_kirim)}</td>
                    <td className={tdCls}>
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-kos-100/70 text-xs font-bold text-kos-700">
                          {inisial(k.nama_penghuni || '?')}
                        </span>
                        <div>
                          <p className="font-semibold">{k.nama_penghuni || '-'}</p>
                          <p className="text-xs text-ink-soft">Kamar {k.nomor_kamar || '-'}</p>
                        </div>
                      </div>
                    </td>
                    <td className={`${tdCls} max-w-xs`}>
                      <span className="rounded-md bg-violet-50 px-2 py-0.5 text-xs font-semibold text-violet-700">{k.nama_kategori || 'Umum'}</span>
                      <p className="mt-1.5 line-clamp-2 text-ink-soft">{k.deskripsi}</p>
                      {k.foto && (
                        <a href={k.foto} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs font-semibold text-kos-700 hover:underline">
                          Lihat foto
                        </a>
                      )}
                    </td>
                    <td className={tdCls}>
                      <StatusPill status={k.status} />
                    </td>
                    <td className={`${tdCls} max-w-[220px] text-ink-soft`}>
                      {k.catatan_tindak_lanjut || <span className="italic text-slate-400">Belum ditindaklanjuti</span>}
                    </td>
                    <td className={`${tdCls} text-right`}>
                      <button type="button" onClick={() => buka(k)} className={`${btnOutline} h-9 text-[13px]`}>
                        Tindak Lanjut
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination total={tersaring.length} page={halaman} perPage={PER_HALAMAN} onChange={setHalaman} />
      </section>

      <Modal
        open={!!terpilih}
        onClose={() => setTerpilih(null)}
        title="Update Tindak Lanjut"
        description={terpilih ? `Laporan dari ${terpilih.nama_penghuni ?? '-'} (Kamar ${terpilih.nomor_kamar ?? '-'})` : undefined}
      >
        {terpilih && (
          <form onSubmit={simpan} className="space-y-4">
            <div className="rounded-2xl bg-slate-50 p-4 text-sm leading-relaxed text-ink">
              <span className="mb-1.5 inline-block rounded-md bg-violet-50 px-2 py-0.5 text-xs font-semibold text-violet-700">{terpilih.nama_kategori || 'Umum'}</span>
              <p>{terpilih.deskripsi}</p>
              {terpilih.foto && (
                <a href={terpilih.foto} target="_blank" rel="noreferrer">
                  <img src={terpilih.foto} alt="Foto keluhan" className="mt-3 max-h-40 rounded-xl object-cover ring-1 ring-slate-200" />
                </a>
              )}
            </div>

            <fieldset>
              <legend className={labelCls}>Status Penanganan</legend>
              <div className="grid grid-cols-3 gap-2">
                {PILIHAN.map((p) => (
                  <label
                    key={p.key}
                    className={`cursor-pointer rounded-xl border px-3 py-2.5 text-center text-[13px] font-semibold transition ${
                      statusBaru === p.key ? 'border-kos-600 bg-kos-100/50 text-kos-700 ring-1 ring-kos-600' : 'border-slate-200 text-ink-soft hover:border-slate-300'
                    }`}
                  >
                    <input type="radio" name="status" value={p.key} checked={statusBaru === p.key} onChange={() => setStatusBaru(p.key)} className="sr-only" />
                    {p.label}
                  </label>
                ))}
              </div>
            </fieldset>

            <div>
              <label htmlFor="catatan" className={labelCls}>Catatan untuk Penghuni</label>
              <textarea id="catatan" rows={3} value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Contoh: Teknisi dijadwalkan datang besok pukul 10.00 WIB..." className={inputCls} />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setTerpilih(null)} className={btnOutline}>Batal</button>
              <button type="submit" disabled={isSubmitting} className={btnPrimary}>{isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
