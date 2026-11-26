import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthLayout from '../../components/auth/AuthLayout';
import Alert from '../../components/auth/Alert';
import Field from '../../components/auth/Field';
import SubmitButton from '../../components/auth/SubmitButton';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  CheckIcon,
  KeyIcon,
  LockIcon,
  LockResetIcon,
  LoginIcon,
  MailIcon,
} from '../../components/auth/icons';
import {
  confirmPasswordReset,
  extractMessages,
  requestPasswordReset,
  verifyPasswordResetOtp,
} from '../../services/authService';

type Tahap = 'otp' | 'password' | 'selesai';
type Banner = { kind: 'info' | 'error'; message: string } | null;

export default function ResetPassword() {
  const location = useLocation();
  const navigate = useNavigate();
  const navState = (location.state as { email?: string; baruTerkirim?: boolean } | null) ?? null;

  const [tahap, setTahap] = useState<Tahap>('otp');
  const [email, setEmail] = useState(navState?.email ?? '');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [konfirmasi, setKonfirmasi] = useState('');
  const [banner, setBanner] = useState<Banner>(
    navState?.baruTerkirim && navState?.email
      ? { kind: 'info', message: `Kode OTP 6 digit telah dikirim ke ${navState.email}.` }
      : null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [cooldown, setCooldown] = useState(navState?.baruTerkirim ? 60 : 0);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => {
      setCooldown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const otpValid = /^\d{6}$/.test(otp);
  const lengthOk = password.length >= 8;
  const mismatch = konfirmasi.length > 0 && password !== konfirmasi;

  const handleKirimUlang = async () => {
    const emailBersih = email.trim().toLowerCase();
    if (!emailBersih || cooldown > 0 || resending) return;
    setResending(true);
    setBanner(null);
    try {
      await requestPasswordReset(emailBersih);
      setOtp('');
      setCooldown(60);
      setBanner({ kind: 'info', message: `Kode OTP baru telah dikirim ke ${emailBersih}.` });
    } catch (err) {
      setBanner({
        kind: 'error',
        message: extractMessages(err, 'Gagal mengirim ulang kode OTP.')[0],
      });
    } finally {
      setResending(false);
    }
  };

  const handleVerifikasiOtp = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const emailBersih = email.trim().toLowerCase();
    if (!emailBersih) {
      setBanner({ kind: 'error', message: 'Email terdaftar wajib diisi.' });
      return;
    }
    if (!otpValid) {
      setBanner({ kind: 'error', message: 'Masukkan 6 digit kode OTP dari email Anda.' });
      return;
    }

    setBanner(null);
    setIsLoading(true);
    try {
      await verifyPasswordResetOtp(emailBersih, otp);
      setTahap('password');
      setBanner({
        kind: 'info',
        message: 'Kode OTP terverifikasi. Silakan buat kata sandi baru Anda.',
      });
    } catch (err) {
      setBanner({
        kind: 'error',
        message: extractMessages(err, 'Kode OTP tidak valid atau sudah kedaluwarsa.')[0],
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSimpanSandi = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!lengthOk) {
      setBanner({ kind: 'error', message: 'Kata sandi minimal 8 karakter.' });
      return;
    }
    if (password !== konfirmasi) {
      setBanner({ kind: 'error', message: 'Kata sandi dan konfirmasi tidak sama.' });
      return;
    }

    setBanner(null);
    setIsLoading(true);
    try {
      await confirmPasswordReset(email.trim().toLowerCase(), otp, password);
      setTahap('selesai');
    } catch (err) {
      const pesan = extractMessages(err, 'Gagal menyimpan kata sandi baru.')[0];
      if (/kedaluwarsa|tidak ditemukan|percobaan/i.test(pesan)) {
        setTahap('otp');
        setOtp('');
      }
      setBanner({ kind: 'error', message: pesan });
    } finally {
      setIsLoading(false);
    }
  };

  // === TAHAP 3: LAYAR SUKSES BERSIH ===
  if (tahap === 'selesai') {
    return (
      <AuthLayout showHelp={false}>
        <div className="py-4 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200">
            <CheckCircleIcon size={28} />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-kos-950">
            Kata Sandi Berhasil Diubah
          </h2>
          <p className="mt-2.5 text-sm leading-relaxed text-ink-soft">
            Kata sandi akun <span className="font-semibold text-ink">{email}</span> telah diperbarui.
            Silakan masuk kembali menggunakan kata sandi baru Anda.
          </p>

          <div className="mt-8">
            <SubmitButton
              type="button"
              iconFirst
              icon={<LoginIcon size={16} />}
              onClick={() => navigate('/', { replace: true })}
            >
              Kembali ke Halaman Masuk
            </SubmitButton>
          </div>
        </div>
      </AuthLayout>
    );
  }

  // === TAHAP 1 (VERIFIKASI OTP) & TAHAP 2 (INPUT SANDI BARU) ===
  return (
    <AuthLayout>
      <h2 className="text-2xl font-bold tracking-tight text-kos-950">
        {tahap === 'otp' ? 'Verifikasi Kode OTP' : 'Buat Kata Sandi Baru'}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">
        {tahap === 'otp'
          ? 'Masukkan 6 digit kode OTP yang telah dikirim ke email Anda untuk melanjutkan.'
          : `Buat kata sandi baru yang kuat untuk akun ${email}.`}
      </p>

      {banner && (
        <div className="mt-5">
          <Alert
            variant={banner.kind === 'error' ? 'error' : 'success'}
            onClose={() => setBanner(null)}
          >
            {banner.message}
          </Alert>
        </div>
      )}

      {tahap === 'otp' ? (
        <form onSubmit={handleVerifikasiOtp} className="mt-5 space-y-4" noValidate>
          <Field
            label="Email Terdaftar"
            required
            type="email"
            icon={<MailIcon />}
            value={email}
            onChange={setEmail}
            placeholder="nama@email.com"
            autoComplete="email"
            disabled={isLoading}
          />

          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <label htmlFor="kode-otp" className="text-[13px] font-semibold text-ink">
                Kode OTP (6 Digit) <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                disabled={!email.trim() || cooldown > 0 || resending}
                onClick={() => void handleKirimUlang()}
                className="cursor-pointer text-xs font-semibold text-kos-600 hover:text-kos-700 hover:underline disabled:cursor-not-allowed disabled:text-slate-400 disabled:no-underline"
              >
                {resending
                  ? 'Mengirim...'
                  : cooldown > 0
                    ? `Kirim ulang dalam ${cooldown} detik`
                    : 'Kirim ulang kode'}
              </button>
            </div>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-ink-soft">
                <KeyIcon size={16} />
              </span>
              <input
                id="kode-otp"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                autoComplete="one-time-code"
                autoFocus
                disabled={isLoading}
                className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 font-mono text-lg font-bold tracking-[0.35em] text-ink outline-none transition placeholder:font-normal placeholder:tracking-normal placeholder:text-slate-400 focus:border-kos-600 focus:ring-2 focus:ring-kos-600/20 disabled:bg-slate-50"
              />
            </div>
            <p className="mt-1.5 text-xs text-ink-soft">
              Kode berlaku 10 menit. Periksa kotak masuk atau folder spam email Anda.
            </p>
          </div>

          <SubmitButton
            iconFirst
            icon={<CheckIcon size={16} />}
            loading={isLoading}
            loadingText="Memeriksa Kode..."
            disabled={!email.trim() || !otpValid}
          >
            Verifikasi Kode OTP
          </SubmitButton>
        </form>
      ) : (
        <form onSubmit={handleSimpanSandi} className="mt-5 space-y-4" noValidate>
          <Field
            label="Kata sandi baru"
            required
            type="password"
            icon={<LockIcon />}
            value={password}
            onChange={setPassword}
            placeholder="Minimal 8 karakter"
            autoComplete="new-password"
            disabled={isLoading}
            hintLeading={
              <CheckCircleIcon size={13} className={`mt-px shrink-0 ${lengthOk ? 'text-kos-600' : ''}`} />
            }
            hint="Minimal 8 karakter"
          />

          <Field
            label="Konfirmasi kata sandi baru"
            required
            type="password"
            icon={<LockResetIcon />}
            value={konfirmasi}
            onChange={setKonfirmasi}
            placeholder="Ulangi kata sandi baru"
            autoComplete="new-password"
            invalid={mismatch}
            hint={mismatch ? 'Kata sandi tidak sama' : undefined}
            hintIcon={false}
            disabled={isLoading}
          />

          <SubmitButton
            iconFirst
            icon={<CheckIcon size={16} />}
            loading={isLoading}
            loadingText="Menyimpan..."
            disabled={!password || !konfirmasi}
          >
            Simpan Kata Sandi Baru
          </SubmitButton>
        </form>
      )}

      <div className="mt-6 border-t border-slate-200 pt-5 text-center">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-soft hover:text-ink hover:underline"
        >
          <ArrowLeftIcon size={14} /> Kembali ke Masuk
        </Link>
      </div>
    </AuthLayout>
  );
}
