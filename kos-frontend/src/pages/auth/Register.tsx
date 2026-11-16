import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../../components/auth/AuthLayout';
import Alert from '../../components/auth/Alert';
import Field from '../../components/auth/Field';
import SubmitButton from '../../components/auth/SubmitButton';
import { ArrowRightIcon, IdCardIcon, LockIcon, LockResetIcon, MailIcon, UserIcon } from '../../components/auth/icons';
import { extractMessages, registerPenghuni } from '../../services/authService';

export default function Register() {
  const navigate = useNavigate();
  const [nama, setNama] = useState('');
  const [noIdentitas, setNoIdentitas] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [konfirmasi, setKonfirmasi] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validasi sisi klien
    const found: string[] = [];
    if (!nama.trim() || !email.trim() || !password || !konfirmasi) found.push('Isian wajib kosong');
    if (password && password.length < 8) found.push('Kata sandi minimal 8 karakter');
    if (password && konfirmasi && password !== konfirmasi) found.push('Kata sandi dan konfirmasi tidak sama');

    if (found.length) {
      setErrors(found);
      return;
    }

    setErrors([]);
    setIsLoading(true);
    try {
      await registerPenghuni({
        nama_lengkap: nama.trim(),
        no_identitas: noIdentitas.trim(),
        email: email.trim(),
        password,
        password_confirm: konfirmasi,
      });
      navigate('/', { replace: true });
    } catch (err) {
      setErrors(extractMessages(err, 'Pendaftaran gagal. Coba lagi beberapa saat.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout wide>
      <h2 className="text-2xl font-bold tracking-tight text-kos-950">Daftar Akun Penghuni</h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">
        Daftarkan akun Anda untuk melihat tagihan, mengunggah bukti pembayaran, dan mengirim keluhan.
      </p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
        {errors.length > 0 && (
          <Alert variant="error" title="Pendaftaran Belum Berhasil">
            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-ink/80">
              {errors.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </Alert>
        )}

        <Field
          label="Nama Lengkap"
          required
          icon={<UserIcon />}
          value={nama}
          onChange={setNama}
          placeholder="misal: Muhammad Fajar Pratama"
          autoComplete="name"
          disabled={isLoading}
        />
        <Field
          label="Nomor identitas"
          icon={<IdCardIcon />}
          value={noIdentitas}
          onChange={setNoIdentitas}
          placeholder="Masukkan nomor identitas"
          inputMode="numeric"
          hint="Sesuai data yang dicatat pengurus kos"
          disabled={isLoading}
        />
        <Field
          label="Email Aktif"
          required
          icon={<MailIcon />}
          value={email}
          onChange={setEmail}
          placeholder="fajar.pratama@email.com"
          type="email"
          autoComplete="email"
          disabled={isLoading}
        />
        <Field
          label="Kata Sandi"
          required
          type="password"
          icon={<LockIcon />}
          value={password}
          onChange={setPassword}
          placeholder="Minimal 8 karakter"
          autoComplete="new-password"
          disabled={isLoading}
        />
        <Field
          label="Konfirmasi Kata Sandi"
          required
          type="password"
          icon={<LockResetIcon />}
          value={konfirmasi}
          onChange={setKonfirmasi}
          placeholder="Ulangi kata sandi Anda"
          autoComplete="new-password"
          disabled={isLoading}
        />

        <div className="pt-1">
          <SubmitButton loading={isLoading} loadingText="Mendaftarkan..." icon={<ArrowRightIcon size={16} />}>
            Daftar Akun
          </SubmitButton>
        </div>
      </form>

      <div className="mt-5 border-t border-slate-200 pt-4 text-center text-[13px] text-ink-soft">
        Sudah punya akun?{' '}
        <Link to="/" className="font-semibold text-kos-700 hover:underline">
          Masuk
        </Link>
      </div>
    </AuthLayout>
  );
}
