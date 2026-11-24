import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { keluhanService } from '../../services/keluhanService';
import type { KategoriKeluhan, Keluhan } from '../../types/kos';
import { inisial, rupiah, tglPendek } from '../../lib/format';
import PageHeader from '../../components/portal/PageHeader';
import StatusPill from '../../components/portal/StatusPill';
import { Skeleton } from '../../components/portal/Skeleton';
import { useToast } from '../../components/portal/toastContext';
import { btnOutline, btnPrimary } from '../../components/portal/buttons';
import { PlusIcon, WarningIcon } from '../../components/portal/icons';
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

const BADGE_PEMILIK: Record<string, { label: string; cls: string }> = {
  menunggu: { label: 'Menunggu Pemilik', cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
  dicairkan: { label: 'Dana Dicairkan', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  dicairkan_sebagian: { label: 'Dicairkan Sebagian', cls: 'bg-sky-50 text-sky-700 ring-sky-200' },
  ditolak: { label: 'Ditolak Pemilik', cls: 'bg-rose-50 text-rose-700 ring-rose-200' },
};

export default function DaftarKeluhan() {
  const toast = useToast();
  const [params] = useSearchParams();
  const [list, setList] = useState<Keluhan[]>([]);
  const [kategoriList, setKategoriList] = useState<KategoriKeluhan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('semua');
  const [cari, setCari] = useState(params.get('cari') ?? '');
  const [halaman, setHalaman] = useState(1);

  const [terpilih, setTerpilih] = useState<Keluhan | null>(null);
  const [statusBaru, setStatusBaru] = useState<Status>('diproses');
  const [kategoriId, setKategoriId] = useState<string>('');
  const [deskripsiEdit, setDeskripsiEdit] = useState('');
  const [catatan, setCatatan] = useState('');
  const [eskalasiPemilik, setEskalasiPemilik] = useState(false);
  const [ajukanDana, setAjukanDana] = useState(false);
  const [nominalPengajuan, setNominalPengajuan] = useState('');
  const [catatanPengajuan, setCatatanPengajuan] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State modal kelola kategori
  const [bukaKategori, setBukaKategori] = useState(false);
  const [namaKatBaru, setNamaKatBaru] = useState('');
  const [editKatId, setEditKatId] = useState<number | null>(null);
  const [editKatNama, setEditKatNama] = useState('');
  const [prosesKat, setProsesKat] = useState(false);

  const fetchKeluhan = async () => {
    try {
      const [res, kat] = await Promise.all([keluhanService.getAll(), keluhanService.getKategori()]);
      setList(res.data);
      setKategoriList(kat.data);
    } catch (error) {
      console.error('Gagal mengambil daftar keluhan', error);
      toast.error('Daftar keluhan belum bisa dimuat.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
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
    const q = cari.trim().toLowerCase().replace(/\s+/g, ' ');
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
    setKategoriId(k.kategori ? String(k.kategori) : '');
    setDeskripsiEdit(k.deskripsi || '');
    setCatatan(k.catatan_tindak_lanjut || '');
    setEskalasiPemilik(Boolean(k.dieskalasi_pemilik));
    const nom = Number(k.nominal_pengajuan || 0);
    setAjukanDana(nom > 0);
    setNominalPengajuan(nom > 0 ? String(Math.round(nom)) : '');
    setCatatanPengajuan(k.catatan_pengajuan || '');
  };

  const simpan = async (e: FormEvent) => {
    e.preventDefault();
    if (!terpilih) return;
    if (!deskripsiEdit.trim()) {
      toast.error('Deskripsi keluhan tidak boleh kosong.');
      return;
    }

    const bolehEskalasi = statusBaru !== 'selesai';
    const aktifEskalasi = bolehEskalasi ? eskalasiPemilik : Boolean(terpilih.dieskalasi_pemilik);
    const nominalAngka = bolehEskalasi && eskalasiPemilik && ajukanDana ? Math.max(0, Number(nominalPengajuan || 0)) : Number(terpilih.nominal_pengajuan || 0);

    if (bolehEskalasi && eskalasiPemilik && ajukanDana && Math.max(0, Number(nominalPengajuan || 0)) <= 0) {
      toast.error('Masukkan nominal pengajuan dana yang valid atau matikan opsi pengajuan dana.');
      return;
    }

    setIsSubmitting(true);
    try {
      await keluhanService.updateStatus(terpilih.id, {
        status: statusBaru,
        kategori: kategoriId ? Number(kategoriId) : undefined,
        deskripsi: deskripsiEdit.trim(),
        catatan_tindak_lanjut: catatan,
        dieskalasi_pemilik: aktifEskalasi,
        nominal_pengajuan: bolehEskalasi ? (eskalasiPemilik && ajukanDana ? Math.max(0, Number(nominalPengajuan || 0)) : 0) : nominalAngka,
        catatan_pengajuan: bolehEskalasi ? (eskalasiPemilik ? catatanPengajuan.trim() : '') : (terpilih.catatan_pengajuan || ''),
      });
      toast.success(
        bolehEskalasi && eskalasiPemilik
          ? 'Tindak lanjut disimpan & keluhan diteruskan ke Pemilik Kos.'
          : 'Status keluhan berhasil diperbarui.'
      );
      setTerpilih(null);
      await fetchKeluhan();
    } catch (error) {
      console.error('Gagal memperbarui keluhan', error);
      toast.error('Terjadi kesalahan saat memperbarui status keluhan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const tambahKategori = async (e: FormEvent) => {
    e.preventDefault();
    if (!namaKatBaru.trim()) return;
    setProsesKat(true);
    try {
      await keluhanService.createKategori(namaKatBaru.trim());
      setNamaKatBaru('');
      toast.success('Kategori keluhan ditambahkan.');
      await fetchKeluhan();
    } catch {
      toast.error('Gagal menambahkan kategori.');
    } finally {
      setProsesKat(false);
    }
  };

  const simpanEditKategori = async (id: number) => {
    if (!editKatNama.trim()) return;
    setProsesKat(true);
    try {
      await keluhanService.updateKategori(id, editKatNama.trim());
      setEditKatId(null);
      toast.success('Nama kategori diperbarui.');
      await fetchKeluhan();
    } catch {
      toast.error('Gagal mengubah kategori.');
    } finally {
      setProsesKat(false);
    }
  };

  const hapusKategori = async (kat: KategoriKeluhan) => {
    if (!window.confirm(`Hapus kategori "${kat.nama}"? Keluhan lama dengan kategori ini tetap aman.`)) return;
    setProsesKat(true);
    try {
      await keluhanService.deleteKategori(kat.id);
      toast.success('Kategori dihapus.');
      await fetchKeluhan();
    } catch {
      toast.error('Gagal menghapus kategori.');
    } finally {
      setProsesKat(false);
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
        subtitle="Kelola, rapikan laporan kerusakan, dan teruskan pengajuan perbaikan ke pemilik kos bila diperlukan."
        action={
          <button type="button" onClick={() => setBukaKategori(true)} className={btnOutline}>
            <PlusIcon size={16} /> Kelola Kategori ({kategoriList.length})
          </button>
        }
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
                  <th className={thCls}>Status &amp; Eskalasi</th>
                  <th className={thCls}>Catatan / Pencairan</th>
                  <th className={`${thCls} text-right`}>Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {baris.map((k) => {
                  const badgePemilik = k.dieskalasi_pemilik && k.status_pemilik ? BADGE_PEMILIK[k.status_pemilik] : null;
                  return (
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
                        <div className="flex flex-col items-start gap-1.5">
                          <StatusPill status={k.status} />
                          {badgePemilik && (
                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${badgePemilik.cls}`}>
                              {badgePemilik.label}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className={`${tdCls} max-w-[240px] text-ink-soft`}>
                        <p>{k.catatan_tindak_lanjut || <span className="italic text-slate-400">Belum ditindaklanjuti</span>}</p>
                        {k.dieskalasi_pemilik && (
                          <div className="mt-1.5 rounded-lg bg-slate-50 p-2 text-xs">
                            <p className="font-semibold text-ink">
                              Ajuan: {Number(k.nominal_pengajuan || 0) > 0 ? rupiah(k.nominal_pengajuan || 0) : 'Tanpa dana'}
                            </p>
                            {Number(k.nominal_pencairan || 0) > 0 && (
                              <p className="font-semibold text-emerald-700">
                                Cair: {rupiah(k.nominal_pencairan || 0)}
                              </p>
                            )}
                            {k.catatan_pemilik && <p className="mt-0.5 text-[11px] text-ink-soft">Pemilik: {k.catatan_pemilik}</p>}
                          </div>
                        )}
                      </td>
                      <td className={`${tdCls} text-right`}>
                        <button type="button" onClick={() => buka(k)} className={`${btnOutline} h-9 text-[13px]`}>
                          Tindak Lanjut
                        </button>
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

      {/* Modal Tindak Lanjut */}
      <Modal
        open={!!terpilih}
        onClose={() => setTerpilih(null)}
        title="Tindak Lanjut & Eskalasi Keluhan"
        description={terpilih ? `Laporan dari ${terpilih.nama_penghuni ?? '-'} (Kamar ${terpilih.nomor_kamar ?? '-'})` : undefined}
      >
        {terpilih && (
          <form onSubmit={simpan} className="space-y-4">
            {terpilih.foto && (
              <div className="rounded-2xl bg-slate-50 p-3">
                <a href={terpilih.foto} target="_blank" rel="noreferrer">
                  <img src={terpilih.foto} alt="Foto keluhan" className="max-h-44 w-full rounded-xl object-cover ring-1 ring-slate-200" />
                </a>
                <p className="mt-1.5 text-[11px] text-ink-soft">Klik gambar untuk membuka ukuran penuh.</p>
              </div>
            )}

            <fieldset>
              <legend className={labelCls}>Status Penanganan</legend>
              <div className="grid grid-cols-3 gap-2.5">
                {PILIHAN.map((p) => (
                  <label
                    key={p.key}
                    className={`flex cursor-pointer items-center justify-center rounded-xl border px-3 py-2.5 text-center text-[13px] font-semibold transition ${
                      statusBaru === p.key ? 'border-kos-600 bg-kos-100/50 text-kos-700 ring-1 ring-kos-600' : 'border-slate-200 text-ink-soft hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="status"
                      value={p.key}
                      checked={statusBaru === p.key}
                      onChange={() => {
                        setStatusBaru(p.key);
                        if (p.key === 'selesai' && (!catatan.trim() || catatan.trim().toLowerCase().includes('proses') || catatan.trim().toLowerCase().includes('diajukan'))) {
                          setCatatan('Kendala telah selesai ditangani.');
                        } else if (p.key === 'diproses' && (!catatan.trim() || catatan.trim() === 'Kendala telah selesai ditangani.')) {
                          setCatatan('Sedang dalam pengecekan dan penanganan pengurus.');
                        }
                      }}
                      className="sr-only"
                    />
                    <span>{p.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div>
              <label htmlFor="edit-kat" className={labelCls}>Kategori Keluhan</label>
              <select
                id="edit-kat"
                value={kategoriId}
                onChange={(e) => setKategoriId(e.target.value)}
                className={inputCls}
              >
                {kategoriList.map((kat) => (
                  <option key={kat.id} value={kat.id}>
                    {kat.nama}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="edit-desk" className={labelCls}>Deskripsi Keluhan (Dapat dirapikan pengurus)</label>
              <textarea
                id="edit-desk"
                rows={3}
                value={deskripsiEdit}
                onChange={(e) => setDeskripsiEdit(e.target.value)}
                className={inputCls}
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <label htmlFor="catatan" className={`${labelCls} mb-0`}>Catatan untuk Penghuni</label>
                <div className="flex flex-wrap gap-1.5">
                  {(statusBaru === 'selesai'
                    ? ['Kendala telah selesai ditangani.', 'Perbaikan sudah selesai dilakukan.']
                    : ['Sedang dalam penanganan pengurus.', 'Menunggu kedatangan teknisi.']
                  ).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setCatatan(preset)}
                      className="cursor-pointer rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-ink-soft transition hover:bg-kos-100/70 hover:text-kos-700"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                id="catatan"
                rows={2}
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder="Contoh: Teknisi dijadwalkan datang besok pukul 10.00 WIB..."
                className={inputCls}
              />
            </div>

            {/* Bagian Eskalasi ke Pemilik hanya tampil jika status Diterima atau Diproses */}
            {statusBaru !== 'selesai' ? (
              <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={eskalasiPemilik}
                    disabled={Boolean(
                      terpilih.status_pemilik &&
                        ['dicairkan', 'dicairkan_sebagian', 'ditolak'].includes(terpilih.status_pemilik)
                    )}
                    onChange={(e) => setEskalasiPemilik(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-kos-600 focus:ring-kos-600 disabled:opacity-60"
                  />
                  <div>
                    <span className="text-sm font-bold text-ink">Teruskan keluhan ini ke Pemilik Kos</span>
                    <p className="text-xs text-ink-soft">
                      Kirim foto bukti, kategori, deskripsi yang sudah dirapikan, serta pengajuan anggaran perbaikan jika dibutuhkan.
                    </p>
                  </div>
                </label>

                {eskalasiPemilik && (
                  <div className="space-y-3 border-t border-slate-200 pt-3">
                    <label className="flex cursor-pointer items-center gap-2.5 text-xs font-semibold text-ink">
                      <input
                        type="checkbox"
                        checked={ajukanDana}
                        onChange={(e) => {
                          setAjukanDana(e.target.checked);
                          if (!e.target.checked) setNominalPengajuan('');
                        }}
                        className="h-4 w-4 rounded border-slate-300 text-kos-600 focus:ring-kos-600"
                      />
                      Ajukan pencairan dana perbaikan ke Pemilik
                    </label>

                    {ajukanDana ? (
                      <div>
                        <label htmlFor="nom-ajuan" className={labelCls}>Nominal Pengajuan Dana (Rp)</label>
                        <input
                          id="nom-ajuan"
                          type="number"
                          min={1000}
                          step={1000}
                          value={nominalPengajuan}
                          onChange={(e) => setNominalPengajuan(e.target.value)}
                          placeholder="Contoh: 250000"
                          className={inputCls}
                        />
                      </div>
                    ) : (
                      <p className="rounded-xl bg-white px-3 py-2 text-xs text-ink-soft ring-1 ring-slate-200">
                        Keluhan akan diteruskan ke Pemilik sebagai laporan kerusakan tanpa pengajuan dana.
                      </p>
                    )}

                    <div>
                      <label htmlFor="cat-ajuan" className={labelCls}>Rincian Kebutuhan / Catatan untuk Pemilik</label>
                      <textarea
                        id="cat-ajuan"
                        rows={2}
                        value={catatanPengajuan}
                        onChange={(e) => setCatatanPengajuan(e.target.value)}
                        placeholder="Contoh: Butuh penggantian keran shower & jasa tukang Rp 250.000..."
                        className={inputCls}
                      />
                    </div>

                    {terpilih.status_pemilik && terpilih.status_pemilik !== 'tidak_diajukan' && terpilih.status_pemilik !== 'menunggu' && (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs">
                        <p className="font-bold text-emerald-900">
                          Respon Pemilik: {BADGE_PEMILIK[terpilih.status_pemilik]?.label}
                          {Number(terpilih.nominal_pencairan || 0) > 0 ? ` (${rupiah(terpilih.nominal_pencairan || 0)})` : ''}
                        </p>
                        {terpilih.catatan_pemilik && <p className="mt-1 text-emerald-800">{terpilih.catatan_pemilik}</p>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              terpilih.dieskalasi_pemilik &&
              terpilih.status_pemilik &&
              terpilih.status_pemilik !== 'tidak_diajukan' && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-ink-soft">
                  <p className="font-semibold text-ink">
                    Arsip Eskalasi Pemilik: {BADGE_PEMILIK[terpilih.status_pemilik]?.label}
                    {Number(terpilih.nominal_pencairan || 0) > 0 ? ` • Dana cair ${rupiah(terpilih.nominal_pencairan || 0)}` : ''}
                  </p>
                  {terpilih.catatan_pemilik && <p className="mt-1">Catatan pemilik: {terpilih.catatan_pemilik}</p>}
                </div>
              )
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setTerpilih(null)} className={btnOutline}>Batal</button>
              <button type="submit" disabled={isSubmitting} className={btnPrimary}>{isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}</button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal Kelola Kategori Keluhan */}
      <Modal
        open={bukaKategori}
        onClose={() => {
          setBukaKategori(false);
          setEditKatId(null);
        }}
        title="Kelola Kategori Keluhan"
        description="Rapikan nama kategori agar daftar pilihan untuk penghuni tetap seragam dan mudah dicari."
      >
        <div className="space-y-4">
          <form onSubmit={tambahKategori} className="flex gap-2">
            <input
              type="text"
              value={namaKatBaru}
              onChange={(e) => setNamaKatBaru(e.target.value)}
              placeholder="Tambah kategori baku baru (mis. Pintu & Kunci)..."
              className={`${inputCls} flex-1`}
            />
            <button type="submit" disabled={prosesKat || !namaKatBaru.trim()} className={btnPrimary}>
              Tambah
            </button>
          </form>

          <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto rounded-2xl border border-slate-200">
            {kategoriList.map((kat) => (
              <li key={kat.id} className="flex items-center justify-between gap-2 px-4 py-2.5 text-sm">
                {editKatId === kat.id ? (
                  <div className="flex flex-1 items-center gap-2">
                    <input
                      type="text"
                      value={editKatNama}
                      onChange={(e) => setEditKatNama(e.target.value)}
                      className={`${inputCls} h-9 flex-1`}
                    />
                    <button
                      type="button"
                      disabled={prosesKat}
                      onClick={() => void simpanEditKategori(kat.id)}
                      className={`${btnPrimary} h-9 px-3 text-xs`}
                    >
                      Simpan
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditKatId(null)}
                      className={`${btnOutline} h-9 px-3 text-xs`}
                    >
                      Batal
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="font-medium text-ink">{kat.nama}</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditKatId(kat.id);
                          setEditKatNama(kat.nama);
                        }}
                        className="cursor-pointer text-xs font-semibold text-kos-700 hover:underline"
                      >
                        Ubah
                      </button>
                      <button
                        type="button"
                        disabled={prosesKat}
                        onClick={() => void hapusKategori(kat)}
                        className="cursor-pointer text-xs font-semibold text-rose-600 hover:underline"
                      >
                        Hapus
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      </Modal>
    </div>
  );
}
