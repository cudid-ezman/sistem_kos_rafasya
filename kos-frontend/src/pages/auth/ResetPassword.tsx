import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import AuthLayout from '../../components/auth/AuthLayout';
import AuthIconBadge from '../../components/auth/AuthIconBadge';
import Alert from '../../components/auth/Alert';
import Field from '../../components/auth/Field';
import SubmitButton from '../../components/auth/SubmitButton';
import { ArrowLeftIcon, CheckCircleIcon, CheckIcon, LockIcon, LockResetIcon, LoginIcon } from '../../components/auth/icons';
import { confirmPasswordReset, extractMessages } from '../../services/authService';

type Status =
  | { kind: 'idle' }
  | { kind: 'expired' }
  | { kind: 'success' }
  | { kind: 'error'; message: string };

export default function ResetPassword() {
  const { uid = '', token = '' } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [konfirmasi, setKonfirmasi] = useState('');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [isLoading, setIsLoading] = useState(false);

  const expired = status.kind === 'expired';
  const success = status.kind === 'success';
  const lengthOk = password.length >= 8;
  const mismatch = konfirmasi.length > 0 && password !== konfirmasi;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!lengthOk) {
      setStatus({ kind: 'error', message: 'Kata sandi minimal 8 karakter.' });
      return;
    }
    if (password !== konfirmasi) {
      setStatus({ kind: 'error', message: 'Kata sandi dan konfirmasi tidak sama.' });
      return;
    }

    setStatus({ kind: 'idle' });
    setIsLoading(true);
    try {
      await confirmPasswordReset(uid, token, password);
      setStatus({ kind: 'success' });
    } catch (err) {
      // Token tidak valid / kedaluwarsa dari backend
      if (axios.isAxiosError(err) && [400, 404, 410].includes(err.response?.status ?? 0) && !err.response?.data?.password) {
        setStatus({ kind: 'expired' });
      } else {
        setStatus({ kind: 'error', message: extractMessages(err, 'Gagal menyimpan kata sandi.')[0] });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <AuthIconBadge icon={<LockResetIcon size={20} />} />
      <h2 className="text-2xl font-bold tracking-tight text-kos-950">Atur Ulang Kata Sandi</h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">
        Masukkan kata sandi baru untuk akun Anda. Pastikan kata sandi kuat dan aman.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
        {expired && (
          <Alert variant="error">
            <span className="font-semibold">Tautan sudah kedaluwarsa.</span> Silakan ajukan permohonan
            ulang untuk mendapatkan tautan baru.{' '}
            <Link to="/lupa-kata-sandi" className="font-semibold underline">
              Minta tautan baru
            </Link>
          </Alert>
        )}
        {success && (
          <Alert variant="success" onClose={() => setStatus({ kind: 'idle' })}>
            Kata sandi berhasil diubah. Silakan masuk kembali menggunakan kata sandi baru Anda.
          </Alert>
        )}
        {status.kind === 'error' && (
          <Alert variant="error" onClose={() => setStatus({ kind: 'idle' })}>
            {status.message}
          </Alert>
        )}

        <Field
          label="Kata sandi baru"
          required
          type="password"
          icon={<LockIcon />}
          value={password}
          onChange={setPassword}
          placeholder="Minimal 8 karakter"
          autoComplete="new-password"
          disabled={expired || isLoading}
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
          disabled={expired || isLoading}
        />

        {success ? (
          <SubmitButton type="button" iconFirst icon={<LoginIcon size={16} />} onClick={() => navigate('/', { replace: true })}>
            Masuk
          </SubmitButton>
        ) : (
          <SubmitButton
            iconFirst
            icon={<CheckIcon size={16} />}
            loading={isLoading}
            loadingText="Menyimpan..."
            disabled={expired || !password || !konfirmasi}
          >
            Simpan Kata Sandi
          </SubmitButton>
        )}
      </form>

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
