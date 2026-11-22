from rest_framework import serializers
from administrasi.models import (
    Kamar, Penghuni, Tagihan, BuktiPembayaran, Keluhan, KategoriKeluhan, RiwayatStatusKeluhan, Informasi
)
from django.contrib.auth.models import User
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

class KamarSerializer(serializers.ModelSerializer):
    jumlah_penghuni = serializers.SerializerMethodField()

    class Meta:
        model = Kamar
        fields = '__all__'

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
    nomor_kamar = serializers.CharField(source='penghuni.kamar.nomor_kamar', read_only=True)

    def get_nama_penghuni(self, obj):
        kamar = getattr(obj.penghuni, 'kamar', None)
        harga_berdua = getattr(kamar, 'harga_berdua', 800000) or 800000
        # Hanya gabungkan 2 nama jika nominal tagihan memang tarif berdua (>= harga_berdua)
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
    nominal_tagihan = serializers.FloatField(source='tagihan.nominal', read_only=True)
    nama_penghuni = serializers.SerializerMethodField()
    nomor_kamar = serializers.CharField(source='tagihan.penghuni.kamar.nomor_kamar', read_only=True)

    def get_nama_penghuni(self, obj):
        pengaju = obj.diunggah_oleh or obj.tagihan.penghuni
        if pengaju and pengaju.user:
            return pengaju.user.first_name or pengaju.user.username
        return "-" 

    class Meta:
        model = BuktiPembayaran
        fields = [
            'id', 'tagihan', 'periode_tagihan', 'nominal_tagihan',
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
            'kategori', 'nama_kategori', 'deskripsi', 'foto',
            'status', 'catatan_tindak_lanjut', 'tanggal_kirim',
            'tanggal_diperbarui', 'riwayat_status'
        ]
        read_only_fields = ['penghuni', 'tanggal_kirim']

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