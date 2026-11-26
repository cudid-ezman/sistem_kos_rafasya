const DOORS = ['A01', 'A02', 'A03', 'B01', 'B02', 'C01', 'C02', 'D01'];
const BLOKS = ['BLOK A', 'BLOK B', 'BLOK C', 'BLOK D'];
const LIT = new Set([0, 3, 4, 6]);
const DARK = '#1b1d19';
const SLOT = 442 / 8;
const doorX = (i: number) => 24 + i * SLOT;

/** Ilustrasi bangunan kos untuk panel kiri halaman auth. */
export default function KosIllustration({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="-6 96 572 206"
      preserveAspectRatio="xMidYMax meet"
      className={className}
      fill="none"
      aria-hidden="true"
    >
      <g transform="translate(50 92)">
        {/* Pohon */}
        <rect x="-31" y="122" width="6" height="76" fill="#5d6054" />
        <circle cx="-28" cy="114" r="16" fill="#3dae48" />
        <circle cx="-38" cy="128" r="14" fill="#2a9438" />
        <circle cx="-18" cy="128" r="14" fill="#2a9438" />
        <circle cx="-28" cy="102" r="10" fill="#9fdba0" opacity=".55" />

        {/* Badan bangunan */}
        <rect x="14" y="60" width="442" height="118" fill="#f3e6b0" />
        <rect x="14" y="178" width="442" height="20" fill="#2a9438" />
        <path d="M14 186h442M14 192h442" stroke={DARK} strokeOpacity=".45" />

        {/* Atap 3 puncak */}
        <path
          d="M0 64 98 12l70 34 68-46 68 46 72-34 94 52Z"
          fill="#a2432f"
          stroke="#7c2f20"
          strokeWidth="3"
          strokeLinejoin="round"
        />

        {/* Jendela */}
        {DOORS.map((_, i) => (
          <g key={`w${i}`}>
            <rect
              x={doorX(i) + 35}
              y="112"
              width="15"
              height="32"
              rx="1.5"
              fill={LIT.has(i) ? '#fbeeb0' : '#8d8a72'}
              stroke={DARK}
              strokeWidth="1.5"
            />
            <path d={`M${doorX(i) + 42.5} 112v32M${doorX(i) + 35} 128h15`} stroke={DARK} strokeWidth="1" />
          </g>
        ))}

        {/* Pintu, lampu, nomor kamar */}
        {DOORS.map((label, i) => (
          <g key={label}>
            <circle cx={doorX(i) + 15} cy="94" r="2" fill="#ffd75e" />
            <rect x={doorX(i)} y="98" width="30" height="100" rx="2" fill={DARK} />
            <rect x={doorX(i) + 1} y="102" width="28" height="13" rx="2.5" fill="#faf5e3" stroke={DARK} />
            <text
              x={doorX(i) + 15}
              y="111.5"
              textAnchor="middle"
              fontSize="8.5"
              fontWeight="700"
              fill={DARK}
            >
              {label}
            </text>
            <circle cx={doorX(i) + 24} cy="156" r="1.3" fill="#ffd75e" />
          </g>
        ))}

        {/* Label blok */}
        {BLOKS.map((label, b) => {
          const cx = (doorX(b * 2) + doorX(b * 2 + 1) + 30) / 2;
          return (
            <g key={label}>
              <rect x={cx - 26} y="68" width="52" height="14" rx="4" fill="#faf5e3" stroke={DARK} strokeWidth="1.2" />
              <text x={cx} y="78.5" textAnchor="middle" fontSize="8.5" fontWeight="700" fill={DARK}>
                {label}
              </text>
            </g>
          );
        })}

        {/* Tanah */}
        <rect x="-6" y="198" width="482" height="10" rx="1" fill="#0d0e0b" />

        {/* Sepeda */}
        <g stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="430" cy="188" r="9" />
          <circle cx="462" cy="188" r="9" />
          <path d="M430 188 441 172l11 16M441 172h6M452 188l4-18-6-2" />
        </g>
        <path d="M458 166 482 171 458 176Z" fill="#a39a52" opacity=".85" />
      </g>
    </svg>
  );
}
