import { useEffect, useMemo, useRef, useState } from 'react';
import {
  renderTemplatePesan,
  templateWaService,
  type TemplatePesanWAItem,
} from '../../services/templateWaService';
import PageHeader from '../../components/portal/PageHeader';
import { Skeleton } from '../../components/portal/Skeleton';
import { useToast } from '../../components/portal/toastContext';
import { btnOutline, btnPrimary } from '../../components/portal/buttons';
import { CheckCircleIcon } from '../../components/portal/icons';
import { labelCls } from '../../components/admin/styles';

const CONTOH_KONTEKS: Record<TemplatePesanWAItem['kode'], Record<string, string>> = {
  sambutan: {
    nama: 'Ahmad Hadid',
    kamar: 'A03',
    jatuh_tempo: '25',
    link_login: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173',
    email: 'ahmadhadid058@gmail.com',
    password: 'PasswordBaru123',
  },
  tagihan: {
    nama: 'Ahmad Hadid',
    kamar: 'A03',
    periode: 'November 2026',
    nominal: 'Rp 750.000',
    denda: 'Rp 20.000',
    total: 'Rp 770.000',
    jatuh_tempo: '25 Nov 2026',
    link_login: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173',
  },
  kuitansi: {
    nama: 'Ahmad Hadid',
    kamar: 'A03',
    periode: 'November 2026',
    nominal: 'Rp 750.000',
    denda: 'Rp 20.000',
    total: 'Rp 770.000',
    tanggal_bayar: '25/11/2026',
  },
};

export default function PengaturanTemplateWA() {
  const toast = useToast();
  const [items, setItems] = useState<TemplatePesanWAItem[]>([]);
  const [aktifKode, setAktifKode] = useState<TemplatePesanWAItem['kode']>('sambutan');
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    let batal = false;
    templateWaService
      .getAll()
      .then((res) => {
        if (batal) return;
        setItems(res.data);
        const awal: Record<string, string> = {};
        for (const item of res.data) {
          awal[item.kode] = item.isi;
        }
        setDrafts(awal);
      })
      .catch(() => toast.error('Gagal memuat template pesan WhatsApp.'))
      .finally(() => !batal && setIsLoading(false));
    return () => {
      batal = true;
    };
  }, [toast]);

  const itemAktif = useMemo(
    () => items.find((i) => i.kode === aktifKode) ?? items[0],
    [items, aktifKode],
  );

  const isiSaatIni = itemAktif ? drafts[itemAktif.kode] ?? itemAktif.isi : '';
  const adaPerubahan = itemAktif ? isiSaatIni.trim() !== itemAktif.isi.trim() : false;

  const daftarVariabel = useMemo(() => {
    if (!itemAktif?.variabel) return [];
    return itemAktif.variabel
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }, [itemAktif]);

  const pratinjau = useMemo(() => {
    if (!itemAktif) return '';
    return renderTemplatePesan(isiSaatIni, CONTOH_KONTEKS[itemAktif.kode] || {});
  }, [itemAktif, isiSaatIni]);

  const sisipkanVariabel = (token: string) => {
    if (!itemAktif) return;
    const el = textareaRef.current;
    if (!el) {
      setDrafts((prev) => ({ ...prev, [itemAktif.kode]: `${isiSaatIni} ${token}` }));
      return;
    }
    const start = el.selectionStart ?? isiSaatIni.length;
    const end = el.selectionEnd ?? isiSaatIni.length;
    const next = isiSaatIni.slice(0, start) + token + isiSaatIni.slice(end);
    setDrafts((prev) => ({ ...prev, [itemAktif.kode]: next }));
    window.requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const simpan = async () => {
    if (!itemAktif) return;
    if (!isiSaatIni.trim()) {
      toast.error('Isi template pesan tidak boleh kosong.');
      return;
    }
    setIsSaving(true);
    try {
      const res = await templateWaService.update(itemAktif.kode, isiSaatIni);
      setItems((prev) => prev.map((it) => (it.kode === res.data.kode ? res.data : it)));
      setDrafts((prev) => ({ ...prev, [res.data.kode]: res.data.isi }));
      toast.success(`Template "${res.data.judul}" berhasil disimpan.`);
    } catch {
      toast.error('Gagal menyimpan template pesan.');
    } finally {
      setIsSaving(false);
    }
  };

  const resetDefault = async () => {
    if (!itemAktif) return;
    setIsSaving(true);
    try {
      const res = await templateWaService.reset(itemAktif.kode);
      setItems((prev) => prev.map((it) => (it.kode === res.data.kode ? res.data : it)));
      setDrafts((prev) => ({ ...prev, [res.data.kode]: res.data.isi }));
      toast.success(`Template "${res.data.judul}" dikembalikan ke bawaan.`);
    } catch {
      toast.error('Gagal mereset template.');
    } finally {
      setIsSaving(false);
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
          { label: 'Beranda', to: '/dashboard' },
          { label: 'Pengaturan' },
        ]}
        title="Pengaturan"
        subtitle="Kelola template pesan WhatsApp untuk sambutan penghuni baru, pengingat tagihan, dan kuitansi pembayaran."
      />

      {/* Tab kategori template */}
      <div className="mb-5 flex flex-wrap gap-2">
        {items.map((it) => {
          const aktif = itemAktif?.kode === it.kode;
          return (
            <button
              key={it.kode}
              type="button"
              onClick={() => setAktifKode(it.kode)}
              className={`cursor-pointer rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                aktif
                  ? 'bg-kos-700 text-white shadow-sm'
                  : 'border border-field-line bg-white text-ink hover:bg-cream/60'
              }`}
            >
              {it.judul}
            </button>
          );
        })}
      </div>

      {itemAktif && (
        <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
          {/* Kolom Editor */}
          <section className="rounded-2xl border border-field-line bg-white p-6">
            <div className="mb-4 border-b border-field-line pb-4">
              <h2 className="text-base font-bold text-ink">{itemAktif.judul}</h2>
              <p className="mt-0.5 text-xs text-ink-soft">{itemAktif.deskripsi}</p>
            </div>

            <div className="mb-3">
              <span className={labelCls}>Variabel Otomatis (Klik untuk menyisipkan)</span>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {daftarVariabel.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => sisipkanVariabel(v)}
                    className="cursor-pointer rounded-lg border border-kos-200 bg-kos-50/70 px-2.5 py-1 font-mono text-xs font-semibold text-kos-700 transition hover:bg-kos-100"
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="editor-template-wa" className={labelCls}>
                Isi Pesan WhatsApp
              </label>
              <textarea
                id="editor-template-wa"
                ref={textareaRef}
                rows={11}
                value={isiSaatIni}
                onChange={(e) =>
                  setDrafts((prev) => ({ ...prev, [itemAktif.kode]: e.target.value }))
                }
                className="mt-1.5 w-full rounded-xl border border-field-line bg-cream/30 p-3.5 font-mono text-xs leading-relaxed text-ink focus:border-kos-600 focus:bg-white focus:outline-none"
              />
              <p className="mt-1.5 text-[11px] text-ink-soft">
                Gunakan tanda bintang <code>*teks*</code> untuk huruf tebal di WhatsApp.
              </p>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-field-line pt-4">
              <button
                type="button"
                disabled={isSaving}
                onClick={resetDefault}
                className={btnOutline}
              >
                Reset ke Bawaan
              </button>
              <button
                type="button"
                disabled={isSaving || !adaPerubahan}
                onClick={simpan}
                className={btnPrimary}
              >
                <CheckCircleIcon size={16} />
                {isSaving ? 'Menyimpan...' : 'Simpan Template'}
              </button>
            </div>
          </section>

          {/* Kolom Pratinjau WhatsApp */}
          <section className="rounded-2xl border border-field-line bg-white p-6">
            <h3 className="text-sm font-bold text-ink">Pratinjau Pesan WhatsApp</h3>
            <p className="mt-0.5 text-xs text-ink-soft">
              Simulasi tampilan pesan yang diterima penghuni di WhatsApp.
            </p>

            <div className="mt-4 rounded-2xl bg-[#ECE5DD] p-4">
              <div className="ml-auto max-w-full rounded-2xl rounded-tr-sm bg-[#DCF8C6] p-3.5 text-xs leading-relaxed text-slate-800 shadow-sm">
                <pre className="whitespace-pre-wrap font-sans">{pratinjau}</pre>
                <p className="mt-1.5 text-right text-[10px] text-slate-500">10:30 ✓✓</p>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
