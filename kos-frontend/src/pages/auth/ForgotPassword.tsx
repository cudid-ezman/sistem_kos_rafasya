import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import AuthLayout from '../../components/auth/AuthLayout';
import Alert from '../../components/auth/Alert';
import Field from '../../components/auth/Field';
import SubmitButton from '../../components/auth/SubmitButton';
import { ArrowLeftIcon, MailIcon, SendIcon } from '../../components/auth/icons';
import { requestPasswordReset } from '../../services/authService';

type Status = { kind: 'idle' } | { kind: 'success' } | { kind: 'error'; message: string };

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus({ kind: 'idle' });
    setIsLoading(true);
    try {
      await requestPasswordReset(email.trim());
      setStatus({ kind: 'success' });
    } catch (err) {
      const notFound = axios.isAxiosError(err) && [400, 404].includes(err.response?.status ?? 0);
      setStatus({
        kind: 'error',
        message: notFound
          ? 'Email tidak terdaftar'
          : 'Tidak dapat terhubung ke server. Pastikan backend menyala.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const hasError = status.kind === 'error';

  return (
    <AuthLayout>
      <h2 className="text-2xl font-bold tracking-tight text-kos-950">Lupa Kata Sandi</h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">
        Masukkan alamat email yang terdaftar pada akun Kos Rafasya Anda. Kami akan mengirimkan tautan
        untuk mengatur ulang kata sandi Anda.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
        {status.kind === 'success' && (
          <Alert variant="success" onClose={() => setStatus({ kind: 'idle' })}>
            Tautan atur ulang telah dikirim ke email Anda.
          </Alert>
        )}
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
          hint="Pastikan email sesuai dengan yang didaftarkan saat registrasi kos."
          disabled={isLoading}
        />

        <SubmitButton
          loading={isLoading}
          loadingText="Mengirim..."
          disabled={!email.trim()}
          icon={<SendIcon size={16} />}
        >
          Kirim Tautan
        </SubmitButton>
      </form>

      <div className="mt-6 border-t border-slate-200 pt-5 text-center">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-kos-600 hover:text-kos-700 hover:underline"
        >
          <ArrowLeftIcon size={14} /> Kembali ke Masuk
        </Link>
      </div>
    </AuthLayout>
  );
}
