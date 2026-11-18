import { useState, type FormEvent } from "react";
import Modal from "../admin/Modal";
import { inputCls, labelCls } from "../admin/styles";
import { btnOutline, btnPrimary } from "./buttons";
import { useToast } from "./toastContext";
import { extractMessages, gantiPassword } from "../../services/authService";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function UbahPasswordModal({ open, onClose }: Props) {
  const toast = useToast();
  const [passwordLama, setPasswordLama] = useState("");
  const [passwordBaru, setPasswordBaru] = useState("");
  const [konfirmasi, setKonfirmasi] = useState("");
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setPasswordLama("");
    setPasswordBaru("");
    setKonfirmasi("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (passwordBaru.length < 8) {
      toast.error("Kata sandi baru minimal 8 karakter.");
      return;
    }
    if (passwordBaru !== konfirmasi) {
      toast.error("Konfirmasi kata sandi baru tidak sama.");
      return;
    }

    setLoading(true);
    try {
      await gantiPassword(passwordLama, passwordBaru);
      toast.success("Kata sandi berhasil diperbarui.");
      handleClose();
    } catch (err) {
      toast.error(extractMessages(err, "Gagal memperbarui kata sandi.")[0]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Ubah Kata Sandi"
      description="Ganti kata sandi awal Anda dengan kata sandi pribadi yang lebih aman."
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="pw-lama" className={labelCls}>
            Kata Sandi Saat Ini
          </label>
          <input
            id="pw-lama"
            type="password"
            required
            value={passwordLama}
            onChange={(e) => setPasswordLama(e.target.value)}
            placeholder="Masukkan kata sandi saat ini"
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="pw-baru" className={labelCls}>
            Kata Sandi Baru
          </label>
          <input
            id="pw-baru"
            type="password"
            required
            minLength={8}
            value={passwordBaru}
            onChange={(e) => setPasswordBaru(e.target.value)}
            placeholder="Minimal 8 karakter"
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="pw-konfirmasi" className={labelCls}>
            Konfirmasi Kata Sandi Baru
          </label>
          <input
            id="pw-konfirmasi"
            type="password"
            required
            value={konfirmasi}
            onChange={(e) => setKonfirmasi(e.target.value)}
            placeholder="Ulangi kata sandi baru"
            className={inputCls}
          />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={handleClose} className={btnOutline}>
            Batal
          </button>
          <button type="submit" disabled={loading} className={btnPrimary}>
            {loading ? "Menyimpan..." : "Simpan Kata Sandi"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
