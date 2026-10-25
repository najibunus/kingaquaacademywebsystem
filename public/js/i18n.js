/**
 * KINGAQUA ACADEMY — Dual Language System (English & Bahasa Melayu)
 * Dynamically switches all landing page content between EN and BM
 * while preserving original English DOM content for instant toggling.
 */

'use strict';

(function initI18n() {
  const STORAGE_KEY = 'kingaqua_lang';
  let currentLang = localStorage.getItem(STORAGE_KEY) || 'en';

  // Selector-based translation map (BM translations; EN is captured from initial DOM)
  const BM_TRANSLATIONS = [
    // ── NAVIGATION (Desktop & Mobile) ──
    { sel: '.nav-links li:nth-child(1) .nav-link', html: 'Tentang Kami' },
    { sel: '.nav-links li:nth-child(2) .nav-link', html: 'Program' },
    { sel: '.nav-links li:nth-child(3) .nav-link', html: 'Jurulatih' },
    { sel: '.nav-links li:nth-child(4) .nav-link', html: 'Kemudahan' },
    { sel: '.nav-links li:nth-child(5) .nav-link', html: 'Ulasan' },
    { sel: '.nav-links li:nth-child(6) .nav-link', html: 'Soalan Lazim' },
    { sel: '.nav-actions-container a[href="#contact"]', html: 'Daftar' },
    { sel: '.nav-actions-container a[href="/auth/login"]', html: 'Log Masuk' },

    { sel: '#mobile-about', html: 'Tentang Kami' },
    { sel: '#mobile-why', html: 'Mengapa Pilih Kami' },
    { sel: '#mobile-programs', html: 'Program Renang' },
    { sel: '#mobile-coaches', html: 'Jurulatih Kami' },
    { sel: '#mobile-facilities', html: 'Kemudahan' },
    { sel: '#mobile-testimonials', html: 'Ulasan Ibu Bapa' },
    { sel: '#mobile-gallery', html: 'Galeri' },
    { sel: '#mobile-faq', html: 'Soalan Lazim (FAQ)' },
    { sel: '#mobile-contact-link', html: 'Hubungi Kami' },
    { sel: '#mobile-join-btn', html: 'Daftar Sekarang' },
    { sel: '#mobile-call-btn', html: 'Log Masuk' },

    // ── HERO SECTION ──
    {
      sel: '.hero-description',
      html: 'Kingaqua Academy, tempat keyakinan dibina satu pusingan demi satu pusingan. Program renang profesional untuk semua peringkat umur, dibimbing oleh jurulatih bertauliah dalam persekitaran yang selamat dan mesra.',
    },
    { sel: '#hero-join-btn', html: 'Daftar Sekarang' },
    { sel: '#hero-programs-btn', html: 'Log Masuk' },
    { sel: '.hero-stats .hero-stat:nth-child(1) .hero-stat-label', html: 'Pelajar Dilatih' },
    { sel: '.hero-stats .hero-stat:nth-child(2) .hero-stat-label', html: 'Program' },
    { sel: '.hero-stats .hero-stat:nth-child(3) .hero-stat-label', html: 'Jurulatih Bertauliah' },

    // ── ABOUT SECTION ──
    { sel: '.about-badge-text', html: 'Tahun Kecemerlangan' },
    { sel: '#about .section-label', html: 'Tentang Kingaqua Academy' },
    {
      sel: '#about-heading',
      html: 'Kecemerlangan Akuatik,<br/><span class="highlight">Penyelamatan &amp; Kepimpinan</span>',
    },
    {
      sel: '.about-text p:nth-child(1)',
      html: 'Diasaskan oleh <strong>Encik Abu Sufian bin Supaat</strong> &mdash; Presiden Gerakan Belia 4B Sri Gading dan Presiden MAQRA Johor &mdash; <strong>Kingaqua Academy</strong> merupakan pusat latihan sukan akuatik dan penyelamatan terkemuka di Johor. Dipacu oleh slogan institusi kami <em>"FlyHigh"</em>, kami menggabungkan program renang berstruktur dengan latihan Penyelamat &amp; Bantuan Hidup Asas (BLS) bertauliah serta pemulihan terapi akuatik.',
    },
    {
      sel: '.about-text p:nth-child(2)',
      html: 'Daripada kanak-kanak kecil dan dewasa baru belajar hinggalah atlet remaja kompetitif dan pelajar universiti, kami komited terhadap pencegahan lemas, keyakinan di air, dan kecemerlangan sukan. Melalui kerjasama strategik bersama <strong>Universiti Tun Hussein Onn Malaysia (UTHM)</strong>, kami beroperasi di lokasi latihan di <strong>Pura Kencana, Sri Gading (Batu Pahat)</strong>, serta di <strong>UTHM Parit Raja</strong> dan <strong>Pontian</strong>.',
    },
    { sel: '.about-features .about-feature:nth-child(1) strong', html: 'Penyelamatan &amp; BLS' },
    { sel: '.about-features .about-feature:nth-child(1) .about-feature-text span', html: 'Latihan penyelamatan bertauliah MAQRA' },
    { sel: '.about-features .about-feature:nth-child(2) strong', html: 'Rakan Institusi' },
    { sel: '.about-features .about-feature:nth-child(2) .about-feature-text span', html: 'Modul renang rasmi UTHM' },
    { sel: '.about-features .about-feature:nth-child(3) strong', html: 'Lokasi Pelbagai Hab' },
    { sel: '.about-features .about-feature:nth-child(3) .about-feature-text span', html: 'Pura Kencana, UTHM Parit Raja &amp; Pontian' },
    { sel: '.about-features .about-feature:nth-child(4) strong', html: 'Semua Peringkat Umur' },
    { sel: '.about-features .about-feature:nth-child(4) .about-feature-text span', html: 'Kanak-kanak, atlet &amp; pelajar universiti' },
    { sel: '#about-programs-btn', html: 'Lihat Program' },
    { sel: '#about-contact-btn', html: 'Hubungi Kami' },

    // ── WHY CHOOSE US ──
    { sel: '#why-us .section-label', html: 'Mengapa Pilih Kami' },
    { sel: '#why-heading', html: 'Keistimewaan Kingaqua' },
    {
      sel: '#why-us .section-subheading',
      html: 'Kami menawarkan lebih daripada sekadar kelas renang biasa. Akademi kami komited terhadap kecemerlangan, keselamatan, dan membantu setiap pelajar mencapai potensi penuh mereka di dalam air.',
    },
    { sel: '.features-grid .feature-card:nth-child(1) .feature-title', html: 'Jurulatih Bertauliah' },
    {
      sel: '.features-grid .feature-card:nth-child(1) .feature-desc',
      html: 'Semua jurulatih kami memegang sijil kejurulatihan renang yang diiktiraf di peringkat kebangsaan dengan pembangunan profesional berterusan.',
    },
    { sel: '.features-grid .feature-card:nth-child(2) .feature-title', html: 'Saiz Kelas Kecil' },
    {
      sel: '.features-grid .feature-card:nth-child(2) .feature-desc',
      html: 'Kami mengekalkan nisbah pelajar kepada jurulatih yang kecil bagi memastikan perhatian peribadi dan penguasaan kemahiran yang pantas.',
    },
    { sel: '.features-grid .feature-card:nth-child(3) .feature-title', html: 'Kaedah Moden' },
    {
      sel: '.features-grid .feature-card:nth-child(3) .feature-desc',
      html: 'Teknik latihan progresif berasaskan bukti yang disesuaikan mengikut umur, kebolehan, dan gaya pembelajaran setiap perenang.',
    },
    { sel: '.features-grid .feature-card:nth-child(4) .feature-title', html: 'Persekitaran Selamat' },
    {
      sel: '.features-grid .feature-card:nth-child(4) .feature-desc',
      html: 'Penyelamat bertauliah, kolam yang bersih, dan protokol keselamatan yang ketat memastikan setiap perenang dilindungi sepanjang masa.',
    },
    { sel: '.features-grid .feature-card:nth-child(5) .feature-title', html: 'Jadual Fleksibel' },
    {
      sel: '.features-grid .feature-card:nth-child(5) .feature-desc',
      html: 'Slot waktu pagi, petang, dan hujung minggu disediakan untuk menyesuaikan jadual sekolah, kerja, dan komitmen keluarga.',
    },
    { sel: '.features-grid .feature-card:nth-child(6) .feature-title', html: 'Pemantauan Kemajuan' },
    {
      sel: '.features-grid .feature-card:nth-child(6) .feature-desc',
      html: 'Penilaian berkala dan laporan pencapaian supaya ibu bapa sentiasa mengetahui perkembangan sebenar anak mereka.',
    },
    { sel: '.features-grid .feature-card:nth-child(7) .feature-title', html: 'Program Keluarga' },
    {
      sel: '.features-grid .feature-card:nth-child(7) .feature-desc',
      html: 'Daripada kanak-kanak kecil hingga dewasa, kami menawarkan program untuk seisi keluarga — berenang dan berkembang bersama.',
    },
    { sel: '.features-grid .feature-card:nth-child(8) .feature-title', html: 'Pakej Berpatutan' },
    {
      sel: '.features-grid .feature-card:nth-child(8) .feature-desc',
      html: 'Kualiti premium pada harga mampu milik, dengan pelan pembayaran fleksibel dan diskaun adik-beradik disediakan.',
    },

    // ── SWIMMING PROGRAMS ──
    { sel: '#programs .section-label', html: 'Program Renang' },
    { sel: '#programs-heading', html: 'Program Untuk Setiap Perenang' },
    {
      sel: '#programs .section-subheading',
      html: 'Sama ada anak anda baru pertama kali mengenal air atau sedang berlatih untuk pertandingan, kami menyediakan program berstruktur khas untuk mereka.',
    },

    // Card 1: Beginner
    { sel: '.programs-grid .program-card:nth-child(1) .program-badge', html: 'Paling Popular' },
    { sel: '.programs-grid .program-card:nth-child(1) .program-meta span:nth-child(2)', html: 'Umur 4 &ndash; 7 tahun' },
    { sel: '.programs-grid .program-card:nth-child(1) .program-meta span:nth-child(4)', html: 'Semua Tahap Dialu-alukan' },
    { sel: '.programs-grid .program-card:nth-child(1) .program-title', html: 'Permulaan (Beginner)' },
    {
      sel: '.programs-grid .program-card:nth-child(1) .program-desc',
      html: 'Sesuai untuk perenang kali pertama. Program permulaan kami memperkenalkan keyakinan air, asas apungan, tendangan, dan teknik pernafasan dalam suasana yang menyeronokkan dan tanpa tekanan.',
    },
    { sel: '#prog-beginner-btn', html: 'Daftar Sekarang &rarr;' },

    // Card 2: Kiddies
    { sel: '.programs-grid .program-card:nth-child(2) .program-badge', html: 'Umur 3+' },
    { sel: '.programs-grid .program-card:nth-child(2) .program-meta span:nth-child(2)', html: 'Umur 3 &ndash; 5 tahun' },
    { sel: '.programs-grid .program-card:nth-child(2) .program-meta span:nth-child(4)', html: 'Mesra Kanak-kanak Kecil' },
    { sel: '.programs-grid .program-card:nth-child(2) .program-title', html: 'Kiddies (Kanak-kanak Kecil)' },
    {
      sel: '.programs-grid .program-card:nth-child(2) .program-desc',
      html: 'Pengenalan air yang ceria bersama bantuan ibu bapa untuk kanak-kanak kecil. Fokus kepada penyesuaian diri di air, aktiviti percikan, dan pembangunan kuak awal melalui permainan.',
    },
    { sel: '#prog-kiddies-btn', html: 'Daftar Sekarang &rarr;' },

    // Card 3: Aquaplay
    { sel: '.programs-grid .program-card:nth-child(3) .program-badge', html: 'Seronok &amp; Aktif' },
    { sel: '.programs-grid .program-card:nth-child(3) .program-meta span:nth-child(2)', html: 'Umur 4 &ndash; 10 tahun' },
    { sel: '.programs-grid .program-card:nth-child(3) .program-meta span:nth-child(4)', html: 'Rekreasi' },
    { sel: '.programs-grid .program-card:nth-child(3) .program-title', html: 'Aquaplay' },
    {
      sel: '.programs-grid .program-card:nth-child(3) .program-desc',
      html: 'Permainan dan aktiviti air berstruktur yang membina kecergasan fizikal, koordinasi, dan minat terhadap air dalam suasana berkumpulan yang bertenaga.',
    },
    { sel: '#prog-aquaplay-btn', html: 'Daftar Sekarang &rarr;' },

    // Card 4: Novice
    { sel: '.programs-grid .program-card:nth-child(4) .program-badge', html: 'Pertengahan' },
    { sel: '.programs-grid .program-card:nth-child(4) .program-meta span:nth-child(2)', html: 'Umur 7 &ndash; 12 tahun' },
    { sel: '.programs-grid .program-card:nth-child(4) .program-meta span:nth-child(4)', html: 'Asas Renang' },
    { sel: '.programs-grid .program-card:nth-child(4) .program-title', html: 'Novis (Novice)' },
    {
      sel: '.programs-grid .program-card:nth-child(4) .program-desc',
      html: 'Untuk pelajar yang sudah boleh melakukan kuak asas tetapi ingin memperkemas teknik, meningkatkan stamina, dan membina keyakinan dalam pelbagai gaya renang.',
    },
    { sel: '#prog-novice-btn', html: 'Daftar Sekarang &rarr;' },

    // Card 5: Advanced
    { sel: '.programs-grid .program-card:nth-child(5) .program-badge', html: 'Prestasi Tinggi' },
    { sel: '.programs-grid .program-card:nth-child(5) .program-meta span:nth-child(2)', html: 'Semua Peringkat Umur' },
    { sel: '.programs-grid .program-card:nth-child(5) .program-meta span:nth-child(4)', html: 'Tahap Kompetitif' },
    { sel: '.programs-grid .program-card:nth-child(5) .program-title', html: 'Lanjutan (Advanced)' },
    {
      sel: '.programs-grid .program-card:nth-child(5) .program-desc',
      html: 'Latihan intensif untuk perenang kompetitif. Merangkumi keempat-empat kuak, pusingan (turn), terjunan permulaan, strategi perlumbaan, dan latihan kecergasan darat.',
    },
    { sel: '#prog-advanced-btn', html: 'Daftar Sekarang &rarr;' },

    // Card 6: Private Lessons
    { sel: '.programs-grid .program-card:nth-child(6) .program-badge', html: '1-ke-1' },
    { sel: '.programs-grid .program-card:nth-child(6) .program-meta span:nth-child(2)', html: 'Semua Peringkat Umur' },
    { sel: '.programs-grid .program-card:nth-child(6) .program-meta span:nth-child(4)', html: 'Peribadi' },
    { sel: '.programs-grid .program-card:nth-child(6) .program-title', html: 'Kelas Persendirian (Private)' },
    {
      sel: '.programs-grid .program-card:nth-child(6) .program-desc',
      html: 'Sesi bimbingan satu-ke-satu yang disesuaikan sepenuhnya mengikut matlamat individu anda &mdash; sama ada untuk penguasaan pantas, pembetulan kuak, atau persediaan ujian.',
    },
    { sel: '#prog-private-btn', html: 'Tempah Sesi &rarr;' },

    // Card 7: Ladies Swimming
    { sel: '.programs-grid .program-card:nth-child(7) .program-badge', html: 'Wanita Sahaja' },
    { sel: '.programs-grid .program-card:nth-child(7) .program-meta span:nth-child(2)', html: 'Wanita Sahaja' },
    { sel: '.programs-grid .program-card:nth-child(7) .program-meta span:nth-child(4)', html: 'Semua Tahap' },
    { sel: '.programs-grid .program-card:nth-child(7) .program-title', html: 'Kelas Renang Wanita' },
    {
      sel: '.programs-grid .program-card:nth-child(7) .program-desc',
      html: 'Semua kelas wanita dikendalikan sepenuhnya oleh jurulatih wanita sahaja. Sila ambil perhatian bahawa sesi dijalankan di kemudahan kolam utama kami (tiada kolam tertutup khas wanita), dengan suasana yang menyokong, sopan, dan selesa.',
    },
    { sel: '#prog-ladies-btn', html: 'Daftar Sekarang &rarr;' },

    // Card 8: Men's Class
    { sel: '.programs-grid .program-card:nth-child(8) .program-badge', html: 'Lelaki Sahaja' },
    { sel: '.programs-grid .program-card:nth-child(8) .program-meta span:nth-child(2)', html: 'Lelaki Sahaja' },
    { sel: '.programs-grid .program-card:nth-child(8) .program-meta span:nth-child(4)', html: 'Semua Tahap' },
    { sel: '.programs-grid .program-card:nth-child(8) .program-title', html: 'Kelas Renang Lelaki' },
    {
      sel: '.programs-grid .program-card:nth-child(8) .program-desc',
      html: 'Sesi renang dewasa berstruktur khas untuk lelaki. Fokus pada keyakinan di air, biomekanik kuak, kecergasan kardiovaskular, dan stamina diri.',
    },
    { sel: '#prog-mens-btn', html: 'Daftar Sekarang &rarr;' },

    // ── LEARNING JOURNEY TIMELINE ──
    { sel: '#journey .section-label', html: 'Perjalanan Anda' },
    { sel: '#journey-heading', html: 'Dari Percikan Pertama Hingga Juara' },
    {
      sel: '#journey .section-subheading',
      html: 'Setiap perenang hebat bermula dari tepi kolam. Kurikulum berstruktur kami membimbing anda langkah demi langkah melalui setiap pencapaian.',
    },
    { sel: '.timeline .timeline-item:nth-of-type(2) .timeline-step', html: 'Langkah 1' },
    { sel: '.timeline .timeline-item:nth-of-type(2) .timeline-title', html: 'Percikan Pertama' },
    {
      sel: '.timeline .timeline-item:nth-of-type(2) .timeline-desc',
      html: 'Perjalanan anda bermula dengan membiasakan diri di dalam air. Tanpa tekanan &mdash; hanya keseronokan, permainan, dan penyesuaian mengikut rentak anda sendiri.',
    },
    { sel: '.timeline .timeline-item:nth-of-type(3) .timeline-step', html: 'Langkah 2' },
    { sel: '.timeline .timeline-item:nth-of-type(3) .timeline-title', html: 'Keyakinan Di Air' },
    {
      sel: '.timeline .timeline-item:nth-of-type(3) .timeline-desc',
      html: 'Belajar untuk berasa selamat dan bergerak bebas di dalam air. Menyelam asas, meniup buih, dan kawalan badan menjadi asas yang kukuh.',
    },
    { sel: '.timeline .timeline-item:nth-of-type(4) .timeline-step', html: 'Langkah 3' },
    { sel: '.timeline .timeline-item:nth-of-type(4) .timeline-title', html: 'Kemahiran Berenang' },
    {
      sel: '.timeline .timeline-item:nth-of-type(4) .timeline-desc',
      html: 'Menguasai mekanik kuak penting, pernafasan berirama, keseimbangan apungan, dan pergerakan berkoordinasi untuk berenang dengan lancar dan berdikari.',
    },
    { sel: '.timeline .timeline-item:nth-of-type(5) .timeline-step', html: 'Langkah 4' },
    { sel: '.timeline .timeline-item:nth-of-type(5) .timeline-title', html: 'Lanjutan &amp; Pertandingan' },
    {
      sel: '.timeline .timeline-item:nth-of-type(5) .timeline-desc',
      html: 'Memperhalusi terjunan permulaan, pusingan, daya tahan, dan kelajuan di kolam bersaiz Olimpik 50 meter kami. Perenang bersedia mewakili akademi dengan penuh kebanggaan.',
    },

    // ── OUR COACHES ──
    { sel: '#coaches .section-label', html: 'Jurulatih Kami' },
    { sel: '#coaches-heading', html: 'Kenali Pasukan Pakar Kami' },
    {
      sel: '#coaches .section-subheading',
      html: 'Jurulatih kami bukan sekadar tenaga pengajar &mdash; mereka adalah mentor, pendorong semangat, dan pembimbing berdedikasi untuk potensi setiap perenang.',
    },
    // Coach 1: Asraf
    { sel: '.coaches-grid .coach-card:nth-child(1) .coach-cert-tag:nth-child(1)', html: 'Jurulatih Kanak-kanak' },
    { sel: '.coaches-grid .coach-card:nth-child(1) .coach-cert-tag:nth-child(2)', html: 'Bertauliah MAS &amp; MAQRA' },
    { sel: '.coaches-grid .coach-card:nth-child(1) .coach-cert-tag:nth-child(3)', html: 'Keselamatan Air &amp; CPR' },
    { sel: '.coaches-grid .coach-card:nth-child(1) .coach-position', html: 'Jurulatih Kiddies &amp; Permulaan' },
    {
      sel: '.coaches-grid .coach-card:nth-child(1) .coach-bio',
      html: 'Terkenal dengan pendekatan beliau yang lembut, sabar, dan sangat memberi galakan, Coach Asraf merupakan jurulatih khusus kami untuk kanak-kanak kecil dan perenang baharu. Beliau mewujudkan suasana ceria tanpa rasa takut supaya kanak-kanak cepat membina keyakinan air, menguasai pernafasan selamat, dan mempelajari asas kuak dengan mudah.',
    },
    { sel: '.coaches-grid .coach-card:nth-child(1) .coach-meta-item:nth-child(1)', keepSvgText: 'Kiddies &amp; Permulaan' },
    { sel: '.coaches-grid .coach-card:nth-child(1) .coach-meta-item:nth-child(2)', keepSvgText: 'Bertauliah MAS &amp; MAQRA' },
    // Coach 2: Diana
    { sel: '.coaches-grid .coach-card:nth-child(2) .coach-cert-tag:nth-child(1)', html: 'Jurulatih Wanita' },
    { sel: '.coaches-grid .coach-card:nth-child(2) .coach-cert-tag:nth-child(2)', html: 'Bertauliah MAS &amp; MAQRA' },
    { sel: '.coaches-grid .coach-card:nth-child(2) .coach-cert-tag:nth-child(3)', html: 'Jurulatih Novis' },
    { sel: '.coaches-grid .coach-card:nth-child(2) .coach-position', html: 'Jurulatih Wanita &amp; Novis' },
    {
      sel: '.coaches-grid .coach-card:nth-child(2) .coach-bio',
      html: 'Sebagai jurulatih wanita berdedikasi kami, Coach Diana mengendalikan kelas renang wanita secara eksklusif dan membimbing pelajar novis. Dijalankan di kemudahan kolam akademi kami (tiada kolam tertutup khas), sesi beliau menyediakan ruang yang menyokong, sopan, dan selesa untuk wanita serta pelajar baharu menguasai pernafasan berirama dan keseimbangan kuak.',
    },
    { sel: '.coaches-grid .coach-card:nth-child(2) .coach-meta-item:nth-child(1)', keepSvgText: 'Wanita &amp; Novis' },
    { sel: '.coaches-grid .coach-card:nth-child(2) .coach-meta-item:nth-child(2)', keepSvgText: 'Bertauliah MAS &amp; MAQRA' },
    // Coach 3: Shaheran
    { sel: '.coaches-grid .coach-card:nth-child(3) .coach-cert-tag:nth-child(1)', html: 'Jurulatih Lanjutan' },
    { sel: '.coaches-grid .coach-card:nth-child(3) .coach-cert-tag:nth-child(2)', html: 'Bertauliah MAS &amp; MAQRA' },
    { sel: '.coaches-grid .coach-card:nth-child(3) .coach-cert-tag:nth-child(3)', html: 'Teknik Kelajuan &amp; Lumba' },
    { sel: '.coaches-grid .coach-card:nth-child(3) .coach-position', html: 'Jurulatih Lanjutan &amp; Prestasi' },
    {
      sel: '.coaches-grid .coach-card:nth-child(3) .coach-bio',
      html: 'Berdedikasi terhadap mekanik renang elit dan prestasi kompetitif, Coach Shaheran mengetuai program latihan lanjutan kami. Beliau memberi tumpuan kepada kecekapan hidrodinamik, terjunan permulaan pantas, pusingan tajam, dan latihan daya tahan &mdash; memperkasa perenang kompetitif untuk memecahkan rekod peribadi.',
    },
    { sel: '.coaches-grid .coach-card:nth-child(3) .coach-meta-item:nth-child(1)', keepSvgText: 'Lanjutan &amp; Prestasi' },
    { sel: '.coaches-grid .coach-card:nth-child(3) .coach-meta-item:nth-child(2)', keepSvgText: 'Bertauliah MAS &amp; MAQRA' },

    // ── FACILITIES ──
    { sel: '#facilities .section-label', html: 'Kemudahan Kami' },
    { sel: '#facilities-heading', html: 'Kemudahan Bertaraf Dunia' },
    {
      sel: '#facilities .section-subheading',
      html: 'Dibina khusus untuk pembelajaran, keselamatan, dan prestasi. Kemudahan kami menyediakan persekitaran terbaik untuk setiap perenang.',
    },
    { sel: '.facilities-grid .facility-item:nth-child(1) .facility-name', html: 'Kolam Bertaraf Olimpik' },
    {
      sel: '.facilities-grid .facility-item:nth-child(1) .facility-desc',
      html: 'Kolam pertandingan bertaraf Olimpik 50 meter 8 lorong lengkap dengan blok permulaan rasmi dan tali lorong anti-ombak.',
    },
    { sel: '.facilities-grid .facility-item:nth-child(2) .facility-name', html: 'Kolam Pembelajaran Kanak-kanak' },
    {
      sel: '.facilities-grid .facility-item:nth-child(2) .facility-desc',
      html: 'Kolam pembelajaran cetek (tidak dipanaskan) yang direka khas untuk kanak-kanak kecil dan pelajar baharu membina keyakinan air dengan selamat.',
    },
    { sel: '.facilities-grid .facility-item:nth-child(3) .facility-name', html: 'Peralatan &amp; Bantuan Latihan' },
    {
      sel: '.facilities-grid .facility-item:nth-child(3) .facility-desc',
      html: 'Rangkaian penuh papan tendang (kickboard) dan pull buoy disediakan. (Nota: Pihak akademi tidak menyediakan sirip renang / swim fins; pelajar membawa sendiri).',
    },
    { sel: '.facilities-grid .facility-item:nth-child(4) .facility-name', html: 'Sesi Kejurulatihan Wanita' },
    {
      sel: '.facilities-grid .facility-item:nth-child(4) .facility-desc',
      html: 'Kelas wanita dikendalikan sepenuhnya oleh jurulatih wanita sahaja di kemudahan kolam utama kami (tiada kolam tertutup khas wanita).',
    },
    { sel: '.facilities-grid .facility-item:nth-child(5) .facility-name', html: 'Galeri Pemerhati Ibu Bapa' },
    {
      sel: '.facilities-grid .facility-item:nth-child(5) .facility-desc',
      html: 'Ruang menunggu ibu bapa yang selesa dengan pemandangan jelas ke semua kolam latihan.',
    },
    { sel: '.facilities-grid .facility-item:nth-child(6) .facility-name', html: 'Stesen Keselamatan' },
    {
      sel: '.facilities-grid .facility-item:nth-child(6) .facility-desc',
      html: 'Stesen pertolongan cemas lengkap dan peralatan keselamatan ditempatkan di setiap kolam.',
    },

    // ── ACHIEVEMENTS & STATS ──
    { sel: '.stats-band .stat-item:nth-child(1) .stat-label', html: 'Pelajar Dilatih' },
    { sel: '.stats-band .stat-item:nth-child(2) .stat-label', html: 'Program Aktif' },
    { sel: '.stats-band .stat-item:nth-child(3) .stat-label', html: 'Jurulatih Bertauliah' },
    { sel: '.stats-band .stat-item:nth-child(4) .stat-label', html: 'Tahun Kecemerlangan' },
    { sel: '#achievements .section-label', html: 'Pencapaian' },
    { sel: '#achievements-heading', html: 'Kebanggaan &amp; Pencapaian Kami' },
    { sel: '.achievements-grid .achievement-card:nth-child(1) .achievement-title', html: 'Juara Pertandingan' },
    {
      sel: '.achievements-grid .achievement-card:nth-child(1) .achievement-desc',
      html: 'Pelajar kami telah menyertai dan cemerlang dalam kejohanan renang peringkat daerah, negeri dan antara sekolah, membawa pulang pingat serta kedudukan podium.',
    },
    { sel: '.achievements-grid .achievement-card:nth-child(2) .achievement-title', html: 'Kolam Bersaiz Olimpik' },
    {
      sel: '.achievements-grid .achievement-card:nth-child(2) .achievement-desc',
      html: 'Pencapaian utama buat akademi kami &mdash; menyediakan latihan kepada pelajar dan atlet di kolam pertandingan bertaraf Olimpik 50 meter 8 lorong yang lengkap.',
    },
    { sel: '.achievements-grid .achievement-card:nth-child(3) .achievement-title', html: 'Kecemerlangan Bertauliah' },
    {
      sel: '.achievements-grid .achievement-card:nth-child(3) .achievement-desc',
      html: 'Jurulatih kami memegang pentauliahan penuh MAS Swimming dan disahkan oleh MAQRA, memastikan program kejurulatihan kami menepati piawaian akuatik tertinggi.',
    },
    { sel: '.achievements-grid .achievement-card:nth-child(4) .achievement-title', html: 'Pencapaian Graduasi' },
    {
      sel: '.achievements-grid .achievement-card:nth-child(4) .achievement-desc',
      html: 'Ratusan pelajar telah tamat pengajian melalui tahap renang berstruktur kami &mdash; setiap graduasi diraikan dengan sijil dan pengiktirafan usaha gigih mereka.',
    },
    { sel: '.achievements-grid .achievement-card:nth-child(5) .achievement-title', html: 'Ulasan 5 Bintang' },
    {
      sel: '.achievements-grid .achievement-card:nth-child(5) .achievement-desc',
      html: 'Dinilai 5 bintang secara konsisten oleh ibu bapa dan pelajar atas kualiti bimbingan, piawaian keselamatan, dan suasana mesra yang kami sediakan.',
    },
    { sel: '.achievements-grid .achievement-card:nth-child(6) .achievement-title', html: 'Impak Komuniti' },
    {
      sel: '.achievements-grid .achievement-card:nth-child(6) .achievement-desc',
      html: 'Kami bekerjasama dengan sekolah tempatan dan organisasi untuk mempromosikan pendidikan keselamatan air kepada masyarakat.',
    },

    // ── TESTIMONIALS ──
    { sel: '#testimonials .section-label', html: 'Testimoni' },
    { sel: '#testimonials-heading', html: 'Apa Kata Ibu Bapa' },
    {
      sel: '#testimonials .section-subheading',
      html: 'Kisah sebenar daripada keluarga yang mempercayai Kingaqua Academy untuk perjalanan renang anak-anak mereka.',
    },
    {
      sel: '#testimonials-track .testimonial-card:nth-child(1) .testimonial-quote',
      html: 'Anak perempuan saya sangat takutkan air sebelum menyertai Kingaqua Academy. Dalam masa 3 bulan sahaja, dia sudah berenang dengan yakin dan amat menyukai setiap sesi. Jurulatih sangat sabar dan memberi galakan. Keputusan terbaik yang pernah kami buat!',
    },
    { sel: '#testimonials-track .testimonial-card:nth-child(1) .testimonial-program', html: 'Ibu Bapa &mdash; Program Permulaan' },
    {
      sel: '#testimonials-track .testimonial-card:nth-child(2) .testimonial-quote',
      html: 'Program renang wanita di sini sangat hebat. Sebagai wanita yang sudah lama ingin belajar tetapi kurang selesa dalam kelas bercampur, inilah yang saya perlukan. Coach Diana sangat membantu dan profesional.',
    },
    { sel: '#testimonials-track .testimonial-card:nth-child(2) .testimonial-program', html: 'Pelajar &mdash; Program Wanita' },
    {
      sel: '#testimonials-track .testimonial-card:nth-child(3) .testimonial-quote',
      html: 'Kedua-dua anak lelaki saya berlatih di sini &mdash; seorang dalam program Novis dan seorang lagi Lanjutan. Coach Shaheran memang terbaik. Anak sulung saya baru sahaja bertanding di kejohanan negeri! Kualiti bimbingan di sini bertaraf dunia.',
    },
    { sel: '#testimonials-track .testimonial-card:nth-child(3) .testimonial-program', html: 'Ibu Bapa &mdash; Program Novis &amp; Lanjutan' },
    {
      sel: '#testimonials-track .testimonial-card:nth-child(4) .testimonial-quote',
      html: 'Anak saya yang berumur 3 tahun sangat sukakan program Kiddies! Pada mulanya saya risau memasukkan anak sekecil ini ke dalam kolam, tetapi jurulatih membuatkan kami berasa sangat selamat. Sekarang dia menangis bila tiba masa untuk pulang!',
    },
    { sel: '#testimonials-track .testimonial-card:nth-child(4) .testimonial-program', html: 'Ibu Bapa &mdash; Program Kiddies' },
    {
      sel: '#testimonials-track .testimonial-card:nth-child(5) .testimonial-quote',
      html: 'Saya mengambil kelas persendirian selepas berpuluh tahun tidak berenang. Coach Asraf sangat memahami dan menyesuaikan setiap sesi mengikut keperluan saya. Selepas 8 sesi, saya berasa sangat yakin di dalam air. Amat disyorkan!',
    },
    { sel: '#testimonials-track .testimonial-card:nth-child(5) .testimonial-program', html: 'Pelajar &mdash; Kelas Persendirian' },
    {
      sel: '#testimonials-track .testimonial-card:nth-child(6) .testimonial-quote',
      html: 'Kemudahan yang bersih, jurulatih yang profesional, dan pengalaman keseluruhan yang terbaik. Anak perempuan saya berkembang daripada tiada asas langsung kepada menyertai pertandingan antara sekolah dalam masa kurang setahun!',
    },
    { sel: '#testimonials-track .testimonial-card:nth-child(6) .testimonial-program', html: 'Ibu Bapa &mdash; Program Lanjutan' },

    // ── GALLERY ──
    { sel: '#gallery .section-label', html: 'Galeri' },
    { sel: '#gallery-heading', html: 'Detik Indah di Kingaqua' },
    {
      sel: '#gallery .section-subheading',
      html: 'Sorotan keterujaan, pencapaian, dan kegembiraan harian yang berlaku di akademi kami.',
    },

    // ── FAQ SECTION ──
    { sel: '#faq .section-label', html: 'Soalan Lazim' },
    { sel: '#faq-heading', html: 'Ada Soalan?<br/>Kami Ada Jawapannya.' },
    {
      sel: '#faq .faq-intro .section-subheading',
      html: 'Segala yang anda perlu tahu tentang program kami, proses pendaftaran, dan apa yang boleh dijangkakan di Kingaqua Academy.',
    },
    { sel: '.faq-contact-text strong', html: 'Masih ada soalan?' },
    { sel: '.faq-contact-text span', html: 'Kami sedia membantu! WhatsApp kami pada bila-bila masa dan kami akan membalas dengan segera &rarr;' },

    { sel: '#faq-q1', textOnly: 'Apakah umur minimum untuk memulakan kelas renang?' },
    {
      sel: '#faq-a1 .faq-answer-inner',
      html: 'Kami mengalu-alukan perenang seawal umur 3 tahun dalam program Kiddies kami. Sesi ini dibantu oleh ibu bapa dan direka untuk memperkenalkan kanak-kanak kecil kepada air dengan cara yang selamat, menyeronokkan, dan sesuai dengan usia. Untuk berenang secara berdikari, kami mengesyorkan bermula pada umur 4 tahun ke atas.',
    },
    { sel: '#faq-q2', textOnly: 'Adakah pelajar baharu memerlukan pengalaman berenang sebelum ini?' },
    {
      sel: '#faq-a2 .faq-answer-inner',
      html: 'Tidak perlu sama sekali! Program Permulaan (Beginner) kami direka khusus untuk pelajar yang tiada pengalaman langsung. Jurulatih kami bermula daripada perkara paling asas &mdash; cara masuk ke air, kawalan pernafasan, dan apungan &mdash; bagi memastikan setiap pelajar membina keyakinan mengikut rentak mereka sendiri.',
    },
    { sel: '#faq-q3', textOnly: 'Apakah kelengkapan yang perlu dibawa oleh pelajar ke kelas?' },
    {
      sel: '#faq-a3 .faq-answer-inner',
      html: 'Pelajar perlu membawa: pakaian renang yang sesuai, gogal renang (swimming goggles), topi renang (disyorkan), tuala, dan botol air. Alat bantuan asas seperti kickboard dan pull buoy disediakan. <strong>Penting:</strong> Pihak akademi tidak menyediakan sirip renang (swim fins) &mdash; pelajar perlu membawa fins sendiri sekiranya tahap latihan mereka memerlukannya.',
    },
    { sel: '#faq-q4', textOnly: 'Bolehkah kelas dijadualkan semula jika kami terlepas sesi?' },
    {
      sel: '#faq-a4 .faq-answer-inner',
      html: 'Ya! Kami menawarkan kelas gantian (makeup session) untuk pelajar yang tidak dapat hadir kerana sakit atau kecemasan. Sila maklumkan kepada kami sekurang-kurangnya 24 jam lebih awal. Penjadualan semula adalah tertakluk kepada kekosongan slot.',
    },
    { sel: '#faq-q5', textOnly: 'Adakah kelas persendirian (private) disediakan untuk orang dewasa?' },
    {
      sel: '#faq-a5 .faq-answer-inner',
      html: 'Ya! Program Kelas Persendirian kami terbuka kepada semua peringkat umur termasuk orang dewasa. Ramai pelajar dewasa datang kepada kami untuk belajar berenang buat kali pertama, meningkatkan kecergasan, atau mengatasi rasa takut kepada air dalam suasana yang selesa.',
    },
    { sel: '#faq-q6', textOnly: 'Bagaimanakah cara untuk mendaftarkan anak saya?' },
    {
      sel: '#faq-a6 .faq-answer-inner',
      html: 'Pendaftaran sangat mudah! Anda boleh mengisi borang pendaftaran di bawah, WhatsApp kami secara terus, atau menghubungi talian kami. Selepas menerima pertanyaan anda, kami akan mengaturkan sesi penilaian untuk menentukan tahap program yang sesuai serta jadual kelas untuk keluarga anda.',
    },
    { sel: '#faq-q7', textOnly: 'Adakah anda menawarkan program berkumpulan untuk sekolah atau universiti?' },
    {
      sel: '#faq-a7 .faq-answer-inner',
      html: 'Ya! Kami bekerjasama dengan sekolah, universiti (seperti UTHM), dan organisasi untuk menyediakan program pendidikan keselamatan air serta modul renang khas mengikut keperluan institusi anda.',
    },
    { sel: '#faq-q8', textOnly: 'Adakah terdapat kolam tertutup khas untuk wanita, dan siapakah jurulatihnya?' },
    {
      sel: '#faq-a8 .faq-answer-inner',
      html: '<strong>Tiada kolam tertutup khas untuk wanita</strong> &mdash; semua sesi dijalankan di kemudahan kolam akademi standard kami. Walau bagaimanapun, kelas renang wanita kami dikendalikan <strong>sepenuhnya oleh jurulatih wanita sahaja</strong> (diketuai oleh Coach Diana), memastikan persekitaran pembelajaran yang selesa, sopan, dan menyokong.',
    },
    { sel: '#faq-q9', textOnly: 'Berapakah saiz kolam dan adakah air kolam dipanaskan?' },
    {
      sel: '#faq-a9 .faq-answer-inner',
      html: 'Kolam utama kami adalah <strong>kolam pertandingan bertaraf Olimpik 50 meter, 8 lorong</strong> lengkap dengan blok permulaan dan pembahagi lorong anti-ombak. Untuk kanak-kanak kecil, kami mempunyai kolam pembelajaran cetek khas. Sila ambil perhatian bahawa kolam renang kami <strong>tidak dipanaskan (unheated)</strong>.',
    },

    // ── CTA SECTION ──
    { sel: '#cta-heading', html: 'Bersedia Untuk Mula Berenang?' },
    {
      sel: '.cta-desc',
      html: 'Sertai ratusan pelajar yang telah menemui keseronokan berenang di Kingaqua Academy. Perjalanan anda bermula dengan langkah pertama ke dalam air.',
    },
    { sel: '#cta-register-btn', html: 'Daftar Hari Ini' },
    { sel: '#cta-whatsapp-btn', html: 'WhatsApp Kami' },

    // ── CONTACT & REGISTRATION FORM ──
    { sel: '#contact .section-label', html: 'Hubungi Kami' },
    {
      sel: '#contact-heading',
      html: 'Hubungi Kami<br/><span class="highlight">Kami Sedia Membantu</span>',
    },
    { sel: '#contact-phone-label', html: 'Telefon' },
    { sel: '#contact-email-label', html: 'E-mel' },
    { sel: '#contact-office-label', html: 'Lokasi Pejabat Utama' },
    { sel: '#contact-office-val', html: 'Pura Kencana, Sri Gading' },
    { sel: '#contact-office-sub', html: '83000 Batu Pahat, Johor, Malaysia' },
    { sel: '#contact-venues-label', html: 'Lokasi Latihan' },
    { sel: '#contact-venues-val', html: 'Pura Kencana, UTHM Parit Raja &amp; Pontian' },
    {
      sel: '#contact-venues-sub',
      html: '&bull; Pura Kencana (Sri Gading)<br/>&bull; UTHM Parit Raja<br/>&bull; Pontian',
    },
    { sel: '#contact-hours-label', html: 'Waktu Operasi Pejabat' },
    { sel: '#contact-hours-val', html: '8:30 PG &ndash; 12:00 TGH' },
    { sel: '#contact-hours-days', html: 'Rabu &ndash; Isnin: 8:30 PG &ndash; 12:00 TGH' },
    { sel: '#contact-hours-offday', html: 'Hari Cuti: Selasa (Tutup)' },
    { sel: '#contact-whatsapp-btn', keepSvgText: 'Sembang di WhatsApp' },
    { sel: '#map-badge-title', html: 'Pejabat Kingaqua Academy' },
    { sel: '#map-badge-sub', html: 'Pura Kencana, Sri Gading (Batu Pahat)' },
    { sel: '#map-directions-btn', keepSvgText: 'Dapatkan Arah ke Pejabat' },

    // Form labels & inputs
    { sel: '.form-title', html: 'Pendaftaran &amp; Pertanyaan' },
    { sel: 'label[for="form-name"]', html: 'Nama Ibu Bapa / Penjaga *' },
    { sel: '#form-name', attr: { placeholder: 'cth. Ahmad bin Ali' } },
    { sel: 'label[for="form-phone"]', html: 'Nombor Telefon *' },
    { sel: '#form-phone', attr: { placeholder: 'cth. 019-517 7001' } },
    { sel: 'label[for="form-email"]', html: 'Alamat E-mel' },
    { sel: '#form-email', attr: { placeholder: 'emel@anda.com' } },
    { sel: 'label[for="form-venue"]', html: 'Lokasi Latihan Pilihan *' },
    { sel: '#form-venue option[value=""]', html: 'Pilih lokasi pilihan...' },
    { sel: '#form-venue option[value="Pura Kencana, Sri Gading"]', html: 'Pura Kencana, Sri Gading' },
    { sel: '#form-venue option[value="UTHM Parit Raja"]', html: 'UTHM Parit Raja' },
    { sel: '#form-venue option[value="Pontian"]', html: 'Pontian' },
    { sel: '#form-venue option[value="Flexible / Any Venue"]', html: 'Fleksibel / Mana-mana Lokasi' },

    { sel: 'label[for="form-program"]', html: 'Program Pilihan' },
    { sel: '#form-program option[value=""]', html: 'Pilih program...' },
    { sel: '#form-program option[value="beginner"]', html: 'Kelas Renang Permulaan (Beginner)' },
    { sel: '#form-program option[value="kiddies"]', html: 'Kiddies (Umur 3+)' },
    { sel: '#form-program option[value="aquaplay"]', html: 'Keyakinan Air Aquaplay' },
    { sel: '#form-program option[value="novice"]', html: 'Novis (Pertengahan)' },
    { sel: '#form-program option[value="advanced"]', html: 'Lanjutan &amp; Prestasi (Advanced)' },
    { sel: '#form-program option[value="private"]', html: 'Kelas Persendirian (1-ke-1 / Kumpulan Kecil)' },
    { sel: '#form-program option[value="ladies"]', html: 'Kelas Renang Wanita Sahaja' },
    { sel: '#form-program option[value="mens"]', html: 'Kelas Renang Lelaki' },

    { sel: '#add-child-btn', html: '+ Tambah Anak' },
    { sel: 'label[for="form-message"]', html: 'Pertanyaan Lain / Permintaan Khas' },
    {
      sel: '#form-message',
      attr: {
        placeholder: 'Tanya kami tentang jadual, hari/waktu pilihan (hujung minggu/hari biasa), yuran, atau soalan lain...',
      },
    },
    { sel: '#form-submit-btn', keepSvgText: 'Hantar Pendaftaran melalui WhatsApp' },
    {
      sel: '#contact-form > p',
      html: 'Dibuka terus di WhatsApp ke <strong>019-517 7001</strong>. Kami biasanya membalas dalam masa 24 jam.',
    },

    // ── FOOTER ──
    {
      sel: '.footer-desc',
      html: 'Akademi latihan sukan akuatik dan penyelamatan terkemuka di Johor. Program renang bertauliah untuk semua peringkat umur dalam persekitaran bertaraf Olimpik yang selamat.',
    },
    {
      sel: '.footer-brand > div:nth-of-type(2)',
      html: '<strong>Diiktiraf oleh:</strong> MAS Swimming (Malaysia Aquatics)<br/><strong>Disahkan oleh:</strong> MAQRA Johor &bull; Rakan Strategik UTHM',
    },
    { sel: '.footer-grid > div:nth-child(2) .footer-col-title', html: 'Program' },
    { sel: '.footer-grid > div:nth-child(2) .footer-link:nth-child(1)', html: 'Renang Permulaan (Beginner)' },
    { sel: '.footer-grid > div:nth-child(2) .footer-link:nth-child(2)', html: 'Kiddies (Umur 3+)' },
    { sel: '.footer-grid > div:nth-child(2) .footer-link:nth-child(3)', html: 'Keyakinan Air Aquaplay' },
    { sel: '.footer-grid > div:nth-child(2) .footer-link:nth-child(4)', html: 'Novis (Novice)' },
    { sel: '.footer-grid > div:nth-child(2) .footer-link:nth-child(5)', html: 'Lanjutan &amp; Prestasi' },
    { sel: '.footer-grid > div:nth-child(2) .footer-link:nth-child(6)', html: 'Kelas Persendirian' },
    { sel: '.footer-grid > div:nth-child(2) .footer-link:nth-child(7)', html: 'Renang Wanita Sahaja' },
    { sel: '.footer-grid > div:nth-child(2) .footer-link:nth-child(8)', html: 'Kelas Renang Lelaki' },

    { sel: '.footer-grid > div:nth-child(3) .footer-col-title', html: 'Akademi' },
    { sel: '.footer-grid > div:nth-child(3) .footer-link:nth-child(1)', html: 'Tentang Akademi' },
    { sel: '.footer-grid > div:nth-child(3) .footer-link:nth-child(2)', html: 'Jurulatih Kami' },
    { sel: '.footer-grid > div:nth-child(3) .footer-link:nth-child(3)', html: 'Kolam Olimpik &amp; Spesifikasi' },
    { sel: '.footer-grid > div:nth-child(3) .footer-link:nth-child(4)', html: 'Galeri Foto' },
    { sel: '.footer-grid > div:nth-child(3) .footer-link:nth-child(5)', html: 'Soalan Lazim (FAQ)' },
    { sel: '.footer-grid > div:nth-child(3) .footer-link:nth-child(6)', html: 'Hubungi &amp; Lokasi' },
    { sel: '.footer-grid > div:nth-child(3) .footer-link:nth-child(7)', html: 'Log Masuk Portal &rarr;' },

    { sel: '.footer-grid > div:nth-child(4) .footer-col-title', html: 'Hubungi Rasmi' },
    {
      sel: '#footer-location-block span',
      html: '<strong>Pejabat:</strong> Pura Kencana, Sri Gading<br/><span style="font-size:var(--text-xs); color:rgba(255,255,255,0.65);">Lokasi Latihan: Pura Kencana, UTHM Parit Raja &amp; Pontian</span><br/><span style="font-size:var(--text-xs); color:rgba(255,255,255,0.5);">Waktu Pejabat: 8:30 PG &ndash; 12:00 TGH (Selasa Tutup)</span>',
    },
    {
      sel: '.footer-copyright',
      html: '&copy; 2026 Kingaqua Academy. Hak cipta terpelihara. &bull; Akademi Latihan Akuatik Bertauliah MAS Swimming &amp; MAQRA.',
    },
    { sel: '.footer-bottom-links .footer-bottom-link:nth-child(1)', html: 'Log Masuk Portal' },
    { sel: '.footer-bottom-links .footer-bottom-link:nth-child(2)', html: 'Tentang Kami' },
    { sel: '.footer-bottom-links .footer-bottom-link:nth-child(3)', html: 'Hubungi Kami' },
  ];

  // Store original English values before any mutation
  const entries = [];
  BM_TRANSLATIONS.forEach(function (item) {
    const el = document.querySelector(item.sel);
    if (!el) return;

    const record = { el: el, item: item };

    if (item.textOnly) {
      // Preserve child elements like .faq-chevron
      let textNode = null;
      for (let i = 0; i < el.childNodes.length; i++) {
        if (el.childNodes[i].nodeType === Node.TEXT_NODE && el.childNodes[i].nodeValue.trim().length > 0) {
          textNode = el.childNodes[i];
          break;
        }
      }
      if (textNode) {
        record.textNode = textNode;
        record.enText = textNode.nodeValue;
      }
    } else if (item.keepSvgText) {
      // Preserve leading SVG icon and replace trailing text
      const svg = el.querySelector('svg');
      record.svgHtml = svg ? svg.outerHTML : '';
      record.enHtml = el.innerHTML;
    } else if (item.attr) {
      record.enAttr = {};
      Object.keys(item.attr).forEach(function (k) {
        record.enAttr[k] = el.getAttribute(k) || '';
      });
    } else if (item.html !== undefined) {
      record.enHtml = el.innerHTML;
    }

    entries.push(record);
  });

  // Also translate dynamic children registration section
  function updateChildrenSectionLang(lang) {
    const isBM = lang === 'ms';
    const childrenGroup = document.getElementById('children-container');
    if (childrenGroup && childrenGroup.parentElement) {
      const headerLabel = childrenGroup.parentElement.querySelector('.form-label');
      if (headerLabel) {
        headerLabel.textContent = isBM ? 'Anak Untuk Didaftarkan *' : 'Children to Register *';
      }
      const tipDiv = childrenGroup.nextElementSibling;
      if (tipDiv) {
        tipDiv.innerHTML = isBM
          ? '💡 <em>Mengisi ruang nama anak akan menambah kotak untuk anak seterusnya secara automatik!</em>'
          : '💡 <em>Filling in a child will automatically add a box for the next child!</em>';
      }
    }

    // Update all existing .child-card elements
    const cards = document.querySelectorAll('#children-container .child-card');
    cards.forEach(function (card, idx) {
      const badge = card.querySelector('.child-badge');
      if (badge) {
        badge.textContent = (isBM ? 'Anak ' : 'Child ') + (idx + 1);
      }
      const removeBtn = card.querySelector('.remove-child-btn');
      if (removeBtn) {
        removeBtn.innerHTML = isBM ? '&times; Padam' : '&times; Remove';
      }
      const nameInp = card.querySelector('.child-name');
      if (nameInp) {
        nameInp.setAttribute('placeholder', isBM ? 'Nama Penuh Anak *' : "Child's Full Name *");
      }
      const ageInp = card.querySelector('.child-age');
      if (ageInp) {
        ageInp.setAttribute('placeholder', isBM ? 'Umur *' : 'Age (e.g. 7) *');
      }
      const notesInp = card.querySelector('.child-notes');
      if (notesInp) {
        notesInp.setAttribute(
          'placeholder',
          isBM
            ? 'Pengalaman Renang / Nota (cth. Tiada asas, takut air, asma...)'
            : 'Swimming Experience / Notes (e.g. Beginner, water phobia, asthma...)'
        );
      }
    });
  }

  function applyLanguage(lang) {
    currentLang = lang === 'ms' ? 'ms' : 'en';
    localStorage.setItem(STORAGE_KEY, currentLang);
    document.documentElement.setAttribute('lang', currentLang);
    window.__KINGAQUA_LANG__ = currentLang;

    const isBM = currentLang === 'ms';

    entries.forEach(function (rec) {
      const el = rec.el;
      const item = rec.item;

      if (item.textOnly && rec.textNode) {
        rec.textNode.nodeValue = isBM ? '\n            ' + item.textOnly + '\n            ' : rec.enText;
      } else if (item.keepSvgText) {
        if (isBM) {
          el.innerHTML = rec.svgHtml + '\n            ' + item.keepSvgText;
        } else {
          el.innerHTML = rec.enHtml;
        }
      } else if (item.attr) {
        Object.keys(item.attr).forEach(function (k) {
          el.setAttribute(k, isBM ? item.attr[k] : rec.enAttr[k]);
        });
      } else if (item.html !== undefined) {
        el.innerHTML = isBM ? item.html : rec.enHtml;
      }
    });

    updateChildrenSectionLang(currentLang);

    // Update all language toggle buttons on the page
    const btns = document.querySelectorAll('.lang-btn');
    btns.forEach(function (btn) {
      const btnLang = btn.getAttribute('data-lang');
      const active = btnLang === currentLang;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  // Expose helper so main.js can re-apply language when new child rows are dynamically added
  window.KingAquaI18n = {
    getLang: function () {
      return currentLang;
    },
    refreshChildren: function () {
      updateChildrenSectionLang(currentLang);
    },
    setLang: applyLanguage,
  };

  // Wire up click handlers on all .lang-btn buttons
  document.addEventListener('click', function (e) {
    const btn = e.target.closest('.lang-btn');
    if (!btn) return;
    const targetLang = btn.getAttribute('data-lang');
    if (targetLang) {
      applyLanguage(targetLang);
    }
  });

  // Apply initial language if saved as BM
  if (currentLang === 'ms') {
    applyLanguage('ms');
  } else {
    window.__KINGAQUA_LANG__ = 'en';
  }
})();
