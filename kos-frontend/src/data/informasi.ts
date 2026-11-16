export interface BagianInformasi {
  judul: string;
  paragraf: string[];
}

export interface Informasi {
  slug: string;
  judul: string;
  ringkas: string;
  diperbarui: string;
  intro?: string;
  bagian: BagianInformasi[];
}

/**
 * Konten Pusat Informasi (sementara statis, sesuai desain).
 * Jika bagian dikosongkan, halaman detail menampilkan "belum diisi pengurus".
 * Nanti bisa dihubungkan ke model Informasi di backend.
 */
export const DAFTAR_INFORMASI: Informasi[] = [
  {
    slug: 'aturan-kos',
    judul: 'Aturan Kos',
    ringkas: 'Tata tertib dan ketentuan tinggal di Kos Rafasya.',
    diperbarui: '01/12/2026',
    intro:
      'Untuk menciptakan lingkungan hunian yang tertib, harmonis, aman, dan nyaman bagi seluruh penghuni, pengelola Kos Rafasya menetapkan serangkaian aturan bersama. Seluruh penghuni yang telah terdaftar secara resmi berkewajiban memahami serta mematuhi seluruh tata tertib yang berlaku selama masa sewa kamar.',
    bagian: [
      {
        judul: 'Ketentuan Jam Bertamu',
        paragraf: [
          'Waktu kunjungan tamu luar dibatasi hingga pukul 22.00 WIB setiap harinya demi menjaga ketenangan penghuni lainnya. Tamu lawan jenis dilarang keras memasuki area lorong kamar pribadi dan hanya diperkenankan berada di ruang tamu utama atau area lobi lantai satu.',
          'Setiap tamu yang berencana menginap wajib memberitahukan pengelola sekurang-kurangnya 1x24 jam sebelumnya serta melampirkan identitas resmi (KTP/SIM) dan dikenakan biaya tambahan sesuai regulasi kos.',
        ],
      },
      {
        judul: 'Kebersihan dan Penggunaan Fasilitas Bersama',
        paragraf: [
          'Dapur bersama, ruang jemur pakaian, dispenser air minum, dan kulkas komunal merupakan fasilitas yang digunakan bersama. Penghuni wajib mencuci peralatan masak atau makan segera setelah penggunaan serta membuang sisa makanan pada tempat sampah tertutup yang disediakan.',
          'Menjaga kebersihan lorong di depan kamar masing-masing merupakan tanggung jawab individu. Penghuni tidak diperkenankan menumpuk alas kaki berlebih, kardus kemasan, atau kantong sampah di luar pintu kamar.',
        ],
      },
      {
        judul: 'Keamanan Kamar & Efisiensi Energi',
        paragraf: [
          'Pastikan pintu kamar terkunci dengan baik saat ditinggalkan beraktivitas di luar kos. Pengelola tidak bertanggung jawab atas kehilangan barang pribadi berharga yang diakibatkan oleh kelalaian penguncian pintu atau jendela kamar.',
          'Matikan pendingin ruangan (AC), lampu penerangan, dan alat elektronik pemanas sebelum meninggalkan kamar guna menjaga keselamatan instalasi kelistrikan serta mencegah risiko bahaya kebakaran.',
        ],
      },
    ],
  },
  {
    slug: 'jadwal-gerbang',
    judul: 'Jadwal Operasional Gerbang',
    ringkas: 'Jam buka dan tutup gerbang kos.',
    diperbarui: '01/12/2026',
    bagian: [],
  },
  {
    slug: 'wifi',
    judul: 'Status Jaringan Wi-Fi',
    ringkas: 'Status jaringan Wi-Fi kos saat ini.',
    diperbarui: '01/12/2026',
    bagian: [],
  },
];
