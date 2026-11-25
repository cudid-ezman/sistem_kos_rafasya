import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import AuthLayout from '../../components/auth/AuthLayout';
import Alert from '../../components/auth/Alert';
import Field from '../../components/auth/Field';
import SubmitButton from '../../components/auth/SubmitButton';
import AuthIconBadge from '../../components/auth/AuthIconBadge';
import { ArrowLeftIcon, KeyIcon, MailIcon, SendIcon } from '../../components/auth/icons';
import { requestPasswordReset } from '../../services/authService';
import LinkWhatsAppPengurus from '../../components/common/LinkWhatsAppPengurus';

type Status = { kind: 'idle' } | { kind: 'error'; message: string };

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const emailBersih = email.trim().toLowerCase();
    setStatus({ kind: 'idle' });
    setIsLoading(true);
    try {
      await requestPasswordReset(emailBersih);
      navigate('/atur-ulang-kata-sandi', {
        state: { email: emailBersih, baruTerkirim: true },
      });
    } catch (err) {
      const notFound = axios.isAxiosError(err) && [400, 404].includes(err.response?.status ?? 0);
      const detail = axios.isAxiosError(err) ? err.response?.data?.detail : undefined;
      setStatus({
        kind: 'error',
        message: notFound
          ? (detail || 'Email tidak terdaftar')
          : 'Tidak dapat terhubung ke server. Pastikan backend menyala.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const hasError = status.kind === 'error';

  return (
    <AuthLayout showHelp={false}>
      <AuthIconBadge icon={<KeyIcon size={20} />} />
      <h2 className="text-2xl font-bold tracking-tight text-kos-950">Lupa Kata Sandi</h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">
        Masukkan alamat email yang terdaftar pada akun Kost Raffasya Anda. Kami akan mengirimkan{' '}
        <span className="font-semibold text-ink">kode OTP 6 digit</span> untuk mengatur ulang kata sandi.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
        {hasError && (
          <Alert variant="error" onClose={() => setStatus({ kind: 'idle' })}>
            {status.message}
          </Alert>
        )}

        <Field
          label="Email Terdaftar"
          required
          icon={<MailIcon />}
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="nama@email.com"
          autoComplete="email"
          invalid={hasError}
          hint={
            hasError && status.message === 'Email tidak terdaftar'
              ? 'Alamat email tidak ditemukan dalam sistem Kost Putra Raffasya.'
              : 'Pastikan email sesuai dengan yang didaftarkan saat registrasi kos.'
          }
          disabled={isLoading}
        />

        <SubmitButton
          loading={isLoading}
          loadingText="Mengirim Kode OTP..."
          disabled={!email.trim()}
          icon={<SendIcon size={16} />}
        >
          Kirim Kode OTP
        </SubmitButton>
      </form>

      <div className="my-5 flex items-center gap-3 text-[11px] font-medium tracking-wider text-slate-400">
        <span className="h-px flex-1 bg-slate-200" />
        ATAU
        <span className="h-px flex-1 bg-slate-200" />
      </div>
      <div className="text-center">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-kos-600 hover:text-kos-700 hover:underline"
        >
          <ArrowLeftIcon size={14} /> Kembali ke Masuk
        </Link>
      </div>
      <p className="mt-5 border-t border-slate-200 pt-5 text-center text-xs text-ink-soft">
        Butuh bantuan?{' '}
        <LinkWhatsAppPengurus pesan="Halo Pengurus Kos Putra Raffasya, saya lupa kata sandi akun dan membutuhkan bantuan." />
      </p>
    </AuthLayout>
  );
}
