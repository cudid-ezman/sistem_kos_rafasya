import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import api from '../services/api';
import type { LoginResponse, UserProfile } from '../types/auth';
import AuthLayout from '../components/auth/AuthLayout';
import Alert from '../components/auth/Alert';
import Field from '../components/auth/Field';
import SubmitButton from '../components/auth/SubmitButton';
import { ArrowRightIcon, LockIcon, MailIcon } from '../components/auth/icons';

interface LoginProps {
  onLoginSuccess: (user: UserProfile) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<{ title: string; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const loginRes = await api.post<LoginResponse>('/login/', {
        username: identifier.trim(),
        password,
      });

      localStorage.setItem('access_token', loginRes.data.access);
      localStorage.setItem('refresh_token', loginRes.data.refresh);

      const profileRes = await api.get<UserProfile>('/me/');
      onLoginSuccess(profileRes.data);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        setError({
          title: 'Gagal Masuk',
          message: 'Username, atau kata sandi salah.',
        });
      } else {
        setError({
          title: 'Gagal Masuk',
          message: 'Tidak dapat terhubung ke server. Pastikan backend menyala.',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout showHelp={false}>
      <h2 className="text-2xl font-bold tracking-tight text-kos-950">Masuk ke Sistem</h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">
        Silakan masukkan username, atau email beserta kata sandi Anda.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
        {error && (
          <Alert variant="error" title={error.title} onClose={() => setError(null)}>
            {error.message}
          </Alert>
        )}

        <Field
          label="Username / Email"
          icon={<MailIcon />}
          value={identifier}
          onChange={setIdentifier}
          placeholder="Masukkan username atau email"
          autoComplete="username"
          disabled={isLoading}
        />

        <div>
          <Field
            label="Kata sandi"
            type="password"
            icon={<LockIcon />}
            value={password}
            onChange={setPassword}
            placeholder="Masukkan kata sandi"
            autoComplete="current-password"
            disabled={isLoading}
          />
          <div className="mt-3 text-right">
            <Link
              to="/lupa-kata-sandi"
              className="text-[13px] font-semibold text-kos-600 hover:text-kos-700 hover:underline"
            >
              Lupa kata sandi?
            </Link>
          </div>
        </div>

        <SubmitButton
          loading={isLoading}
          loadingText="Memverifikasi..."
          disabled={!identifier.trim() || !password}
          icon={<ArrowRightIcon size={16} />}
        >
          Masuk
        </SubmitButton>
      </form>

      <div className="mt-6 border-t border-slate-200 pt-5 text-center text-[13px] text-ink-soft">
        Belum punya akun?{' '}
        <Link to="/daftar" className="font-semibold text-kos-600 hover:text-kos-700 hover:underline">
          Daftar
        </Link>
      </div>
    </AuthLayout>
  );
}