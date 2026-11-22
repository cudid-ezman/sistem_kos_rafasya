from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from . import views

urlpatterns = [
    path('login/', views.CustomLoginView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', views.data_diri, name='api_me'),
    path('ganti-password/', views.ganti_password_api, name='api_ganti_password'),
    path('password-reset/', views.request_password_reset_api, name='api_password_reset'),
    path('password-reset/confirm/', views.confirm_password_reset_api, name='api_password_reset_confirm'),
    path('kelola-akun/', views.kelola_akun_staff_api, name='api_kelola_akun'),
    path('kelola-akun/<int:user_id>/', views.hapus_akun_staff_api, name='api_hapus_akun'),

    path('kamar/', views.KamarListCreateAPI.as_view(), name='api_kamar'),
    path('kamar/<int:pk>/', views.KamarDetailAPI.as_view(), name='api_kamar_detail'),

    path('penghuni/', views.PenghuniListCreateAPI.as_view(), name='api_penghuni'),
    path('penghuni/<int:pk>/', views.PenghuniDetailAPI.as_view(), name='api_penghuni_detail'),

    path('tagihan/', views.TagihanListCreateAPI.as_view(), name='api_tagihan'),
    path('tagihan/generate/', views.generate_tagihan_bulanan, name='api_tagihan_generate'),
    path('tagihan/<int:pk>/ajukan-perpanjangan/', views.ajukan_perpanjangan_api, name='api_tagihan_ajukan_perpanjangan'),
    path('tagihan/<int:pk>/respon-perpanjangan/', views.respon_perpanjangan_api, name='api_tagihan_respon_perpanjangan'),

    path('bukti-pembayaran/', views.BuktiPembayaranListCreateAPI.as_view(), name='api-bukti-pembayaran'),
    path('verifikasi/<int:bukti_id>/', views.proses_verifikasi_api, name='api_proses_verifikasi'),

    path('kategori-keluhan/', views.KategoriKeluhanListAPI.as_view(), name='api-kategori-keluhan'),
    path('keluhan/', views.KeluhanListCreateAPI.as_view(), name='api-keluhan'),
    path('keluhan/<int:pk>/', views.KeluhanUpdateAPI.as_view(), name='api_keluhan_update'),

    path('laporan-keuangan/', views.laporan_keuangan_api, name='api_laporan_keuangan'),
    path('informasi/', views.InformasiListCreateAPI.as_view(), name='api_informasi'),
    path('informasi/<int:pk>/', views.InformasiDetailAPI.as_view(), name='api_informasi_detail'),
]