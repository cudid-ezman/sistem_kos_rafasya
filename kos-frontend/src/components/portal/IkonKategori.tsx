import { BoltIcon, DropletIcon, WifiIcon, WrenchIcon } from './icons';

interface Props {
  nama?: string | null;
  size?: number;
  className?: string;
}

/** Ikon yang sesuai dengan nama kategori keluhan; kategori lain memakai kunci inggris. */
export default function IkonKategori({ nama, size = 18, className }: Props) {
  const n = (nama ?? '').toLowerCase();
  if (n.includes('air')) return <DropletIcon size={size} className={className} />;
  if (n.includes('wi-fi') || n.includes('wifi') || n.includes('internet')) return <WifiIcon size={size} className={className} />;
  if (n.includes('listrik') || n.includes('lampu')) return <BoltIcon size={size} className={className} />;
  return <WrenchIcon size={size} className={className} />;
}
