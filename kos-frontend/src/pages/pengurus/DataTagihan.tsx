import { useEffect, useMemo, useState, type FormEvent } from 'react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';
import { tagihanService } from '../../services/tagihanService';
import type { Tagihan } from '../../types/kos';
import { hitungDenda, inisial, periodeSekarang, rupiah, statusTampil, tglPendek } from '../../lib/format';
import PageHeader from '../../components/portal/PageHeader';
import StatusPill from '../../components/portal/StatusPill';
import { Skeleton } from '../../components/portal/Skeleton';
import { useToast } from '../../components/portal/toastContext';
import { btnOutline, btnPrimary } from '../../components/portal/buttons';
import { PlusIcon, ReceiptIcon } from '../../components/portal/icons';
import Modal from '../../components/admin/Modal';
import Pagination from '../../components/admin/Pagination';
import SearchInput from '../../components/admin/SearchInput';
import FilterTabs from '../../components/admin/FilterTabs';
import EmptyState from '../../components/admin/EmptyState';
import { inputCls, labelCls, tdCls, thCls } from '../../components/admin/styles';

type Filter = 'semua' | 'belum_dibayar' | 'terlambat' | 'menunggu_verifikasi' | 'lunas' | 'ditolak';
const PER_HALAMAN = 10;

export default function DataTagihan() {
  const toast = useToast();
  const [params] = useSearchParams();
  const [list, setList] = useState<Tagihan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('semua');
  const [cari, setCari] = useState(params.get('cari') ?? '');
  const [halaman, setHalaman] = useState(1);

  const [genOpen, setGenOpen] = useState(false);
  const [periode, setPeriode] = useState(periodeSekarang());
  const [isGenerating, setIsGenerating] = useState(false);

  const fetchTagihan = async () => {
    try {
      const res = await tagihanService.getAll();
      setList(res.data);
    } catch (error) {
      console.error('Gagal mengambil data tagihan', error);
      toast.error('Data tagihan belum bisa dimuat.');
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
    const m: Record<Filter, number> = { semua: list.length, belum_dibayar: 0, terlambat: 0, menunggu_verifikasi: 0, lunas: 0, ditolak: 0 };
    list.forEach((t) => {
      m[statusTampil(t)] += 1;
    });
    return m;
  }, [list]);

  const totalLunas = useMemo(() => list.filter((t) => t.status === 'lunas').reduce((s, t) => s + Number(t.nominal || 0), 0), [list]);

  const tersaring = useMemo(() => {
    const q = cari.trim().toLowerCase();
    return list.filter((t) => {
      if (filter !== 'semua' && statusTampil(t) !== filter) return false;
      if (!q) return true;
      return (
        (t.nama_penghuni || '').toLowerCase().includes(q) ||
        (t.nomor_kamar || '').toLowerCase().includes(q) ||
        t.periode.toLowerCase().includes(q)
      );
    });
  }, [list, filter, cari]);
  const baris = tersaring.slice((halaman - 1) * PER_HALAMAN, halaman * PER_HALAMAN);

  const generate = async (e: FormEvent) => {
    e.preventDefault();
    if (!periode.trim()) return;
    setIsGenerating(true);
    try {
      const res = await tagihanService.generateBulanan(periode.trim());
      toast.success(res.data?.detail || 'Tagihan bulanan berhasil dibuat.');
      setGenOpen(false);
      await fetchTagihan();
    } catch (error) {
      console.error('Gagal generate tagihan', error);
      const pesan = axios.isAxiosError(error) ? error.response?.data?.detail : null;
      toast.error(pesan || 'Generate tagihan gagal. Coba lagi.');
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
        crumbs={[{ label: 'Beranda', to: '/dashboard' }, { label: 'Data Tagihan' }]}
        title="Manajemen Tagihan Sewa"
        subtitle="Pantau seluruh tagihan penghuni dan terbitkan tagihan bulanan secara otomatis."
        action={
          <button type="button" onClick={() => setGenOpen(true)} className={btnPrimary}>
            <PlusIcon size={17} /> Generate Tagihan Bulanan
          </button>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Total Lunas', rupiah(totalLunas), 'text-emerald-600'],
          ['Belum Dibayar', hitung.belum_dibayar, 'text-amber-600'],
          ['Terlambat', hitung.terlambat, 'text-rose-600'],
          ['Menunggu Verifikasi', hitung.menunggu_verifikasi, 'text-sky-600'],
        ].map(([label, nilai, warna]) => (
          <div key={label as string} className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
            <p className="text-xs text-ink-soft">{label}</p>
            <p className={`mt-0.5 text-2xl font-bold tabular-nums ${warna}`}>{nilai}</p>
          </div>
        ))}
      </div>

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
              { key: 'belum_dibayar', label: 'Belum Bayar', count: hitung.belum_dibayar },
              { key: 'terlambat', label: 'Terlambat', count: hitung.terlambat },
              { key: 'menunggu_verifikasi', label: 'Menunggu', count: hitung.menunggu_verifikasi },
              { key: 'lunas', label: 'Lunas', count: hitung.lunas },
              { key: 'ditolak', label: 'Ditolak', count: hitung.ditolak },
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
            title={list.length === 0 ? 'Belum ada tagihan' : 'Tidak ada tagihan pada filter ini'}
            text={list.length === 0 ? 'Gunakan tombol Generate Tagihan Bulanan untuk menerbitkan tagihan seluruh penghuni aktif.' : undefined}
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
                  const nama = t.nama_penghuni || t.penghuni?.nama_lengkap || '-';
                  return (
                    <tr key={t.id} className="transition hover:bg-slate-50/70">
                      <td className={tdCls}>
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-kos-100/70 text-xs font-bold text-kos-700">{inisial(nama)}</span>
                          <span className="font-semibold">{nama}</span>
                        </div>
                      </td>
                      <td className={`${tdCls} font-semibold`}>{t.nomor_kamar || t.penghuni?.kamar?.nomor_kamar || '-'}</td>
                      <td className={`${tdCls} capitalize`}>{t.periode}</td>
                      <td className={`${tdCls} tabular-nums`}>
                        <p className="font-semibold">{rupiah(t.nominal)}</p>
                        {denda > 0 && <p className="text-[11px] font-medium text-orange-600">+ denda {rupiah(denda)}</p>}
                      </td>
                      <td className={`${tdCls} whitespace-nowrap text-ink-soft`}>{tglPendek(t.jatuh_tempo)}</td>
                      <td className={tdCls}>
                        <StatusPill status={statusTampil(t)} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <Pagination total={tersaring.length} page={halaman} perPage={PER_HALAMAN} onChange={setHalaman} />
      </section>

      <Modal open={genOpen} onClose={() => setGenOpen(false)} title="Generate Tagihan Bulanan" description="Tagihan diterbitkan untuk semua penghuni aktif yang memiliki kamar.">
        <form onSubmit={generate} className="space-y-4">
          <div>
            <label htmlFor="periode" className={labelCls}>Periode Tagihan</label>
            <input id="periode" required value={periode} onChange={(e) => setPeriode(e.target.value)} placeholder="Contoh: Desember 2026" className={inputCls} />
            <p className="mt-1.5 text-xs text-ink-soft">Jatuh tempo otomatis 10 hari dari hari ini. Kamar berdua ditagihkan separuh harga per penghuni.</p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setGenOpen(false)} className={btnOutline}>Batal</button>
            <button type="submit" disabled={isGenerating || !periode.trim()} className={btnPrimary}>{isGenerating ? 'Memproses...' : 'Terbitkan Tagihan'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
