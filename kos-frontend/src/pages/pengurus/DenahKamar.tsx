import { useState } from 'react';

type StatusKamar = 'kosong' | 'lunas' | 'menunggu' | 'belum' | 'terlambat';

interface KamarDenah {
  id: string;
  blok: string;
  nomor: number;
  tipe: 'individu' | 'berdua';
  harga: number;
  status: StatusKamar;
  adaKeluhan: boolean;
}

// Konfigurasi blok sesuai PDF
const BLOK_CONFIG = [
  { blok: 'A', jumlah: 13, tipe: 'berdua' as const },
  { blok: 'B', jumlah: 14, tipe: 'individu' as const },
  { blok: 'C', jumlah: 14, tipe: 'berdua' as const },
  { blok: 'D', jumlah: 4,  tipe: 'individu' as const },
];

const HARGA: Record<string, number> = { berdua: 750000, individu: 550000 };

// Generate semua kamar KOSONG, urutan dari nomor 1 (bawah) ke nomor tertinggi (atas)
function buatKamarKosong(): KamarDenah[] {
  const list: KamarDenah[] = [];
  BLOK_CONFIG.forEach(({ blok, jumlah, tipe }) => {
    for (let n = 1; n <= jumlah; n++) {
      list.push({
        id: `${blok}${String(n).padStart(2, '0')}`,
        blok,
        nomor: n,
        tipe,
        harga: HARGA[tipe],
        status: 'kosong',
        adaKeluhan: false,
      });
    }
  });
  return list;
}

// Style per status (warna sesuai PDF)
const STATUS_STYLE: Record<StatusKamar, { border: string; bg: string; text: string; label: string; dot: string }> = {
  kosong:    { border: 'border-slate-200', bg: 'bg-white',          text: 'text-slate-400', label: 'Kosong',              dot: 'bg-slate-300' },
  lunas:     { border: 'border-emerald-300', bg: 'bg-emerald-50',   text: 'text-emerald-600', label: 'Lunas',               dot: 'bg-emerald-500' },
  menunggu:  { border: 'border-sky-300',   bg: 'bg-sky-50',         text: 'text-sky-600',   label: 'Menunggu Verifikasi',   dot: 'bg-sky-500' },
  belum:     { border: 'border-amber-300', bg: 'bg-amber-50',       text: 'text-amber-600', label: 'Belum Dibayar',         dot: 'bg-amber-500' },
  terlambat: { border: 'border-red-300',   bg: 'bg-red-50',         text: 'text-red-600',   label: 'Terlambat',             dot: 'bg-red-500' },
};

const LEGENDA_ORDER: StatusKamar[] = ['lunas', 'menunggu', 'belum', 'terlambat', 'kosong'];

export default function DenahKamar() {
  const [kamarList] = useState<KamarDenah[]>(buatKamarKosong());
  const [selectedId, setSelectedId] = useState<string>('A01');

  const selected = kamarList.find((k) => k.id === selectedId) ?? kamarList[0];
  const totalKamar = kamarList.length;

  // Kelompokkan per blok
  const perBlok = BLOK_CONFIG.map((cfg) => ({
    ...cfg,
    kamar: kamarList.filter((k) => k.blok === cfg.blok),
  }));

  return (
    <div className="space-y-4">
      {/* ══════════ HEADER + LEGENDA ══════════ */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-primary" />
            <h3 className="text-base font-bold text-slate-800">Denah Kos (1 Lantai)</h3>
            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
              Total: {totalKamar} Kamar
            </span>
          </div>
          <p className="text-xs text-slate-500">
            <span className="inline-block w-2 h-2 rounded-full bg-slate-400 mr-1" />
            Warna kotak mengikuti status tagihan terburuk di kamar.
          </p>
        </div>

        {/* Legenda Status */}
        <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-slate-100 text-xs">
          <span className="font-semibold text-slate-400 uppercase tracking-wide text-[10px]">Status Tagihan:</span>
          {LEGENDA_ORDER.map((s) => (
            <span key={s} className="flex items-center gap-1.5 text-slate-600">
              <span className={`w-2.5 h-2.5 rounded-full ${STATUS_STYLE[s].dot}`} />
              {STATUS_STYLE[s].label}
            </span>
          ))}
          <span className="flex items-center gap-1.5 text-slate-600 ml-2">
            <span className="font-semibold text-slate-400 uppercase tracking-wide text-[10px] mr-1">Penanda:</span>
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            Ada keluhan aktif
          </span>
        </div>
      </div>

      {/* ══════════ DENAH + PANEL DETAIL ══════════ */}
      <div className="flex flex-col xl:flex-row gap-4">
        {/* KIRI: DENAH */}
        <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex justify-center gap-1 overflow-x-auto pb-4">
            {perBlok.map((blokCfg, idx) => {
              // Blok B dan C berdempetan (tidak ada lorong)
              const prevBlok = idx > 0 ? perBlok[idx - 1].blok : null;
              const isBerdempetan = (prevBlok === 'B' && blokCfg.blok === 'C');
              const showLorong = idx > 0 && !isBerdempetan;

              return (
                <div key={blokCfg.blok} className="flex items-start gap-1">
                  {/* Lorong + Panah */}
                  {showLorong && (
                    <div className="flex flex-col items-center justify-center w-10 shrink-0 pt-8">
                      <span className="text-slate-400 text-sm mb-2">↑</span>
                      <span
                        className="text-[9px] font-semibold tracking-[0.2em] text-slate-300"
                        style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                      >
                        LORONG
                      </span>
                      <span className="text-slate-400 text-sm mt-2">↓</span>
                    </div>
                  )}

                  {/* Kolom Blok */}
                  <div className="flex flex-col items-center">
                    <span className="text-xs font-bold text-slate-600 mb-3">
                      Blok {blokCfg.blok}{' '}
                      <span className="text-slate-400 font-normal">({blokCfg.jumlah})</span>
                    </span>

                    {/* Kamar: dari nomor TERTINGGI di atas, terendah di bawah */}
                    <div className="flex flex-col gap-2 w-20">
                      {[...blokCfg.kamar]
                        .sort((a, b) => b.nomor - a.nomor) // Urutan terbalik: nomor besar di atas
                        .map((k) => {
                          const st = STATUS_STYLE[k.status];
                          const aktif = k.id === selectedId;
                          return (
                            <button
                              key={k.id}
                              onClick={() => setSelectedId(k.id)}
                              className={`relative rounded-lg border-2 ${st.border} ${st.bg} px-2 py-2 text-center transition-all cursor-pointer ${
                                aktif
                                  ? 'ring-2 ring-primary ring-offset-1 scale-[1.05] shadow-md'
                                  : 'hover:shadow-sm hover:-translate-y-0.5'
                              }`}
                            >
                              {/* Titik merah jika ada keluhan */}
                              {k.adaKeluhan && (
                                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-white" />
                              )}
                              <p className="text-[11px] font-bold text-slate-700 leading-tight">{k.id}</p>
                              <p className={`text-[9px] font-medium ${st.text} leading-tight`}>{st.label}</p>
                            </button>
                          );
                        })}
                    </div>

                    {/* Panah di bawah blok (kecuali blok terakhir) */}
                    {idx < perBlok.length - 1 && !isBerdempetan && (
                      <span className="text-slate-400 text-sm mt-2">↑</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pintu Masuk */}
          <div className="flex justify-center mt-4 pt-3 border-t border-slate-100">
            <span className="flex items-center gap-2 text-xs text-slate-400">
              <span className="text-slate-500">↑</span> Pintu Masuk
            </span>
          </div>
        </div>

        {/* KANAN: DETAIL KAMAR TERPILIH */}
        <div className="w-full xl:w-80 shrink-0 bg-white rounded-xl border border-slate-200 shadow-sm p-5 h-fit">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              Detail Kamar Terpilih
            </span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
              selected.status === 'kosong' ? 'bg-slate-100 text-slate-500' : `${STATUS_STYLE[selected.status].bg} ${STATUS_STYLE[selected.status].text}`
            }`}>
              {STATUS_STYLE[selected.status].label}
            </span>
          </div>

          <h4 className="text-lg font-bold text-slate-800 leading-snug">
            Kamar {selected.id} • Blok {selected.blok}
          </h4>
          <p className="text-sm text-slate-500 mt-1 capitalize">
            Kamar {selected.tipe === 'berdua' ? 'Berdua' : 'Individu'} • Rp {selected.harga.toLocaleString('id-ID')} / Bulan
          </p>

          {/* Empty State: Kamar Kosong */}
          <div className="mt-5 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-slate-600">Kamar ini belum dihuni</p>
            <p className="text-xs text-slate-400 mt-1 mb-4">
              Silakan tambahkan penghuni untuk memulai pencatatan tagihan.
            </p>
            <button className="w-full px-4 py-2.5 text-sm font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg transition cursor-pointer shadow-sm">
              + Tambah Penghuni
            </button>
            <button className="mt-2 w-full px-4 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition cursor-pointer">
              Lihat Riwayat Kamar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}