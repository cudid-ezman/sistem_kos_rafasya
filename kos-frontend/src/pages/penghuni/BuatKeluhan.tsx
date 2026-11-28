import { useEffect, useState, type FormEvent } from 'react';
import { Atap } from '../../components/admin/DashboardParts';
import { Link, useNavigate } from 'react-router-dom';
import { keluhanService } from '../../services/keluhanService';
import type { KategoriKeluhan } from '../../types/kos';
import { usePortal } from '../../components/portal/portalContext';
import { useToast } from '../../components/portal/toastContext';
import PageHeader from '../../components/portal/PageHeader';
import Dropzone from '../../components/portal/Dropzone';
import { btnOutline, btnPrimary } from '../../components/portal/buttons';
import { ArrowRightIcon, WarningIcon, XIcon } from '../../components/portal/icons';

const MAKS = 500;
const KATEGORI_BARU = '__custom__';

export default function BuatKeluhan() {
  const navigate = useNavigate();
  const toast = useToast();
  const { reload } = usePortal();

  const [kategori, setKategori] = useState<KategoriKeluhan[]>([]);
  const [kategoriId, setKategoriId] = useState('');
  const [kategoriBaru, setKategoriBaru] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [foto, setFoto] = useState<File | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [kirim, setKirim] = useState(false);

  useEffect(() => {
    keluhanService
      .getKategori()
      .then((r) => setKategori(r.data))
      .catch(() => toast.error('Daftar kategori belum bisa dimuat.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isCustom = kategoriId === KATEGORI_BARU;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if ((!kategoriId || (isCustom && !kategoriBaru.trim())) || !deskripsi.trim()) {
      setGalat('Kategori dan deskripsi wajib diisi');
      return;
    }
    setGalat(null);
    setKirim(true);

    const fd = new FormData();
    if (isCustom) {
      fd.append('kategori_custom', kategoriBaru.trim());
    } else {
      fd.append('kategori', kategoriId);
    }
    fd.append('deskripsi', deskripsi.trim());
    if (foto) fd.append('foto', foto);

    try {
      await keluhanService.create(fd);
      await reload();
      toast.success('Keluhan berhasil dikirim. Pengurus akan segera menindaklanjuti.');
      navigate('/dashboard/keluhan-saya', { replace: true });
    } catch (err) {
      console.error('Gagal mengirim keluhan', err);
      setGalat('Keluhan belum terkirim. Periksa isianmu lalu coba lagi.');
    } finally {
      setKirim(false);
    }
  };

  const fieldCls =
    'w-full rounded-lg border border-field-line bg-field px-4 text-sm text-ink outline-none transition placeholder:text-slate-400 focus:border-kos-600 focus:ring-2 focus:ring-kos-600/20';

  return (
    <div>
      <PageHeader
        crumbs={[{ label: 'Keluhan', to: '/dashboard/keluhan-saya' }, { label: 'Buat Keluhan' }]}
        title="Buat Keluhan"
        subtitle="Sampaikan kendala fasilitas agar segera ditangani pengurus."
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <form onSubmit={submit} noValidate className="overflow-hidden rounded-2xl border border-field-line bg-field p-5 sm:p-8">
        <Atap className="-mx-5 -mt-5 mb-5 shrink-0 sm:-mx-8 sm:-mt-8 sm:mb-8" />
        {galat && (
          <div role="alert" className="mb-6 flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
            <WarningIcon size={18} className="shrink-0" />
            <span className="flex-1">{galat}</span>
            <button type="button" onClick={() => setGalat(null)} aria-label="Tutup pesan" className="cursor-pointer opacity-70 hover:opacity-100">
              <XIcon size={16} />
            </button>
          </div>
        )}

        <div className="space-y-6">
          <div>
            <label htmlFor="kategori" className="mb-1.5 block text-xs font-bold text-ink">
              Kategori <span className="text-rose-600">*</span>
            </label>
            <select
              id="kategori"
              value={kategoriId}
              onChange={(e) => setKategoriId(e.target.value)}
              className={`${fieldCls} h-12 ${kategoriId ? '' : 'text-slate-400'} ${galat && !kategoriId ? 'border-rose-300' : ''}`}
            >
              <option value="">Pilih Kategori...</option>
              {kategori.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nama}
                </option>
              ))}
              <option value={KATEGORI_BARU}>+ Buat Kategori Baru...</option>
            </select>

            {isCustom && (
              <div className="mt-3">
                <input
                  type="text"
                  maxLength={80}
                  value={kategoriBaru}
                  onChange={(e) => setKategoriBaru(e.target.value)}
                  placeholder="Tulis nama kategori baru (contoh: Kunci Pintu, Wastafel, Lemari)..."
                  className={`${fieldCls} h-11 ${galat && !kategoriBaru.trim() ? 'border-rose-300' : ''}`}
                />
                <p className="mt-1 text-xs text-ink-soft">Kategori baru akan tersimpan otomatis untuk laporan berikutnya.</p>
              </div>
            )}
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="deskripsi" className="text-xs font-bold text-ink">
                Deskripsi <span className="text-rose-600">*</span>
              </label>
              <span className={`text-xs tabular-nums ${deskripsi.length >= MAKS ? 'font-semibold text-rose-600' : 'text-ink-soft'}`}>
                {deskripsi.length} / {MAKS} karakter
              </span>
            </div>
            <textarea
              id="deskripsi"
              rows={5}
              maxLength={MAKS}
              value={deskripsi}
              onChange={(e) => setDeskripsi(e.target.value)}
              placeholder="Jelaskan kendala secara rinci (misal: lokasi kerusakan, sejak kapan terjadi, dan dampaknya)..."
              className={`${fieldCls} resize-y py-3 leading-relaxed ${galat && !deskripsi.trim() ? 'border-rose-300' : ''}`}
            />
          </div>

          <div>
            <p className="mb-1.5 text-xs font-bold text-ink">
              Foto <span className="font-medium text-ink-soft normal-case">(opsional)</span>
            </p>
            <Dropzone file={foto} onChange={setFoto} title="Klik untuk mengunggah atau seret file ke area ini" />
          </div>
        </div>

        <div className="mt-8 flex justify-end gap-3 border-t border-field-line pt-5">
          <Link to="/dashboard/keluhan-saya" className={btnOutline}>
            Batal
          </Link>
          <button type="submit" disabled={kirim} className={btnPrimary}>
            {kirim ? (
              'Mengirim...'
            ) : (
              <>
                Kirim <ArrowRightIcon size={16} />
              </>
            )}
          </button>
        </div>
      </form>

      <aside className="overflow-hidden rounded-2xl border border-field-line bg-cream/50 p-5 lg:sticky lg:top-40">
        <Atap className="-mx-5 -mt-5 mb-5 shrink-0" />
        <h2 className="text-base font-bold text-ink">Biar cepat ditangani</h2>
        <ul className="mt-3 space-y-3 text-sm leading-relaxed text-ink-soft">
          <li>Sebut lokasinya dengan jelas, misalnya kamar mandi kamar A12 atau lorong blok A.</li>
          <li>Tulis sejak kapan terjadi, dan seberapa mengganggu.</li>
          <li>Lampirkan foto kalau ada, supaya pengurus bisa menyiapkan alat yang pas.</li>
        </ul>
        <p className="mt-4 border-t border-field-line pt-4 text-[13px] text-ink-soft">
          Setelah terkirim, statusnya bisa kamu pantau di menu Keluhan.
        </p>
      </aside>
      </div>
    </div>
  );
}
