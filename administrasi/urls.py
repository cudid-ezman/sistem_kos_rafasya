from django.urls import path
from . import views
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('data-kamar/', views.data_kamar, name='data_kamar'),
    path('kamar/tambah/', views.tambah_kamar, name='tambah_kamar'),
    path('data-penghuni/', views.data_penghuni, name='data_penghuni'),
    path('penghuni/tambah/', views.tambah_penghuni, name='tambah_penghuni'),
    path('laporan-keuangan/', views.laporan_keuangan, name='laporan_keuangan'),
    path('tagihan-saya/', views.tagihan_saya, name='tagihan_saya'),
    path('tagihan/', views.tagihan_pengurus, name='tagihan_pengurus'),
    path('tagihan/buat/', views.buat_tagihan, name='buat_tagihan'),
    path('tagihan/bayar/<int:tagihan_id>/', views.bayar_tagihan, name='bayar_tagihan'),
    path('verifikasi/', views.daftar_verifikasi, name='daftar_verifikasi'),
    path('verifikasi/proses/<int:bukti_id>/<str:aksi>/', views.proses_verifikasi, name='proses_verifikasi'),
    path('keluhan-saya/', views.keluhan_penghuni, name='keluhan_penghuni'),
    path('daftar-keluhan/', views.daftar_keluhan, name='daftar_keluhan'),
    path('keluhan/proses/<int:keluhan_id>/<str:status_baru>/', views.proses_keluhan, name='proses_keluhan'),

    # Rute API REST
    path('api/kamar/', views.KamarListCreateAPI.as_view(), name='api_kamar'),
    path('api/penghuni/', views.PenghuniListCreateAPI.as_view(), name='api_penghuni'),
    path('api/tagihan/', views.TagihanListCreateAPI.as_view(), name='api_tagihan'),
    path('api/keluhan/', views.KeluhanListCreateAPI.as_view(), name='api_keluhan'),
    path('api/login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/me/', views.data_diri, name='api_me'),
]