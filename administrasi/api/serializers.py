from rest_framework import serializers
from administrasi.models import (
    Kamar, Penghuni, Tagihan, BuktiPembayaran, Keluhan, KategoriKeluhan
)

class KamarSerializer(serializers.ModelSerializer):
    class Meta:
        model = Kamar
        fields = '__all__'

class PenghuniSerializer(serializers.ModelSerializer):
    nama_lengkap = serializers.CharField(source='user.first_name', read_only=True)
    nomor_kamar = serializers.CharField(source='kamar.nomor_kamar', read_only=True)

    class Meta:
        model = Penghuni
        fields = [
            'id', 'user', 'nama_lengkap', 'kamar', 'nomor_kamar',
            'no_identitas', 'no_kontak', 'tanggal_masuk', 'status_aktif'
        ]
        read_only_fields = ['user']

class TagihanSerializer(serializers.ModelSerializer):
    nama_penghuni = serializers.CharField(source='penghuni.user.first_name', read_only=True)
    nomor_kamar = serializers.CharField(source='penghuni.kamar.nomor_kamar', read_only=True)

    class Meta:
        model = Tagihan
        fields = '__all__'
        depth = 2

class BuktiPembayaranSerializer(serializers.ModelSerializer):
    periode_tagihan = serializers.CharField(source='tagihan.periode', read_only=True)
    nominal_tagihan = serializers.FloatField(source='tagihan.nominal', read_only=True)
    nama_penghuni = serializers.CharField(source='tagihan.penghuni.user.first_name', read_only=True)
    nomor_kamar = serializers.CharField(source='tagihan.penghuni.kamar.nomor_kamar', read_only=True)

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

class KeluhanSerializer(serializers.ModelSerializer):
    nama_kategori = serializers.CharField(source='kategori.nama', read_only=True)
    nama_penghuni = serializers.CharField(source='penghuni.user.first_name', read_only=True)
    nomor_kamar = serializers.CharField(source='penghuni.kamar.nomor_kamar', read_only=True)

    class Meta:
        model = Keluhan
        fields = [
            'id', 'penghuni', 'nama_penghuni', 'nomor_kamar',
            'kategori', 'nama_kategori', 'deskripsi', 'foto',
            'status', 'catatan_tindak_lanjut', 'tanggal_kirim'
        ]
        read_only_fields = ['penghuni', 'tanggal_kirim']