import type { ReactNode, SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

function I({ size = 20, children, ...rest }: P & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const ReceiptIcon = (p: P) => (
  <I {...p}>
    <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
    <path d="M9 8h6M9 12h6" />
  </I>
);
export const InfoCircleIcon = (p: P) => (
  <I {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 8h.01" />
  </I>
);
export const WarningIcon = (p: P) => (
  <I {...p}>
    <path d="M12 3 2.5 20h19L12 3Z" />
    <path d="M12 10v4.5M12 17.5h.01" />
  </I>
);
export const BellIcon = (p: P) => (
  <I {...p}>
    <path d="M6 9a6 6 0 1 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9Z" />
    <path d="M10 20a2 2 0 0 0 4 0" />
  </I>
);
export const LogoutIcon = (p: P) => (
  <I {...p}>
    <path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" />
    <path d="m15 16 4-4-4-4M19 12H9" />
  </I>
);
export const DoorIcon = (p: P) => (
  <I {...p}>
    <path d="M6 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17" />
    <path d="M3 21h18" />
    <path d="M14.5 12v.01" />
  </I>
);
export const WalletIcon = (p: P) => (
  <I {...p}>
    <path d="M4 7a2 2 0 0 1 2-2h11v4" />
    <path d="M4 7v10a2 2 0 0 0 2 2h13a1 1 0 0 0 1-1V10a1 1 0 0 0-1-1H6a2 2 0 0 1-2-2Z" />
    <path d="M16 14.5h.01" />
  </I>
);
export const CalendarIcon = (p: P) => (
  <I {...p}>
    <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </I>
);
export const CalendarClockIcon = (p: P) => (
  <I {...p}>
    <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
    <path d="m10 14.5 1.5 1.5 3-3" />
  </I>
);
export const UploadCloudIcon = (p: P) => (
  <I {...p}>
    <path d="M7 18a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 8.5a4 4 0 0 1-.5 9.5" />
    <path d="m12 12-3.5 3.5M12 12l3.5 3.5M12 12v8" />
  </I>
);
export const DownloadIcon = (p: P) => (
  <I {...p}>
    <path d="M12 4v11M7.5 11 12 15.5 16.5 11" />
    <path d="M5 19.5h14" />
  </I>
);
export const EyeIcon = (p: P) => (
  <I {...p}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
  </I>
);
export const TrashIcon = (p: P) => (
  <I {...p}>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
  </I>
);
export const FileImageIcon = (p: P) => (
  <I {...p}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
    <path d="M14 3v5h5" />
    <circle cx="10" cy="13" r="1.3" />
    <path d="m8 18 3.2-3 2.3 2 1.5-1.2L17 18" />
  </I>
);
export const BookIcon = (p: P) => (
  <I {...p}>
    <path d="M12 6.5C10.5 5.3 8.3 4.7 5 4.7v13c3.3 0 5.5.6 7 1.8 1.5-1.2 3.7-1.8 7-1.8v-13c-3.3 0-5.5.6-7 1.8Z" />
    <path d="M12 6.5V19.5" />
  </I>
);
export const ClockIcon = (p: P) => (
  <I {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3.2 2" />
  </I>
);
export const WifiIcon = (p: P) => (
  <I {...p}>
    <path d="M2.5 9.2a14 14 0 0 1 19 0M5.5 12.6a9.5 9.5 0 0 1 13 0M8.6 16a5 5 0 0 1 6.8 0" />
    <path d="M12 19.5h.01" strokeWidth={2.6} />
  </I>
);
export const ChevronRightIcon = (p: P) => (
  <I {...p}>
    <path d="m9 6 6 6-6 6" />
  </I>
);
export const ArrowLeftIcon = (p: P) => (
  <I {...p}>
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </I>
);
export const ArrowRightIcon = (p: P) => (
  <I {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </I>
);
export const PlusIcon = (p: P) => (
  <I {...p}>
    <path d="M12 5v14M5 12h14" />
  </I>
);
export const CheckIcon = (p: P) => (
  <I {...p}>
    <path d="m5 12.5 4.5 4.5L19 7" />
  </I>
);
export const CheckCircleIcon = (p: P) => (
  <I {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8 12.5 2.8 2.8L16 9.5" />
  </I>
);
export const XIcon = (p: P) => (
  <I {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </I>
);
export const XCircleIcon = (p: P) => (
  <I {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m9 9 6 6M15 9l-6 6" />
  </I>
);
export const QrIcon = (p: P) => (
  <I {...p}>
    <rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1.2" />
    <rect x="14" y="3.5" width="6.5" height="6.5" rx="1.2" />
    <rect x="3.5" y="14" width="6.5" height="6.5" rx="1.2" />
    <path d="M14 14h2.5v2.5H14zM19 14v.01M14 19.5h.01M17 19v1.5h3.5V17" />
  </I>
);
export const LockIcon = (p: P) => (
  <I {...p}>
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </I>
);
export const ShieldCheckIcon = (p: P) => (
  <I {...p}>
    <path d="M12 3 4.5 6v5.5c0 4.6 3.1 8 7.5 9.5 4.4-1.5 7.5-4.9 7.5-9.5V6L12 3Z" />
    <path d="m9 12 2.3 2.3L15.5 10" />
  </I>
);
export const WrenchIcon = (p: P) => (
  <I {...p}>
    <path d="M14.7 6.3a4 4 0 0 0-5.4 5l-6 6a1.9 1.9 0 0 0 2.7 2.7l6-6a4 4 0 0 0 5-5.4l-2.6 2.6-2.2-.5-.5-2.2 2.6-2.2Z" />
  </I>
);
export const CopyIcon = (p: P) => (
  <I {...p}>
    <rect x="8.5" y="8.5" width="11" height="11" rx="2" />
    <path d="M15.5 8.5V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7.5a2 2 0 0 0 2 2h2.5" />
  </I>
);
export const ImageIcon = (p: P) => (
  <I {...p}>
    <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
    <circle cx="9" cy="10" r="1.6" />
    <path d="m4 17 5-4.5 3.5 3 2.5-2 5 4" />
  </I>
);
export const SparkleIcon = (p: P) => (
  <I {...p}>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" />
  </I>
);
export const ListIcon = (p: P) => (
  <I {...p}>
    <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />
  </I>
);
export const MenuHomeIcon = (p: P) => (
  <I {...p}>
    <path d="m3.5 11 8.5-7 8.5 7" />
    <path d="M5.5 9.5V20h13V9.5" />
  </I>
);
export const PrinterIcon = (p: P) => (
  <I {...p}>
    <path d="M7 9V4h10v5M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2" />
    <rect x="7" y="14" width="10" height="6" rx="1" />
  </I>
);

export const UsersIcon = (p: P) => (
  <I {...p}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
    <path d="M16 4.7a3.5 3.5 0 0 1 0 6.6M18 14.2A6.5 6.5 0 0 1 21.5 20" />
  </I>
);
export const MenuIcon = (p: P) => (
  <I {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </I>
);
export const SearchIcon = (p: P) => (
  <I {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4.5 4.5" />
  </I>
);
export const PencilIcon = (p: P) => (
  <I {...p}>
    <path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3Z" />
    <path d="m14.5 7.5 3 3" />
  </I>
);
export const ChartIcon = (p: P) => (
  <I {...p}>
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
  </I>
);
export const GridIcon = (p: P) => (
  <I {...p}>
    <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
  </I>
);
export const TrendingUpIcon = (p: P) => (
  <I {...p}>
    <path d="m3 17 6-6 4 4 8-8" />
    <path d="M15 7h6v6" />
  </I>
);
export const PhoneIcon = (p: P) => (
  <I {...p}>
    <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" />
  </I>
);
