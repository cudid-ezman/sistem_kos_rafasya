import { useEffect, useId, useRef, useState } from 'react';
import { ukuranBerkas, validasiGambar } from '../../lib/format';
import { CheckCircleIcon, EyeIcon, FileImageIcon, TrashIcon, UploadCloudIcon, WarningIcon } from './icons';

interface Props {
  file: File | null;
  onChange: (file: File | null) => void;
  /** Pesan error dari luar (mis. hasil submit). */
  error?: string | null;
  title?: string;
}

export default function Dropzone({ file, onChange, error, title = 'Pilih berkas atau tarik berkas ke area ini' }: Props) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const terima = (f?: File | null) => {
    if (!f) return;
    const msg = validasiGambar(f);
    setLocalError(msg);
    onChange(msg ? null : f);
    if (inputRef.current) inputRef.current.value = '';
  };

  const pesan = localError || error;

  return (
    <div>
      <label
        htmlFor={inputId}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          terima(e.dataTransfer.files?.[0]);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-8 text-center transition ${
          drag
            ? 'border-kos-600 bg-kos-100/40'
            : pesan
              ? 'border-rose-300 bg-rose-50/40'
              : 'border-slate-300 bg-cream/40 hover:border-kos-500 hover:bg-kos-100/20'
        }`}
      >
        <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-kos-100/70 text-kos-600">
          <UploadCloudIcon size={24} />
        </span>
        <span className="text-sm font-semibold text-ink">{title}</span>
        <span className="mt-1 text-xs text-ink-soft">JPG, PNG, maks. 2 MB</span>
        <input
          id={inputId}
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png"
          className="sr-only"
          onChange={(e) => terima(e.target.files?.[0])}
        />
      </label>

      {pesan && (
        <p role="alert" className="mt-2 flex items-center gap-1.5 text-xs font-medium text-rose-600">
          <WarningIcon size={14} /> {pesan}
        </p>
      )}

      {file && !pesan && (
        <>
          <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-800">
            <span className="flex items-center gap-1.5">
              <CheckCircleIcon size={15} /> Berkas terverifikasi: format {file.type === 'image/png' ? 'PNG' : 'JPG'},{' '}
              {ukuranBerkas(file.size)} memenuhi syarat
            </span>
            <span className="rounded-md bg-field px-1.5 py-0.5 text-[10px] font-bold">Valid</span>
          </div>

          <div className="mt-3 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-field p-3">
            {preview ? (
              <img src={preview} alt="Pratinjau berkas" className="h-14 w-14 shrink-0 rounded-lg object-cover ring-1 ring-slate-200" />
            ) : (
              <span className="flex h-14 w-14 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                <FileImageIcon size={22} />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">{file.name}</p>
              <p className="text-xs text-ink-soft">
                {ukuranBerkas(file.size)} • <span className="font-medium text-emerald-700">Siap dikirim</span>
              </p>
            </div>
            {preview && (
              <a
                href={preview}
                target="_blank"
                rel="noreferrer"
                aria-label="Lihat berkas"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-soft hover:bg-slate-100"
              >
                <EyeIcon size={18} />
              </a>
            )}
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setLocalError(null);
              }}
              aria-label="Hapus berkas"
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-ink-soft hover:bg-rose-50 hover:text-rose-600"
            >
              <TrashIcon size={18} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
