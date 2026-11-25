import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  buatNotifikasiPemilik,
  buatNotifikasiPengurus,
  type NotifTone,
} from "../../lib/notifikasi";
import type { UserProfile } from "../../types/auth";
import type { BuktiPembayaran, Keluhan, Tagihan } from "../../types/kos";
import {
  ArrowRightIcon,
  BellIcon,
  CheckCircleIcon,
  CheckIcon,
  ClockIcon,
  WarningIcon,
  WrenchIcon,
  XCircleIcon,
} from "../portal/icons";

const TONE: Record<
  NotifTone,
  { box: string; link: string; icon: typeof BellIcon }
> = {
  danger: {
    box: "bg-rose-50 text-rose-600",
    link: "text-rose-700",
    icon: XCircleIcon,
  },
  warning: {
    box: "bg-amber-50 text-amber-600",
    link: "text-kos-700",
    icon: WarningIcon,
  },
  info: {
    box: "bg-sky-50 text-sky-600",
    link: "text-sky-700",
    icon: ClockIcon,
  },
  success: {
    box: "bg-emerald-50 text-emerald-600",
    link: "text-emerald-700",
    icon: CheckCircleIcon,
  },
  violet: {
    box: "bg-violet-50 text-violet-600",
    link: "text-violet-700",
    icon: WrenchIcon,
  },
};

function bacaDibaca(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

interface Props {
  user: UserProfile;
  tagihan: Tagihan[];
  bukti: BuktiPembayaran[];
  keluhan: Keluhan[];
}

export default function AdminNotificationBell({
  user,
  tagihan,
  bukti,
  keluhan,
}: Props) {
  const navigate = useNavigate();
  const role = (user.role || "").toLowerCase();
  const storageKey = `kos_notif_dibaca_${user.id}`;

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"semua" | "belum">("semua");
  const [dibaca, setDibaca] = useState<string[]>(() => bacaDibaca(storageKey));
  const wrapRef = useRef<HTMLDivElement>(null);

  const daftar = useMemo(() => {
    if (role === "pemilik")
      return buatNotifikasiPemilik(tagihan, bukti, keluhan);
    if (role === "pengurus")
      return buatNotifikasiPengurus(tagihan, bukti, keluhan);
    return [];
  }, [role, tagihan, bukti, keluhan]);

  const belumDibaca = daftar.filter((n) => !dibaca.includes(n.id));
  const tampil = tab === "belum" ? belumDibaca : daftar;

  const simpan = useCallback(
    (ids: string[]) => {
      setDibaca(ids);
      try {
        localStorage.setItem(storageKey, JSON.stringify(ids));
      } catch {
        /* abaikan */
      }
    },
    [storageKey],
  );

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node))
        setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (role === "superadmin") return null;

  const buka = (id: string, to: string) => {
    if (!dibaca.includes(id)) simpan([...dibaca, id]);
    setOpen(false);
    navigate(to);
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifikasi${belumDibaca.length ? `, ${belumDibaca.length} belum dibaca` : ""}`}
        aria-expanded={open}
        className={`relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg transition focus-visible:outline-2 focus-visible:outline-kos-600 ${
          open
            ? "bg-kos-100/60 text-kos-700"
            : "text-ink-soft hover:bg-slate-100"
        }`}
      >
        <BellIcon />
        {belumDibaca.length > 0 && (
          <span className="absolute right-1 top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
            {belumDibaca.length}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-x-3 top-[72px] z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl motion-safe:animate-[pop-in_.18s_ease-out] sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-[390px]">
          <div className="flex items-center justify-between px-5 pb-1 pt-4">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-ink">Notifikasi</h2>
              {belumDibaca.length > 0 && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                  {belumDibaca.length} Baru
                </span>
              )}
            </div>
            <button
              type="button"
              disabled={belumDibaca.length === 0}
              onClick={() => simpan(daftar.map((n) => n.id))}
              className="flex cursor-pointer items-center gap-1 text-xs font-semibold text-kos-700 hover:underline disabled:cursor-default disabled:text-slate-400 disabled:no-underline"
            >
              <CheckIcon size={14} /> Tandai semua dibaca
            </button>
          </div>

          <div className="flex gap-5 border-b border-slate-100 px-5">
            {(
              [
                ["semua", "Semua"],
                ["belum", `Belum Dibaca (${belumDibaca.length})`],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`-mb-px cursor-pointer border-b-2 py-2.5 text-[13px] font-semibold transition ${
                  tab === key
                    ? "border-kos-600 text-kos-700"
                    : "border-transparent text-ink-soft hover:text-ink"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <ul className="max-h-[min(440px,65vh)] divide-y divide-slate-100 overflow-y-auto">
            {tampil.length === 0 ? (
              <li className="px-5 py-10 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                  <BellIcon />
                </div>
                <p className="text-sm font-semibold text-ink">
                  {tab === "belum"
                    ? "Semua sudah dibaca"
                    : "Belum ada notifikasi"}
                </p>
                <p className="mt-1 text-xs text-ink-soft">
                  {role === "pemilik"
                    ? "Info pemasukan dan ringkasan kos akan muncul di sini."
                    : "Info verifikasi pembayaran dan keluhan akan muncul di sini."}
                </p>
              </li>
            ) : (
              tampil.map((n) => {
                const t = TONE[n.tone];
                const Ikon = t.icon;
                const baru = !dibaca.includes(n.id);
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => buka(n.id, n.to)}
                      className={`flex w-full cursor-pointer gap-3 px-5 py-3.5 text-left transition hover:bg-slate-50 ${
                        baru ? "bg-kos-100/20" : ""
                      }`}
                    >
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${t.box}`}
                      >
                        <Ikon size={19} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                            {baru && (
                              <span className="h-2 w-2 shrink-0 rounded-full bg-sky-500" />
                            )}
                            {n.title}
                          </span>
                          {n.time && (
                            <span className="shrink-0 text-[11px] text-ink-soft">
                              {n.time}
                            </span>
                          )}
                        </span>
                        <span className="mt-0.5 block text-[13px] leading-snug text-ink-soft">
                          {n.text}
                        </span>
                        <span
                          className={`mt-1.5 inline-flex items-center gap-1 text-xs font-semibold ${t.link}`}
                        >
                          {n.linkLabel} <ArrowRightIcon size={13} />
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
