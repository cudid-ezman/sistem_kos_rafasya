import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { tagihanService } from "../../services/tagihanService";
import { keluhanService } from "../../services/keluhanService";
import type { UserProfile } from "../../types/auth";
import type { BuktiPembayaran, Keluhan, Tagihan } from "../../types/kos";
import {
  PortalContext,
  type InfoKamar,
  type PortalData,
} from "./portalContext";

export default function PortalProvider({
  user,
  children,
}: {
  user: UserProfile;
  children: ReactNode;
}) {
  const [tagihan, setTagihan] = useState<Tagihan[]>([]);
  const [bukti, setBukti] = useState<BuktiPembayaran[]>([]);
  const [keluhan, setKeluhan] = useState<Keluhan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const reload = useCallback(async () => {
    try {
      const [t, b, k] = await Promise.all([
        tagihanService.getAll(),
        tagihanService.getBuktiPembayaran(),
        keluhanService.getAll(),
      ]);
      setTagihan(t.data);
      setBukti(b.data);
      setKeluhan(k.data);
      setError(false);
    } catch (e) {
      console.error("Gagal memuat data portal", e);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload();
  }, [reload]);

  const kamar = useMemo<InfoKamar | null>(() => {
    if (user.kamar?.nomor_kamar) {
      const nomor = user.kamar.nomor_kamar;
      const huruf = nomor.trim()[0];
      return {
        nomor,
        blok: huruf && /[A-Za-z]/.test(huruf) ? huruf.toUpperCase() : null,
        tipe:
          user.kamar.tipe === "berdua"
            ? "Kamar Berdua"
            : user.kamar.tipe === "individu"
              ? "Kamar Individu"
              : null,
      };
    }

    const nomor =
      tagihan.find((t) => t.nomor_kamar)?.nomor_kamar ??
      keluhan.find((k) => k.nomor_kamar)?.nomor_kamar;
    if (!nomor) return null;
    const tipeRaw = tagihan.find((t) => t.penghuni?.kamar?.tipe)?.penghuni
      ?.kamar?.tipe;
    const huruf = nomor.trim()[0];
    return {
      nomor,
      blok: huruf && /[A-Za-z]/.test(huruf) ? huruf.toUpperCase() : null,
      tipe:
        tipeRaw === "berdua"
          ? "Kamar Berdua"
          : tipeRaw === "individu"
            ? "Kamar Individu"
            : null,
    };
  }, [user.kamar, tagihan, keluhan]);

  const value = useMemo<PortalData>(
    () => ({ user, tagihan, bukti, keluhan, kamar, loading, error, reload }),
    [user, tagihan, bukti, keluhan, kamar, loading, error, reload],
  );

  return (
    <PortalContext.Provider value={value}>{children}</PortalContext.Provider>
  );
}
