import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { keISO, parseTanggal } from './format';
import { awalHari, MODE_VALID, type ModePeriode } from './periode';

/** Filter periode yang tersimpan di URL (?mode=bulan&tgl=2026-11-18) agar tetap ada saat refresh / pindah halaman. */
export function usePeriode() {
  const [params, setParams] = useSearchParams();
  const modeParam = params.get('mode');
  const tglParam = params.get('tgl');

  const mode: ModePeriode = MODE_VALID.includes(modeParam as ModePeriode) ? (modeParam as ModePeriode) : 'semua';

  const anchor = useMemo(
    () => (tglParam && /^\d{4}-\d{2}-\d{2}$/.test(tglParam) ? parseTanggal(tglParam) : awalHari(new Date())),
    [tglParam]
  );

  const ubah = useCallback(
    (modeBaru: ModePeriode, anchorBaru: Date) => {
      setParams(modeBaru === 'semua' ? {} : { mode: modeBaru, tgl: keISO(anchorBaru) }, { replace: true });
    },
    [setParams]
  );

  const query = mode === 'semua' ? '' : `?mode=${mode}&tgl=${keISO(anchor)}`;

  return { mode, anchor, ubah, query };
}
