import re
from rest_framework import serializers
from administrasi.models import (
    Kamar, Penghuni, Tagihan, BuktiPembayaran, Keluhan, KategoriKeluhan, RiwayatStatusKeluhan, Informasi
)
from django.contrib.auth.models import User
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

def _normalisasi_nomor_kamar(value: str) -> str:
    teks = re.sub(r'\s+', '', (value or '').strip().upper())
    m = re.match(r'^([A-Z]+)(\d+)$', teks)
    if m:
        huruf, angka = m.group(1), int(m.group(2))
        return f"{huruf}{angka:02d}"
    return teks


class KamarSerializer(serializers.ModelSerializer):
    jumlah_penghuni = serializers.SerializerMethodField()

    class Meta:
        model = Kamar
        fields = '__all__'

    def validate_nomor_kamar(self, value):
        normal = _normalisasi_nomor_kamar(value)
        if not normal:
            raise serializers.ValidationError("Nomor kamar wajib diisi.")
        qs = Kamar.objects.filter(nomor_kamar__iexact=normal)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(f"Nomor kamar {normal} sudah terdaftar.")
        return normal

    def get_jumlah_penghuni(self, obj):
        return obj.penghuni_set.filter(status_aktif=True).count()

class PenghuniSerializer(serializers.ModelSerializer):
    nama_lengkap = serializers.CharField(source='user.first_name', read_only=True)
    nomor_kamar = serializers.CharField(source='kamar.nomor_kamar', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)

    class Meta:
        model = Penghuni
        fields = [
            'id', 'user', 'nama_lengkap', 'kamar', 'nomor_kamar',
            'no_identitas', 'email', 'no_kontak', 'tanggal_masuk', 'status_aktif'
        ]
        read_only_fields = ['user']

class TagihanSerializer(serializers.ModelSerializer):
    nama_penghuni = serializers.SerializerMethodField()
    nomor_kamar = serializers.SerializerMethodField()
    denda = serializers.SerializerMethodField()
    hari_terlambat = serializers.SerializerMethodField()
    total_tagihan = serializers.SerializerMethodField()

    def _info_denda(self, obj):
        if obj.status in ['lunas', 'menunggu_verifikasi']:
            return int(obj.hari_terlambat or 0), float(obj.denda or 0)
        hari, nominal_denda = obj.hitung_denda_pada()
        return hari, nominal_denda

    def get_denda(self, obj):
        return self._info_denda(obj)[1]

    def get_hari_terlambat(self, obj):
        return self._info_denda(obj)[0]

    def get_total_tagihan(self, obj):
        return float(obj.nominal or 0) + self._info_denda(obj)[1]

    def get_nomor_kamar(self, obj):
        if obj.kamar:
            return obj.kamar.nomor_kamar
        if obj.penghuni and obj.penghuni.kamar:
            return obj.penghuni.kamar.nomor_kamar
        return "-"

    def get_nama_penghuni(self, obj):
        if (obj.nama_penghuni_snapshot or '').strip():
            return obj.nama_penghuni_snapshot.strip()
        kamar = obj.kamar or getattr(obj.penghuni, 'kamar', None)
        harga_berdua = getattr(kamar, 'harga_berdua', 800000) or 800000
        if kamar and (obj.nominal or 0) >= harga_berdua:
            penghuni_kamar = list(
                Penghuni.objects.filter(kamar=kamar, status_aktif=True)
                .select_related('user')
                .order_by('tanggal_masuk', 'id')
            )
            if len(penghuni_kamar) > 1:
                nama_list = [
                    (p.user.first_name or p.user.username).strip()
                    for p in penghuni_kamar
                ]
                return " & ".join(nama_list)
        if obj.penghuni and obj.penghuni.user:
            return obj.penghuni.user.first_name or obj.penghuni.user.username
        return "-"

    class Meta:
        model = Tagihan
        fields = '__all__'
        read_only_fields = ('tanggal_perpanjangan', 'alasan_perpanjangan', 'status_perpanjangan')
        depth = 2

class BuktiPembayaranSerializer(serializers.ModelSerializer):
    periode_tagihan = serializers.CharField(source='tagihan.periode', read_only=True)
    nominal_pokok = serializers.FloatField(source='tagihan.nominal', read_only=True)
    denda_tagihan = serializers.SerializerMethodField()
    nominal_tagihan = serializers.SerializerMethodField()
    nama_penghuni = serializers.SerializerMethodField()
    nomor_kamar = serializers.SerializerMethodField()

    def _denda_untuk_bukti(self, obj):
        t = obj.tagihan
        if t.status in ['lunas', 'menunggu_verifikasi'] and (t.denda or 0) > 0:
            return float(t.denda or 0)
        _, d = t.hitung_denda_pada(obj.tanggal_bayar)
        return max(float(t.denda or 0), d)

    def get_denda_tagihan(self, obj):
        return self._denda_untuk_bukti(obj)

    def get_nominal_tagihan(self, obj):
        return float(obj.tagihan.nominal or 0) + self._denda_untuk_bukti(obj)

    def get_nomor_kamar(self, obj):
        if obj.tagihan.kamar:
            return obj.tagihan.kamar.nomor_kamar
        if obj.tagihan.penghuni and obj.tagihan.penghuni.kamar:
            return obj.tagihan.penghuni.kamar.nomor_kamar
        return "-"

    def get_nama_penghuni(self, obj):
        pengaju = obj.diunggah_oleh or obj.tagihan.penghuni
        if pengaju and pengaju.user:
            return pengaju.user.first_name or pengaju.user.username
        return "-" 

    class Meta:
        model = BuktiPembayaran
        fields = [
            'id', 'tagihan', 'periode_tagihan', 'nominal_pokok', 'denda_tagihan', 'nominal_tagihan',
            'nama_penghuni', 'nomor_kamar', 'berkas', 'tanggal_bayar',
            'waktu_unggah', 'status', 'catatan_penolakan', 'tanggal_verifikasi'
        ]
        read_only_fields = ['status', 'waktu_unggah', 'tanggal_verifikasi']

class KategoriKeluhanSerializer(serializers.ModelSerializer):
    class Meta:
        model = KategoriKeluhan
        fields = ['id', 'nama']

class RiwayatStatusKeluhanSerializer(serializers.ModelSerializer):
    class Meta:
        model = RiwayatStatusKeluhan
        fields = ['id', 'status', 'catatan', 'waktu']


class KeluhanSerializer(serializers.ModelSerializer):
    nama_kategori = serializers.CharField(source='kategori.nama', read_only=True)
    kategori_custom = serializers.CharField(write_only=True, required=False, allow_blank=True)
    nama_penghuni = serializers.CharField(source='penghuni.user.first_name', read_only=True)
    nomor_kamar = serializers.CharField(source='penghuni.kamar.nomor_kamar', read_only=True)
    riwayat_status = RiwayatStatusKeluhanSerializer(
        source='riwayatstatuskeluhan_set', many=True, read_only=True
    )
    tanggal_diperbarui = serializers.SerializerMethodField()

    class Meta:
        model = Keluhan
        fields = [
            'id', 'penghuni', 'nama_penghuni', 'nomor_kamar',
            'kategori', 'kategori_custom', 'nama_kategori', 'deskripsi', 'foto',
            'status', 'catatan_tindak_lanjut',
            'dieskalasi_pemilik', 'nominal_pengajuan', 'catatan_pengajuan',
            'status_pemilik', 'nominal_pencairan', 'catatan_pemilik', 'tanggal_pencairan',
            'tanggal_kirim', 'tanggal_diperbarui', 'riwayat_status'
        ]
        read_only_fields = ['penghuni', 'tanggal_kirim', 'tanggal_pencairan']
        extra_kwargs = {
            'kategori': {'required': False, 'allow_null': True},
        }

    def get_tanggal_diperbarui(self, obj):
        terakhir = obj.riwayatstatuskeluhan_set.order_by('-waktu', '-id').first()
        return terakhir.waktu if terakhir else None

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Mengizinkan login menggunakan Email, Username, maupun Nama Lengkap (case-insensitive)."""
    def validate(self, attrs):
        identifier = (attrs.get('username') or '').strip()
        if identifier:
            if '@' in identifier:
                user_match = User.objects.filter(email__iexact=identifier).first() or User.objects.filter(username__iexact=identifier).first()
                if user_match:
                    attrs['username'] = user_match.username
            else:
                # 1. Cek berdasarkan username (case-insensitive)
                user_match = User.objects.filter(username__iexact=identifier).first()
                # 2. Jika tidak ketemu, cek berdasarkan nama lengkap (first_name) jika unik
                if not user_match:
                    qs_nama = User.objects.filter(first_name__iexact=identifier)
                    if qs_nama.count() == 1:
                        user_match = qs_nama.first()
                if user_match:
                    attrs['username'] = user_match.username
        return super().validate(attrs)

class AkunStaffSerializer(serializers.ModelSerializer):
    nama_lengkap = serializers.CharField(source='first_name', read_only=True)
    role = serializers.CharField(source='profiluser.role', read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'nama_lengkap', 'role', 'date_joined']

class InformasiSerializer(serializers.ModelSerializer):
    class Meta:
        model = Informasi
        fields = ['id', 'kategori', 'ringkasan', 'isi', 'ikon', 'tanggal_pembaruan']
        read_only_fields = ['tanggal_pembaruan']