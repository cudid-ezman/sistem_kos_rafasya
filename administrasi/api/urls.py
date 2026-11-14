from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from . import views

urlpatterns = [
    path('login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', views.data_diri, name='api_me'),

    path('kamar/', views.KamarListCreateAPI.as_view(), name='api_kamar'),
    path('kamar/<int:pk>/', views.KamarDetailAPI.as_view(), name='api_kamar_detail'),

    path('penghuni/', views.PenghuniListCreateAPI.as_view(), name='api_penghuni'),

    path('tagihan/', views.TagihanListCreateAPI.as_view(), name='api_tagihan'),
    path('tagihan/generate/', views.generate_tagihan_bulanan, name='api_tagihan_generate'),

    path('bukti-pembayaran/', views.BuktiPembayaranListCreateAPI.as_view(), name='api-bukti-pembayaran'),
    path('verifikasi/<int:bukti_id>/', views.proses_verifikasi_api, name='api_proses_verifikasi'),

    path('kategori-keluhan/', views.KategoriKeluhanListAPI.as_view(), name='api-kategori-keluhan'),
    path('keluhan/', views.KeluhanListCreateAPI.as_view(), name='api-keluhan'),
    path('keluhan/<int:pk>/', views.KeluhanUpdateAPI.as_view(), name='api_keluhan_update'),

    path('laporan-keuangan/', views.laporan_keuangan_api, name='api_laporan_keuangan'),
]