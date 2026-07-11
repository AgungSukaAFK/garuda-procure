# sistem.md — Dokumentasi Sistem GarudaProcure

## 1. Ringkasan Sistem
GarudaProcure adalah aplikasi web berbasis **Next.js App Router** dan **TypeScript** untuk mendukung proses **General Affair / Procurement** pada PT. Garuda Mart Indonesia. Dari struktur kode dan metadata aplikasi, sistem ini difokuskan untuk mengelola:

- **Material Request (MR)**
- **Purchase Order (PO)**
- **Approval & validation workflow**
- **Petty Cash**
- **Manajemen vendor**
- **Master barang**
- **Cost center dan kontrol budget (dengan pemotongan/pengembalian anggaran otomatis)**
- **Notifikasi internal**
- **Pelacakan status pengadaan**
- **Tanda tangan digital (Digital Signature Manager)** untuk approval, Goods Receipt, dan BAST
- **Asisten AI (chatbot) dalam-aplikasi** untuk membantu navigasi & menelusuri progres MR/PO
- **User management**

Nama aplikasi yang digunakan di UI dan metadata adalah **Garuda Procure**, dengan deskripsi: _“Sistem Manajemen MR & PO - PT. Garuda Mart Indonesia”_.

Secara umum, sistem ini merupakan **platform pengadaan internal** yang menghubungkan proses permintaan barang, persetujuan multi-level, pembuatan purchase order, monitoring status pengadaan, serta modul petty cash dalam satu aplikasi.

> Catatan akurasi (per commit terbaru): sistem ini kini hanya melayani **satu perusahaan**, yaitu **PT. Garuda Mart Indonesia (kode `GMI`)** — lihat migrasi `20260619000000_single_company_gmi.sql`. Kolom `company`/`company_code` masih ada di skema (peninggalan desain multi-company sebelumnya, yang dulunya juga menyebut cabang "LOURDES"), tetapi nilainya sekarang selalu di-default ke `GMI` dan UI tidak lagi meminta/memfilter company. Modul **Stok GA** (`stok-ga`, type `GaStock`, `services/gaStockService.ts`) juga sudah **tidak lagi memiliki halaman/menu di UI** — service-nya masih ada di kode tapi merupakan kode mati (tidak dipanggil dari `app/`) per audit repo terbaru.

---

## 2. Tujuan Bisnis Sistem
Berdasarkan landing page dan modul yang tersedia, tujuan utama sistem ini adalah:

1. **Mendigitalisasi proses pengadaan internal** yang sebelumnya berpotensi manual atau tersebar.
2. **Mempercepat pembuatan MR dan PO** dengan template serta alur kerja terstruktur.
3. **Menyediakan approval berjenjang** sesuai role, department, atau template approval.
4. **Memberikan transparansi status** setiap permintaan, dari dibuat sampai selesai.
5. **Mengontrol biaya dan anggaran** melalui cost center serta budget tracking.
6. **Menyediakan kanal audit trail operasional** melalui status, approval, discussion, dan notification.
7. **Mengintegrasikan kebutuhan operasional GA dan purchasing** dalam satu dashboard aplikasi.
8. **Mendukung kebutuhan skripsi / penelitian sistem informasi**, karena sistem ini memiliki domain proses bisnis yang jelas: procurement workflow, approval engine, budget control, dan digital administration.

---

## 3. Teknologi yang Digunakan

### 3.1 Framework inti
Sistem dibangun menggunakan:

- **Next.js 15.5.9**
- **React 19**
- **TypeScript 5**
- **App Router** milik Next.js

### 3.2 Styling & UI
- **Tailwind CSS 4**
- **shadcn/ui**
- **Radix UI**
- **Lucide React** untuk icon
- **next-themes** untuk theme switching
- **sonner** untuk toast notification

### 3.3 Backend / BaaS
Sistem menggunakan **Supabase** sebagai backend utama, meliputi:

- Authentication
- Database query langsung dari client dan server
- RPC / function database
- Storage untuk attachment
- Session berbasis cookies SSR

### 3.4 Library tambahan yang menunjukkan capability sistem
- **xlsx** → ekspor / impor Excel
- **zustand** → state management client-side
- **recharts** → dashboard chart / visualisasi
- **@tiptap/react** dan extension terkait → rich text editor / mention / placeholder
- **qrcode.react** → QR code
- **react-day-picker** → pemilihan tanggal
- **@google/genai** — **(baru)** SDK Google Gemini, provider default Asisten AI (lihat §6.15)
- **@anthropic-ai/sdk** — **(baru)** SDK Claude/Anthropic, provider alternatif Asisten AI yang bisa diaktifkan lewat env `ASSISTANT_PROVIDER=claude`
- **react-markdown** + **remark-gfm** — **(baru)** render jawaban Asisten AI (yang berformat Markdown) di widget chat

> **Koreksi (per audit terbaru)**: revisi dokumen sebelumnya juga mencantumkan **nodemailer** (pengiriman email), **jspdf**/**jspdf-autotable** (generasi PDF), dan **@webscopeio/react-textarea-autocomplete** (autocomplete textarea) sebagai dependency sistem. Setelah dicek ke `package.json`, **ketiganya tidak pernah terpasang** dan tidak ada satu pun import-nya di kode — ini murni dokumentasi yang keliru/basi, bukan fitur yang pernah ada. Lihat juga §13 soal endpoint `send-email` yang ternyata juga tidak pernah ada.

---

## 4. Arsitektur Sistem
Secara arsitektural, aplikasi ini adalah **web application full-stack berbasis Next.js + Supabase** dengan karakteristik:

### 4.1 Lapisan presentasi
Direpresentasikan oleh folder:
- `app/`
- `components/`

Lapisan ini menangani:
- halaman publik
- halaman autentikasi
- dashboard dan menu sidebar
- form input bisnis
- komponen UI reusable
- navigasi berdasarkan role/department

### 4.2 Lapisan logika bisnis
Direpresentasikan terutama oleh folder:
- `services/`
- sebagian utilitas di `lib/`

Lapisan ini menangani:
- query data ke Supabase
- pembuatan kode dokumen (MR/PO/PC)
- approval processing
- filtering dan pagination
- transformasi data hasil join
- update status proses
- upload attachment
- notifikasi
- dashboard analytics

### 4.3 Lapisan data dan integrasi
Direpresentasikan oleh:
- `lib/supabase/`
- folder `supabase/` berisi SQL setup
- route API pada `app/api/`

Lapisan ini menangani:
- koneksi browser dan server ke Supabase
- session handling berbasis cookie
- middleware auth & route protection
- RPC/function database
- setup SQL tabel/fitur tertentu
- endpoint API internal seperti Signature Manager dan Asisten AI (lihat §13)

### 4.4 Pola arsitektur yang tampak
Sistem ini tidak memisahkan backend sebagai service terpisah, namun menggunakan pola:

**Frontend Next.js + service layer + Supabase BaaS**

Dengan kata lain:
- UI memanggil fungsi service
- service menggunakan Supabase client
- Supabase menangani database, auth, storage, dan sebagian logic via RPC / SQL

Model ini cocok untuk aplikasi enterprise internal skala kecil–menengah yang butuh delivery cepat.

---

## 5. Struktur Folder Utama

### 5.1 Root structure
Folder utama yang teridentifikasi:

- `app` → seluruh route aplikasi berbasis App Router
- `components` → komponen UI dan komponen domain
- `hooks` → custom hooks
- `lib` → utility, provider, constant, integrasi
- `services` → business/data service layer
- `supabase` → SQL setup dan konfigurasi data
- `type` → type definition domain
- `public` → aset statis
- `outline` → kemungkinan catatan/perancangan dokumen

### 5.2 Folder `app/`
Subfolder penting yang ditemukan:

- `app/(With Sidebar)` → area utama aplikasi setelah login
- `app/api` → API route internal (termasuk `app/api/v1/assistant` — **(baru)** endpoint Asisten AI, lihat §6.15)
- `app/approval-po` → approval PO publik/dinamis tertentu
- `app/auth` → autentikasi
- `app/pending-approval` → halaman user belum lengkap/menunggu approval profil
- `app/protected` → area proteksi tambahan
- `app/page.tsx` → landing page publik
- `app/layout.tsx` → root layout aplikasi

### 5.3 Folder `app/(With Sidebar)/`
Ini adalah area inti sistem operasional. Modul yang terdeteksi:

- `approval-validation` — khusus role `approver`
- `barang`
- `cost-center-management`
- `dashboard`
- `dokumentasi`
- `feedback` — form kirim feedback (semua user)
- `feedback-management` — **(baru)** triase feedback masuk, khusus `admin`
- `goods-receipt` — **(baru)** penerimaan barang oleh GA dengan checklist + tanda tangan digital
- `item-requests`
- `material-request`
- `mr-management`
- `my-mr` — **(baru)** daftar MR milik sendiri, khusus role `requester`
- `notifications`
- `petty-cash`
- `po-management`
- `profile`
- `purchase-order`
- `request-new-item`
- `signatures` — **(baru)** manajemen tanda tangan digital milik user (lihat §6.14)
- `tentang-app`
- `user-management`
- `vendor`

Dari daftar ini terlihat bahwa sistem memiliki cakupan cukup luas dan sudah melampaui sekadar CRUD sederhana. Folder `stok-ga` yang pernah ada **sudah dihapus dari `app/`** (fitur Stok GA tidak lagi punya halaman); yang tersisa hanya `services/gaStockService.ts` sebagai kode yang sudah tidak dipakai.

### 5.4 Folder `services/`
Service yang tersedia:

- `approvalService.ts`
- `approvalTemplateService.ts`
- `costCenterService.ts`
- `dashboardService.ts`
- `discussionService.ts`
- `feedbackService.ts` — **(baru)** kirim & kelola feedback pengguna
- `gaStockService.ts` — **tidak lagi dipakai** (tidak ada halaman `app/` yang mengimpornya; peninggalan modul Stok GA)
- `logService.ts`
- `mrService.ts`
- `notificationService.ts`
- `pcApprovalTemplateService.ts`
- `pettyCashService.ts`
- `purchaseOrderService.ts` — kini juga menangani `saveGoodsReceipt` dan `saveBastAndComplete` (lihat §6.5 dan §6.14)
- `signatureService.ts` — **(baru)** wrapper client untuk endpoint Signature Manager (`app/api/v1/signatures/*`); tidak menyimpan hash password di client
- `userService.ts`
- `vendorService.ts`

Ini menunjukkan bahwa logika bisnis utama dipisahkan berdasarkan domain.

### 5.5 Folder `type/`
Type utama:
- `index.ts`
- `enum.ts`
- `comboboxData.tsx`

Folder ini penting karena memetakan model data sistem.

### 5.6 Folder pendukung Asisten AI — baru
Modul Asisten AI (§6.15) tersebar di beberapa folder di luar pola service-layer biasa:
- `lib/assistant/provider.ts` — pemilih provider (Gemini/Claude) lewat env `ASSISTANT_PROVIDER`.
- `lib/assistant/providers/gemini.ts` dan `lib/assistant/providers/claude.ts` — implementasi streaming + tool-calling per provider.
- `lib/assistant/tools.ts` — definisi & eksekutor tool **read-only** (query Supabase) yang boleh dipanggil model.
- `lib/assistant/knowledge.ts` — basis pengetahuan prosedur (system prompt) yang disuntikkan ke model.
- `lib/zustand/assistantWidget.ts` — state posisi/ukuran widget chat, dipersist ke localStorage.
- `components/assistant/assistant-widget.tsx` — komponen widget chat mengambang (floating action button + panel chat).

---

## 6. Modul Fungsional Sistem

### 6.1 Modul autentikasi dan otorisasi
Sistem memiliki modul autentikasi melalui Supabase Auth dengan karakteristik:

- login menggunakan **email atau NRP**
- signup user baru
- pengecekan user aktif / nonaktif (`is_active`)
- middleware route protection
- redirect otomatis untuk user belum lengkap profilnya
- public path dan protected path dipisahkan

#### Ciri penting:
- Login tidak hanya menerima email, tetapi juga **NRP**, kemudian sistem mencari email berdasarkan tabel `profiles`.
- User yang berhasil login tetap akan dicek lagi status `is_active`-nya.
- Akun nonaktif akan langsung disign-out.
- User tanpa `nrp` atau `company` akan diarahkan ke `/pending-approval`.

### 6.2 Modul profil pengguna
Tabel `profiles` tampak menjadi pusat identitas pengguna. Field yang terlihat:

- `id`
- `role`
- `lokasi`
- `department`
- `nama`
- `nrp`
- `company`
- `email`
- `is_active`

Profil ini dipakai untuk:
- menentukan menu sidebar
- menentukan hak akses
- validasi kelengkapan akun
- filter data per company
- approval routing

### 6.3 Modul dashboard
Dashboard menyediakan statistik dan visualisasi seperti:

- jumlah MR open/closed/total/rejected/waiting PO
- jumlah PO pending/completed/total
- tren bulanan MR vs PO
- distribusi MR per departemen
- daftar MR terbaru

Sumber data dashboard berasal dari:
- query count langsung ke tabel `material_requests` dan `purchase_orders`
- RPC Supabase seperti:
  - `get_monthly_mr_po_trend`
  - `get_mr_distribution_by_dept`

### 6.4 Modul Material Request (MR)
MR adalah salah satu domain inti. Model `MaterialRequest` mencakup:

- kode MR
- user pembuat
- kategori
- status
- remarks
- cost estimation
- department
- due date
- orders/item list
- approvals
- attachments
- discussions
- company code
- tujuan site
- cost center
- prioritas
- level/status tracking proses

Fitur yang dapat diinferensikan:
- membuat MR
- melihat daftar MR
- approval MR
- manajemen MR oleh admin/purchasing
- diskusi terkait MR
- lampiran dokumen
- penghitungan prioritas berdasarkan due date
- tracking level proses pengadaan

### 6.5 Modul Purchase Order (PO)
PO adalah domain utama kedua. Fitur yang tampak:

- mengambil daftar PO dengan pagination dan filter
- mencari PO berdasarkan kode, status, vendor, atau MR terkait
- generate kode PO otomatis
- create PO dari MR
- update PO
- validate PO
- close PO dengan BAST
- upload attachment PO
- menambahkan attachment baru ke PO
- menandai barang diterima oleh GA / **Goods Receipt digital** (lihat sub-bagian di bawah)

Field penting pada PO:
- `kode_po`
- `mr_id`
- `user_id`
- `status`
- `vendor_details`
- `items`
- `currency`
- `discount`
- `tax`
- `postage`
- `total_price`
- `payment_term`
- `shipping_address`
- `notes`
- `attachments`
- `approvals`
- `pph_type`, `pph_rate`, `pph_amount`
- `goods_receipt`, `bast` — **(baru)** kolom JSONB (lihat sub-bagian di bawah)

#### Goods Receipt & BAST berbasis checklist + tanda tangan digital (baru)
Selain jalur lama berupa **upload file BAST/foto** (`closePoWithBast`, status PO `Pending BAST` → `Completed`, attachment bertipe `bast`/`invoice` di bucket `po` — ini masih menjadi alur aktif di halaman `purchase-order/[id]`), sistem kini mulai menambahkan jalur **digital** yang menyimpan checklist item + tanda tangan langsung sebagai data terstruktur:

- **Goods Receipt (GA)** — halaman `goods-receipt` menampilkan PO yang sudah lolos payment validation dan menunggu diterima di warehouse. GA menekan "Terima Barang", muncul dialog `ReceiptChecklistDialog` (`components/po/receipt-checklist-dialog.tsx`) yang menampilkan checklist per item PO (qty dipesan vs qty diterima, centang diterima/tidak, catatan), lalu meminta tanda tangan lewat `SignatureSelector`. Hasilnya disimpan sebagai `GoodsReceiptData` (items, `received_by`, `received_by_name`, `signature_url`, `printed_name`, `received_at`) ke kolom `purchase_orders.goods_receipt` lewat `saveGoodsReceipt()`, lalu level MR di-set ke `OPEN 5` lewat `markGoodsAsReceivedByGA()`.
- **BAST (Requester)** — service `saveBastAndComplete()` dan tipe `BastData` (menyimpan `confirmed_by`, tanda tangan requester, dan referensi item hasil GR untuk dibandingkan lewat prop `referenceItems` pada `ReceiptChecklistDialog`) sudah tersedia dan akan menutup PO (`status: "Completed"`) serta MR (`status: "Completed"`, `level: "CLOSE 3"`). **Catatan penting untuk peneliti**: pada kondisi kode saat ini, fungsi ini **belum dipanggil dari halaman manapun** — alur BAST yang aktif di UI masih jalur upload file lama (`closePoWithBast`). Ini adalah fitur yang sedang berjalan pengerjaannya (in progress), bukan bagian yang sudah selesai diproduksi.

Kolom `purchase_orders.goods_receipt` dan `.bast` ditambahkan lewat migrasi `20260619040000_po_goods_receipt_bast.sql`.

### 6.6 Modul approval dan validation
Approval merupakan engine penting dalam sistem ini.

Objek approval berisi:
- `type`
- `status`
- `userid`
- `nama`
- `email`
- `role`
- `department`
- `processed_at`

Jenis approval yang didefinisikan:
- `Mengetahui`
- `Menyetujui`
- `Payment Approval`
- `Payment Validator`

Approval digunakan setidaknya pada:
- MR
- PO
- Petty Cash

Ada juga konsep:
- template approval
- approval template khusus petty cash
- payment validator legacy user id

### 6.7 Modul petty cash
Selain procurement formal, sistem juga mengelola petty cash.

Jenis petty cash:
- Reimbursement
- Cash Advance
- Pembayaran Langsung
- Transport & Perjalanan
- Entertain & Konsumsi
- Lainnya

Status petty cash:
- Pending Validation
- In Approval
- Cash Distributed
- Pending Settlement
- Settled
- Rejected

Fitur yang terlihat:
- generate kode petty cash otomatis
- buat pengajuan petty cash
- lihat petty cash milik user
- manajemen petty cash
- approval petty cash
- template approval petty cash
- settlement attachment
- filter berdasarkan company dan role

### 6.8 Modul cost center dan budget control
Ada modul khusus `cost-center-management` dan type `CostCenter` serta `CostCenterHistory`.

Data yang tampak:
- nama cost center
- kode
- company code
- initial budget
- current budget
- active status
- riwayat perubahan budget

Artinya sistem tidak hanya mengelola dokumen, tetapi juga **pengendalian anggaran**.

#### Pemotongan dan pengembalian budget otomatis
Sejak pembaruan budget control, cost center tidak lagi sekadar indikator/peringatan, melainkan benar-benar **mengurangi saldo anggaran** mengikuti siklus hidup MR:

1. **Saat MR divalidasi GA**, sistem memotong `current_budget` cost center terpilih sebesar estimasi biaya MR (`cost_estimation`). Pemotongan dilakukan lewat RPC transaksional `deduct_cost_center_budget` (menggunakan row-level lock `FOR UPDATE`) sehingga aman dari *race condition* dan pemotongan ganda.
2. **Validasi diblokir (hard block)** apabila sisa budget tidak mencukupi. GA akan menerima popup yang meminta untuk melakukan top up budget terlebih dahulu atau memilih cost center lain. Pengecekan dilakukan dua lapis: di sisi client (UI) dan di sisi database (RPC melempar `INSUFFICIENT_BUDGET`).
3. **Saat MR ditolak atau dibatalkan** (oleh GA pada tahap validasi maupun oleh approver pada tahap approval), dana dikembalikan otomatis lewat RPC `refund_cost_center_budget`. MR yang sudah `Completed` tidak dikembalikan karena anggaran dianggap memang terpakai.
4. **Idempoten dan dapat diaudit**: setiap MR menyimpan penanda `budget_deducted_amount` dan `budget_deducted_cc_id`, sehingga pemotongan tidak terjadi dua kali dan pengembalian selalu memakai nominal serta cost center yang persis dipotong (aman walau estimasi atau cost center diubah belakangan). Setiap pemotongan/pengembalian dicatat sebagai entri di `cost_center_history`.

### 6.9 Modul master barang
Domain `Barang` menyimpan master item pengadaan, dengan atribut:
- part number
- part name
- category
- uom
- vendor
- is_asset
- last purchase price
- link

Fitur terkait:
- pencarian barang (`searchBarang`)
- integrasi item MR dengan barang master
- update `last_purchase_price` setelah PO dibuat
- request barang baru
- item request approval/pemrosesan

### 6.10 Modul vendor
Terdapat modul vendor dengan model:
- `kode_vendor`
- `nama_vendor`
- `pic_contact_person`
- `alamat`
- `email`

Pada PO, detail vendor disimpan sebagai `vendor_details`, mengindikasikan sistem menyimpan snapshot vendor saat PO dibuat.

### 6.11 Modul stok GA
> **Status: sudah tidak aktif di UI.** Tabel `ga_stocks` masih ada di database (masih disentuh oleh migrasi `single_company_gmi`) dan `services/gaStockService.ts` beserta type `GaStock` masih ada di kode, tetapi **halaman `stok-ga` sudah dihapus dari `app/(With Sidebar)/`** dan tidak ada lagi menu di sidebar yang mengarah ke sana. Service ini adalah kode mati (dead code) pada revisi saat ini — relevan untuk dibahas di bagian analisis kelemahan (§18) sebagai catatan maintainability, bukan sebagai fitur aktif.

Struktur data yang sebelumnya dipakai modul ini:
- barang_id
- company_code
- quantity
- location
- note
- updated_by
- relasi ke master barang

### 6.12 Modul notifikasi
Sistem memiliki modul notifikasi internal dengan fitur:
- mengambil notifikasi user saat login
- join dengan `profiles` untuk nama actor/pengirim
- tandai satu notifikasi sudah dibaca
- tandai semua notifikasi sudah dibaca
- membuat notifikasi via RPC `create_notifications`

Jenis notifikasi sangat kaya, misalnya:
- mention
- approval_mr
- approval_po
- info
- mr_submitted
- mr_validated
- mr_approved_step
- mr_fully_approved
- mr_rejected
- po_submitted
- po_validated
- po_approved_step
- po_fully_approved
- po_rejected
- pc_submitted
- pc_routed
- pc_approved_step
- pc_fully_approved
- pc_rejected

Ini menandakan sistem berorientasi event/workflow.

### 6.13 Modul feedback dan dokumentasi
Karena terdapat halaman `feedback`, `feedback-management`, `dokumentasi`, dan `tentang-app`, sistem ini juga menyediakan:
- kanal umpan balik pengguna (`feedback`) — mendukung attachment (migrasi `feedback_attachment`)
- triase feedback oleh admin (`feedback-management`) — mengubah status feedback antara lain `baru` → `dibaca` → `selesai`
- dokumentasi internal
- informasi aplikasi

Ini penting untuk adopsi organisasi.

### 6.14 Modul tanda tangan digital (Digital Signature Manager) — baru
Ini adalah modul keamanan/approval yang **belum terdokumentasi sebelumnya** namun sudah aktif digunakan di sistem. Setiap user dapat menyimpan beberapa gambar tanda tangan (maksimal 6, divalidasi di server) lewat halaman `signatures`, dengan alur:

1. **Pembuatan tanda tangan**: user mengunggah gambar TTD, memberi `label` (mis. "TTD Formal"), lalu wajib memasukkan **password akun** (verifikasi identitas) dan **password signature** terpisah (password kedua khusus untuk menandatangani, di-hash bcrypt sebagai `password_hash` dan tidak pernah dikirim ke client).
2. **Verifikasi saat menandatangani**: saat approve dokumen (MR/PO/PC) atau mengonfirmasi Goods Receipt/BAST, user memilih salah satu TTD tersimpan lalu memasukkan password signature-nya via `verifySignature()`. Endpoint `POST /api/v1/signatures/verify` mencocokkan password di server dan mengembalikan `{ image_url, printed_name }` bila cocok.
3. **Proteksi brute-force**: kolom `profiles.signature_failed_attempts` menghitung percobaan gagal; setelah **5 kali salah, akun otomatis dikunci** (`profiles.is_active = false`), terpisah dari mekanisme lockout password akun biasa.
4. **Proteksi kolom sensitif**: trigger database `protect_signature_columns` memastikan operasi UPDATE dari client **hanya bisa mengubah `label` dan `is_hidden`** — `image_url`, `printed_name`, `password_hash`, dan `user_id` selalu dipaksa kembali ke nilai lama walau dikirim berbeda.
5. **RLS ketat per-pemilik**: tabel `user_signatures` memakai RLS yang membatasi select/insert/update/delete hanya untuk baris milik `auth.uid()` sendiri — ini adalah pengecualian dari pola tabel lain di sistem yang cenderung lebih permisif.
6. **Storage**: gambar TTD disimpan di bucket Supabase Storage `signatures` (public **read** karena gambar TTD perlu tampil di halaman verifikasi publik `app/approval-po/{id}`; write/delete dibatasi per folder UUID milik masing-masing user).

Komponen UI terkait: `components/signature/signature-selector.tsx` (memilih TTD + input password saat approve) dan `components/signature/signature-cropper.tsx` (crop gambar saat upload). Service client: `services/signatureService.ts`. Route API: `app/api/v1/signatures/route.ts`, `.../verify/route.ts`, `.../[id]/route.ts`, `.../[id]/image/route.ts`.

Modul ini menunjukkan sistem sudah bergerak melampaui approval "klik setuju" sederhana menuju **tanda tangan elektronik berlapis** (password akun + password signature terpisah + lockout), yang relevan dibahas untuk topik skripsi seputar keamanan dan non-repudiation pada sistem approval digital.

### 6.15 Modul Asisten AI (chatbot dalam-aplikasi) — baru, penting
Ini adalah modul yang **sama sekali belum tercatat pada revisi dokumen sebelumnya**, padahal merupakan salah satu fitur paling signifikan untuk dibahas di skripsi (integrasi LLM ke sistem informasi pengadaan). Wujudnya adalah **widget chat mengambang** ("Asisten GarudaProcure") yang muncul di seluruh halaman ber-sidebar, dipasang lewat `<AssistantWidget />` di `app/(With Sidebar)/layout.tsx`.

#### 6.15.1 Arsitektur & alur permintaan
1. **Widget (client)** — `components/assistant/assistant-widget.tsx`. Menu chat berupa panel mengambang yang bisa **di-drag**, **di-resize**, dan **di-dock ke salah satu dari 4 sudut layar** (kanan-bawah/kiri-bawah/kanan-atas/kiri-atas); posisi & ukuran dipersist ke localStorage lewat store zustand `lib/zustand/assistantWidget.ts`. Riwayat chat juga disimpan di localStorage (key `gp-assistant-chat`), **di-scope per `userId`** — bila user lain login di browser yang sama, riwayat lama tidak ikut tampil.
2. **Endpoint** — `POST /api/v1/assistant` (`app/api/v1/assistant/route.ts`, `runtime = "nodejs"`, `maxDuration = 60`). **Wajib login** (dicek via `supabase.auth.getUser()`; 401 bila tidak ada sesi). Body berisi maksimal 20 pesan terakhir (`history`), pesan terakhir harus dari role `user`. Response berupa **stream teks biasa** (`Content-Type: text/plain`, bukan SSE/JSON) yang dibaca sedikit-demi-sedikit oleh widget lewat `ReadableStream`/`reader.read()` untuk efek mengetik real-time.
3. **Pemilihan provider model** — `lib/assistant/provider.ts` memilih antara Gemini (default) dan Claude berdasarkan env `ASSISTANT_PROVIDER`. Kedua provider memakai **tool schema dan system prompt yang sama**, hanya berbeda cara memanggil API-nya:
   - `lib/assistant/providers/gemini.ts` — pakai `@google/genai`, model default **`gemini-2.0-flash`** (bisa di-override via env `GEMINI_MODEL`; dipilih karena kuota free-tier hariannya lebih besar daripada `gemini-2.5-flash`). Butuh env `GEMINI_API_KEY` atau `GOOGLE_API_KEY`.
   - `lib/assistant/providers/claude.ts` — pakai `@anthropic-ai/sdk`, model default **`claude-sonnet-4-6`** (env `CLAUDE_MODEL`). **Dipertahankan di kode tapi tidak aktif secara default** — komentar di kode menyebut ini "aktif lagi saat sudah langganan API Anthropic". Butuh env `ANTHROPIC_API_KEY`.
   - Kedua provider membatasi maksimal **6 putaran tool-calling** (`MAX_TOOL_ROUNDS`) per request untuk mencegah loop tak berujung.
4. **Penerjemah error ramah** — `friendlyAssistantError()` di route handler mengubah error mentah (rate limit/quota, API key salah, dll.) menjadi pesan berbahasa Indonesia yang sopan, bukan dump JSON teknis.

> **Catatan lingkungan (gap ditemukan)**: env var `ASSISTANT_PROVIDER`, `GEMINI_API_KEY`/`GOOGLE_API_KEY`, `GEMINI_MODEL`, `ANTHROPIC_API_KEY`, dan `CLAUDE_MODEL` **belum tercantum di `.env.example`** meskipun sudah dipakai di kode — perlu ditambahkan agar setup proyek oleh developer baru tidak membingungkan (lihat juga §14 dan §18).

#### 6.15.2 Tool-calling read-only (`lib/assistant/tools.ts`)
Asisten **tidak diberi akses tulis sama sekali** — hanya 5 tool berbasis `SELECT` Supabase yang bisa dipanggil model:
- `info_saya` — identitas user login (nama, role, department, company); dipakai saat user menyebut "saya"/"punya saya".
- `cari_material_request` — cari 1 MR persis by `kode_mr`.
- `list_material_request` — daftar MR dengan filter opsional `status` (partial match), `milik_saya` (boolean), `limit` (maks 25, default 10).
- `cari_purchase_order` — cari 1 PO persis by `kode_po`, sekaligus melampirkan `kode_mr` asal bila ada.
- `list_purchase_order` — daftar PO dengan filter serupa MR.

Semua tool query lewat Supabase client bersesi user yang login (`ToolContext { supabase, userId }`) — bukan service-role, sehingga tunduk pada RLS yang berlaku. Nama pemilik dokumen di-resolve lewat satu query tambahan ke `profiles` (`resolveOwnerNames`) agar hasil tool lebih manusiawi (menampilkan nama, bukan UUID). Ada dua bentuk eksekutor karena format tool-result kedua provider berbeda: `runAssistantTool()` mengembalikan objek (dipakai Gemini) dan `executeAssistantTool()` membungkusnya jadi string JSON (dipakai Claude).

#### 6.15.3 System prompt & basis pengetahuan (`lib/assistant/knowledge.ts`)
System prompt (`SYSTEM_PROMPT`) menegaskan beberapa batasan penting yang layak dibahas dari sisi *AI safety/guardrail* di skripsi:
- Asisten **hanya boleh menjawab seputar prosedur & data GarudaProcure** — pertanyaan di luar topik (umum, coding, berita, hal pribadi) harus ditolak sopan.
- Asisten **boleh memandu navigasi** (menyebutkan menu & langkah konkret) tapi **tidak boleh menjalankan aksi apa pun** (tidak bisa membuat/mengubah/menghapus/menyetujui/membayar dokumen) — ditegaskan eksplisit agar model tidak menolak pertanyaan navigasi yang sah maupun mengklaim bisa melakukan aksi yang sebenarnya tidak bisa.
- Dilarang membocorkan/menebak kredensial, password, API key, atau data teknis internal, dan dilarang mengarang data — bila tool mengembalikan kosong/error, harus disampaikan apa adanya.
- Bagian `PROSEDUR` di dalam prompt adalah **ringkasan manual** dari alur MR/PO/Petty Cash, daftar status, format kode dokumen, dan **daftar menu navigasi sidebar** yang ditulis manual oleh developer — bukan diambil otomatis dari kode.

> **Catatan analisis penting (temuan audit)**: bagian `PROSEDUR` di `knowledge.ts` **sudah tidak sinkron dengan navigasi aktual** (§7) karena ditulis manual dan tidak diperbarui mengikuti perubahan UI terbaru:
> - Masih menyebut menu **"Stok GA"** untuk departemen GA/admin — padahal halaman ini **sudah dihapus** (§6.11). Asisten berpotensi memberi instruksi navigasi yang salah/menyesatkan untuk pertanyaan seputar stok GA.
> - **Belum menyebut** menu-menu baru: **Goods Receipt** (`/goods-receipt`, GA/admin), **MR Saya** (`/my-mr`, requester), dan **Feedback Masuk** (`/feedback-management`, admin).
> - Ini adalah contoh nyata risiko **maintainability pada sistem berbasis prompt/pengetahuan statis**: dokumentasi yang disuntikkan ke LLM bisa basi lebih cepat daripada kode itu sendiri karena tidak ada mekanisme sinkronisasi otomatis dari sidebar/routing ke `knowledge.ts`. Ini topik yang bagus untuk dibahas di bab evaluasi/kelemahan sistem pada skripsi (lihat §18).

#### 6.15.4 Ringkasan nilai tambah fitur ini
Modul ini menjadikan GarudaProcure bukan sekadar sistem informasi pengadaan konvensional, melainkan juga contoh penerapan **LLM ber-tool (agentic RAG ringan) dengan guardrail eksplisit** di atas data transaksional nyata — relevan untuk topik skripsi seperti "Implementasi Asisten AI Berbasis LLM untuk Membantu Navigasi dan Penelusuran Status pada Sistem Informasi Pengadaan", termasuk pembahasan keamanan (akses read-only, wajib login, batasan RLS), keandalan (fallback error, batas putaran tool-calling), dan keterbatasan (basis pengetahuan statis yang bisa basi).

---

## 7. Routing dan Navigasi Berdasarkan Role
Sidebar (`components/app-sidebar.tsx`) dihasilkan dinamis sesuai profil user yang di-fetch langsung dari tabel `profiles` saat sidebar mount. Isinya terbagi 4 grup: **Admin** (hanya render bila `role === "admin"`), **Main**, **Petty Cash**, dan **About**.

> Catatan kecil: header sidebar saat ini menampilkan logo/nama tim **"Lourdes Autoparts"** (`data.teams` di `app-sidebar.tsx`), bukan "Garuda Mart" — ini tampaknya peninggalan dari desain multi-company sebelumnya (lihat catatan `LOURDES` pada §1 dan migrasi `single_company_gmi`) yang belum dibersihkan, bukan indikasi rebranding resmi. Metadata aplikasi (`app/layout.tsx`) tetap konsisten menyebut "Garuda Procure" / "PT. Garuda Mart Indonesia".

### 7.1 Grup Admin (`navAdmin`) — hanya `role === "admin"`
- User Management (`/user-management`)
- MR Management (`/mr-management`)
- PO Management (`/po-management`)
- Cost Center Management (`/cost-center-management`)
- Feedback Masuk (`/feedback-management`) — **(baru)**

### 7.2 Menu utama (`navMain`) — dasar untuk semua user
- Dashboard
- Notifikasi (disisipkan dengan badge unread dari `NotificationProvider`)
- Material Request
- Purchase Order
- Barang
- Vendor

### 7.3 Penyisipan kondisional pada menu utama
Baris dasar di atas disisipi entri tambahan tergantung profil:

- **Semua user** yang punya akses ke Barang: entri **Request Barang Baru** (`/request-new-item`) selalu disisipkan setelah Barang.
- **Purchasing / Admin**: **Permintaan Barang** (`/item-requests`) disisipkan setelah Request Barang Baru.
- **Role `approver`**: **Approval & Validation** (`/approval-validation`).
- **Role `requester`**: **MR Saya** (`/my-mr`) — **(baru)**, daftar MR milik sendiri, disisipkan tepat setelah Material Request.
- **Departemen GA atau `role === "admin"`**: **Goods Receipt** (`/goods-receipt`) — **(baru)**.
- **Departemen General Manager atau Departemen GA**: **Cost Center Management** (`/cost-center-management`) juga muncul di grup menu utama ini (duplikat dengan entri admin, tetapi lewat jalur otorisasi department, bukan role admin).

### 7.4 Grup Petty Cash (`pettyCashItems`)
- Pengajuan Saya (`/petty-cash`), Buat Pengajuan (`/petty-cash/buat`) — selalu tampil untuk semua user.
- **Manajemen PC** (`/petty-cash/management`) dan **Template Approval PC** (`/petty-cash/templates`) — hanya untuk `role === "approver"`, `role === "admin"`, Departemen Finance, atau Departemen GA.

### 7.5 Grup About (`navSecondary`)
Dokumentasi, Feedback, Tentang App — tampil untuk semua user.

### 7.6 Implikasi desain akses
Artinya sistem menggunakan kombinasi otorisasi berbasis:
- role (`admin`, `approver`, `requester`, dst.)
- department (GA, Purchasing, Finance, General Manager, dst. — lihat `lib/constants/departments.ts` dan helper `isGADepartment`)

Bukan sekadar satu role global. Perhatikan pula bahwa modul **Stok GA** sudah tidak lagi memiliki entri menu apa pun di sidebar (lihat §6.11).

---

## 8. Model Data Inti

### 8.1 Profile
Mewakili identitas user dan dasar access control.

### 8.2 MaterialRequest
Entitas permintaan barang/jasa internal.

### 8.3 Order
Sub-item dalam MR. Masing-masing order bisa memiliki:
- barang_id
- part_number
- status item
- referensi PO
- catatan perubahan

Ini menunjukkan tracking dilakukan tidak hanya di level dokumen, tetapi juga level item.

### 8.4 PurchaseOrder / PurchaseOrderDetail
Entitas pemesanan ke vendor, dapat terhubung ke satu MR. `PurchaseOrderDetail` menambahkan `goods_receipt?: GoodsReceiptData | null` dan `bast?: BastData | null` — **(baru)**, hasil checklist + tanda tangan digital penerimaan barang (lihat §6.5 dan §6.14).

### 8.5 POItem
Item yang dipesan pada PO, memiliki qty, price, total_price, vendor_name, dan opsional description/link.

### 8.6 Vendor
Master vendor.

### 8.7 Barang
Master item/material.

### 8.8 CostCenter dan CostCenterHistory
Kontrol anggaran dan audit perubahan budget. `CostCenter` menyimpan `initial_budget`, `current_budget`, dan status aktif; `CostCenterHistory` mencatat setiap perubahan saldo (top up admin, pemotongan saat validasi MR, dan pengembalian saat MR ditolak) lengkap dengan `previous_budget`, `new_budget`, `change_amount`, serta referensi `mr_id` bila perubahan dipicu oleh sebuah MR.

`MaterialRequest` memiliki kolom penanda terkait budget: `budget_deducted_amount` (nominal yang sedang dipotong untuk MR ini) dan `budget_deducted_cc_id` (cost center asal pemotongan), yang menjamin konsistensi pemotongan/pengembalian.

### 8.9 Notification
Entitas notifikasi berbasis event.

### 8.10 PettyCashRequest
Entitas pengajuan petty cash yang memiliki approval dan settlement.

### 8.11 UserSignature — baru
Mewakili satu tanda tangan digital tersimpan milik user (tabel `user_signatures`): `id`, `user_id`, `image_url`, `printed_name`, `label`, `password_hash` (bcrypt, tidak pernah diekspos ke client), `is_hidden`, `created_at`. Lihat §6.14.

### 8.12 ReceiptItem, GoodsReceiptData, BastData — baru
`ReceiptItem` merepresentasikan satu baris checklist penerimaan barang: `part_number`, `name`, `qty` (dipesan), `qty_received`, `received` (boolean), `note?`. `GoodsReceiptData` (`items: ReceiptItem[]`, `received_by`, `received_by_name`, `signature_url`, `printed_name`, `received_at`) disimpan di `purchase_orders.goods_receipt`. `BastData` (struktur serupa dengan `confirmed_by`/`confirmed_by_name`/`confirmed_at`) disimpan di `purchase_orders.bast`. Lihat §6.5.

### 8.13 Feedback — baru
Entitas umpan balik pengguna: `nama`, `email`, `whatsapp`, `category`, `message`, `attachment_url`/`attachment_name`, dan `status` (`baru` | `dibaca` | `selesai`). Lihat §6.13.

---

## 9. Workflow Bisnis Utama

### 9.1 Workflow Material Request
1. User login.
2. User membuat MR.
3. MR berisi orders/item, attachments, remarks, due date, tujuan site, company, dan cost center.
4. MR memasuki status awal `Pending Validation`.
5. GA memvalidasi MR: menetapkan cost center, jalur approval, lalu sistem **memotong budget cost center** sebesar estimasi biaya MR. Jika sisa budget tidak cukup, validasi diblokir (harus top up atau ganti cost center). MR yang lolos berubah ke `Pending Approval`.
6. Approval berjalan sesuai template dan approver terkait.
7. Setelah seluruh approver menyetujui, MR berstatus `Waiting PO` dan menunggu pembuatan PO.
8. Jika MR **ditolak/dibatalkan** pada tahap manapun setelah dipotong, budget cost center **dikembalikan otomatis**.
9. Status dan level MR berubah sesuai progres operasional.

### 9.2 Workflow Purchase Order
1. PO dibuat berdasarkan MR yang sudah layak diproses.
2. Sistem generate `kode_po` otomatis berdasar company, bulan Romawi, tahun, lokasi, dan nomor urut.
3. PO disimpan dengan status awal `Pending Validation`.
4. Saat insert, ada mekanisme retry untuk mencegah bentrok kode PO.
5. Setelah PO dibuat:
   - harga terakhir barang di-update
   - status item MR terkait di-update menjadi `PO Created`
   - status MR diubah ke `On Process`
   - level MR diubah ke `OPEN 3A`
6. PO melalui approval berjenjang. Jika template approval memiliki step **Payment Validator**, status berpindah ke `Pending BAST` setelah Payment Validator approve; jika template tidak memiliki step payment, status langsung ke `Pending BAST` setelah seluruh approver menyetujui.
7. **Goods Receipt oleh GA**: GA membuka `/goods-receipt`, mengisi checklist item + tanda tangan digital (`ReceiptChecklistDialog`), tersimpan ke `purchase_orders.goods_receipt`, level MR menjadi `OPEN 5`.
8. **Penyelesaian (BAST)**: pada revisi kode saat ini, penyelesaian PO masih memakai jalur lama yaitu Requester **mengunggah file BAST/bukti foto** (`closePoWithBast`) di halaman `purchase-order/[id]`, mengubah status PO menjadi `Completed`. Jalur BAST digital (checklist + tanda tangan requester lewat `saveBastAndComplete`) sudah disiapkan di service layer namun **belum disambungkan ke UI manapun** — lihat catatan di §6.5.
9. Attachment seperti invoice/BAST dapat diunggah ke Supabase Storage bucket `po`.

### 9.3 Workflow status level MR
Sistem mendefinisikan level proses MR secara detail, antara lain:
- OPEN 1: menunggu approval awal
- OPEN 2: menunggu PO SCM
- OPEN 3A / 3B: menunggu pengiriman vendor
- OPEN 4: vendor kirim, belum tiba
- OPEN 5: tiba di warehouse
- CLOSE 1: kirim ke site
- CLOSE 2A / 2B: diterima site, dokumen proses
- CLOSE 3: selesai dan update sistem

Ini adalah salah satu kekuatan sistem dari sisi penelitian, karena menyediakan **status operasional granular**.

### 9.4 Workflow Petty Cash
1. User membuat pengajuan petty cash.
2. Sistem generate kode PC otomatis.
3. Status awal: `Pending Validation`.
4. Approval berjalan.
5. Dana didistribusikan.
6. Settlement dilakukan dan attachment settlement diunggah.
7. Status akhir menjadi `Settled` atau `Rejected`.

---

## 10. Mekanisme Kode Dokumen
Sistem memiliki pola penomoran otomatis.

### 10.1 Kode PO
Format:
`{COMPANY}/PO/{ROMAN_MONTH}/{YY}/{LOKASI}/{NUMBER}`

Contoh pola:
`GMI/PO/VI/26/HO/123`

Unsur pembentuk:
- company_code
- bulan Romawi
- 2 digit tahun
- singkatan lokasi
- nomor urut tahunan per company

### 10.2 Kode Petty Cash
Format:
`{COMPANY}/PC/{ROMAN_MONTH}/{YY}/{DEPT}/{NUMBER}`

Contoh pola:
`GMI/PC/VI/26/GA/10`

### 10.3 Nilai analitis
Pola penomoran ini menunjukkan sistem memperhatikan:
- keterbacaan administratif
- identifikasi dokumen secara organisasi
- grouping berdasarkan company/lokasi/departemen

---

## 11. Autentikasi, Session, dan Keamanan

### 11.1 Session handling
Sistem menggunakan **Supabase SSR** dengan cookie-based session.

Terdapat helper:
- `lib/supabase/client.ts` → browser client
- `lib/supabase/server.ts` → server client
- `middleware.ts` → validasi auth global

### 11.2 Middleware keamanan
Middleware melakukan:
- membuat server client Supabase
- membaca / menulis cookie sesi
- memvalidasi user lewat `supabase.auth.getUser()`
- membedakan auth path, public path, dan dynamic public path
- redirect ke login jika belum login
- cek profil `nrp` dan `company`
- redirect ke `/pending-approval` bila profil belum lengkap
- redirect user login dari auth page ke `/`

### 11.3 Soft delete / deactivated account
Akun nonaktif ditangani di beberapa lapisan:
- saat login
- saat middleware session check

Jika `profiles.is_active === false`, user akan dikeluarkan dan diarahkan ke login.

Sejak modul Digital Signature Manager ditambahkan (§6.14), ada **jalur lockout kedua yang independen**: `profiles.signature_failed_attempts` dihitung terpisah dari login biasa, dan setelah 5 kali salah memasukkan password signature saat menandatangani dokumen, akun yang sama juga akan di-set `is_active = false` — walau password akun (login) yang bersangkutan benar.

### 11.4 Catatan keamanan arsitektur
Karena banyak operasi dilakukan dari service layer memakai Supabase client, maka keamanan riil kemungkinan besar sangat bergantung pada:
- **RLS Supabase**
- **RPC dengan SECURITY DEFINER**
- pembatasan akses di level query/database

Salah satu indikasinya adalah fungsi notifikasi memakai RPC `create_notifications` karena insert langsung diblokir RLS.

---

## 12. Database dan Integrasi Supabase
Walaupun schema lengkap tabel tidak seluruhnya dibaca, dari type dan service dapat diidentifikasi tabel/entitas utama berikut:

- `profiles` (termasuk `signature_failed_attempts` — baru)
- `material_requests` (termasuk `budget_deducted_amount`, `budget_deducted_cc_id` — baru)
- `purchase_orders` (termasuk `goods_receipt`, `bast` JSONB — baru)
- `petty_cash_requests`
- `notifications`
- `barang`
- `vendors` atau tabel vendor sejenis
- `cost_centers`, `cost_center_history`
- `ga_stocks` — tabel masih ada, tetapi modulnya sudah tidak dipakai UI (lihat §6.11)
- `user_signatures` — **(baru)** tanda tangan digital, lihat §6.14 dan §8.11
- `feedback` — **(baru)**, lihat §6.13 dan §8.13
- relasi `users_with_profiles`

### 12.1 SQL setup yang tersedia
Folder `supabase/` (root, non-migrasi) berisi:
- `cost-center-active-status-setup.sql`
- `ga-stock-setup.sql`
- `notifications-setup.sql`
- `user-active-status-setup.sql`
- `seed.sql`

Artinya sebagian fitur dikembangkan melalui script SQL terpisah, misalnya:
- aktivasi/nonaktivasi cost center
- setup stok GA (legacy — modulnya sudah tidak dipakai di UI)
- setup notifikasi
- setup status aktif user

Selain itu, folder `supabase/migrations/` memuat skema versi dengan timestamp (terurut kronologis):
- `20260610000000_initial_schema.sql` — skema dasar seluruh tabel & RPC awal (~550 baris, migrasi terbesar)
- `20260618000000_feedback_table.sql` — **(baru)** tabel `feedback`
- `20260618010000_feedback_attachment.sql` — **(baru)** kolom attachment pada feedback
- `20260618020000_barang_description.sql` — kolom deskripsi pada `barang`
- `20260618030000_signature_manager.sql` — **(baru)** tabel `user_signatures`, trigger proteksi kolom, lockout, bucket storage `signatures` (lihat §6.14)
- `20260619000000_single_company_gmi.sql` — **(baru)** penyederhanaan ke single-company `GMI` (lihat catatan §1)
- `20260619010000_item_requests_processed_at.sql` — kolom `processed_at` pada item request
- `20260619020000_public_storage_buckets.sql` — pengaturan bucket storage publik
- `20260619030000_signature_allow_image_edit.sql` — penyesuaian trigger signature untuk izinkan ganti gambar TTD
- `20260619040000_po_goods_receipt_bast.sql` — **(baru)** kolom `goods_receipt` & `bast` (JSONB) pada `purchase_orders`
- `20260626000000_cost_center_budget_deduction.sql` — kolom penanda budget pada `material_requests` serta RPC `deduct_cost_center_budget` dan `refund_cost_center_budget`

### 12.2 RPC yang teridentifikasi
- `get_monthly_mr_po_trend`
- `get_mr_distribution_by_dept`
- `create_notifications`
- `admin_update_budget` — penyesuaian/top up budget cost center oleh admin
- `deduct_cost_center_budget` — pemotongan budget transaksional saat MR divalidasi (cek saldo + `INSUFFICIENT_BUDGET`)
- `refund_cost_center_budget` — pengembalian budget saat MR ditolak/dibatalkan; dipanggil dari validasi GA (`material-request/validate/[id]`) maupun dari penolakan di tahap approval (`services/approvalService.ts`, fungsi `processMrApproval` saat `decision === "rejected"`)
- `protect_signature_columns` — **(baru)** trigger function yang memaksa kolom sensitif `user_signatures` tetap ke nilai lama saat UPDATE (lihat §6.14)

Ini menunjukkan sebagian logic agregasi dan workflow ditempatkan di database. Khusus kontrol budget, logika kritis (cek saldo, pemotongan, pengembalian, pencatatan history) sengaja diletakkan di RPC `SECURITY DEFINER` dengan row-level lock agar atomik dan aman dari race condition.

### 12.3 Storage
Bucket Supabase Storage yang teridentifikasi:
- `po` — attachment PO. Jenis file yang diakomodasi: po, finance, bast, invoice.
- `signatures` — **(baru)** gambar tanda tangan digital; bucket bersifat public **read** (dibutuhkan untuk tampil di halaman verifikasi publik `app/approval-po/{id}`), namun write/delete dibatasi per-folder UUID milik user (lihat §6.14).

---

## 13. API Internal
Terdapat route API internal:
- `app/api/v1/signatures/route.ts`, `.../verify/route.ts`, `.../[id]/route.ts`, `.../[id]/image/route.ts` — **(baru)** Signature Manager, lihat §6.14
- `app/api/v1/assistant/route.ts` — **(baru)** endpoint chat Asisten AI (streaming, wajib login), lihat §6.15

Selain itu ada folder `lib/notifications` untuk orkestrasi notifikasi in-app.

> **Koreksi (per audit terbaru)**: revisi dokumen sebelumnya sempat menyebut endpoint `app/api/v1/send-email/route.ts`, folder `lib/amazon_ses`, dan folder `lib/fonnte` sebagai indikasi sistem mendukung pengiriman email (SES) dan notifikasi WhatsApp (Fonnte). Setelah dicek langsung ke kode, **ketiganya tidak pernah ada** — tidak ada route `send-email`, tidak ada dependency `nodemailer` di `package.json`, dan kedua folder tersebut tidak pernah dibuat. Ini adalah dokumentasi rencana yang tidak pernah diimplementasikan (lihat juga `outline/06-env-integrations.md` yang sebelumnya memuat klaim serupa, sudah diperbaiki).
>
> **Kesimpulan aktual soal email**: sistem ini **tidak mengirim email dari kode aplikasinya sendiri**. Env var `SMTP_PORT`, `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `SES_FROM` sudah dihapus dari `.env.example` karena tidak pernah dipakai.
>
> **Koreksi penting (temuan audit lanjutan)**: alur "lupa password" **bukan** ditangani lewat email Supabase seperti anggapan awal. Tidak ada satu pun pemanggilan `supabase.auth.resetPasswordForEmail()` di kode. Halaman login (`app/auth/login/page.tsx`) hanya menampilkan teks statis "Lupa password? Hubungi admin untuk reset." — tidak ada form/link self-service. Reset password yang benar-benar aktif adalah **admin-manual**: endpoint `app/api/v1/admin/reset-password/route.ts` memakai Supabase *service-role* admin API (`admin.auth.admin.updateUserById`) untuk langsung mengganti password user (otorisasi berlapis: harus admin, harus company sama kecuali LOURDES), **tanpa mengirim email apa pun** — UI-nya di `app/(With Sidebar)/user-management/[userid]/page.tsx`. Komentar di kode bahkan eksplisit menyebut endpoint ini "menggantikan alur forgot password via email". Jadi kebutuhan email aplikasi yang benar-benar aktif hanyalah **login Google OAuth** (tidak butuh pengiriman email kustom) — bukan password recovery.
>
> Sistem ini juga **tidak memiliki fitur notifikasi WhatsApp** dalam bentuk apa pun; env var `NEXT_PUBLIC_FONNTE_TOKEN` yang sebelumnya ada di `.env.example` sudah dihapus karena tidak pernah dipakai di kode manapun. Satu-satunya field bernama "whatsapp" di sistem adalah kolom kontak pada form **Feedback** (`type/index.ts`, `services/feedbackService.ts`, halaman `feedback`/`feedback-management`) — itu murni nomor kontak yang diisi manual oleh pengguna agar admin bisa menghubungi balik, **bukan** kanal pengiriman notifikasi otomatis.

---

## 14. Environment Variable yang Dibutuhkan
Berdasarkan `.env.example`, sistem memerlukan:

- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_DEVELOPER_EMAIL`
- `APP_NAME`
- `SUPABASE_ANON_KEY`
- `SUPABASE_URL`

Selain daftar di atas, kode sudah membaca env berikut untuk **Asisten AI** (§6.15) — **namun belum ditambahkan ke `.env.example`**, ini gap dokumentasi setup proyek yang perlu diperbaiki:
- `ASSISTANT_PROVIDER` — `"gemini"` (default) atau `"claude"`.
- `GEMINI_API_KEY` (atau fallback `GOOGLE_API_KEY`) — wajib bila provider Gemini aktif.
- `GEMINI_MODEL` — override model Gemini (default `gemini-2.0-flash`).
- `ANTHROPIC_API_KEY` — wajib bila `ASSISTANT_PROVIDER=claude`.
- `CLAUDE_MODEL` — override model Claude (default `claude-sonnet-4-6`).

### 14.1 Klasifikasi fungsi environment
- **Supabase client/server**: URL dan key (termasuk Auth — login Google OAuth; reset password TIDAK lewat email Supabase, lihat catatan §13)
- **APP_NAME**: identitas aplikasi
- **developer email**: kemungkinan fallback / monitoring
- **Asisten AI**: pemilihan & konfigurasi provider LLM (Gemini/Claude)

---

## 15. UI/UX dan Pola Interaksi

### 15.1 Landing page
Landing page publik menyampaikan value proposition:
- modernisasi proses pengadaan
- pembuatan MR & PO cepat
- approval dinamis
- pelacakan real-time

### 15.2 Dashboard layout
Setelah login, user masuk ke area dengan:
- sidebar collapsible
- breadcrumb otomatis berdasarkan path
- toast notification
- notifikasi unread badge
- menu yang menyesuaikan role/department

### 15.3 Localization
Banyak label, format tanggal, mata uang, dan teks UI memakai **Bahasa Indonesia** serta format lokal `id-ID`. Ini memperlihatkan sistem ditujukan untuk konteks operasional Indonesia.

### 15.4 Formatting helpers
Utility yang tersedia:
- format tanggal Indonesia
- format currency Rupiah
- format date-time ke WIB
- hitung prioritas berdasarkan due date
- validasi CSV

Ini menunjukkan aplikasi memiliki perhatian pada kualitas data dan keterbacaan operasional.

---

## 16. Fitur Tracking dan Auditabilitas
Sistem cukup kuat pada aspek tracking, dibuktikan oleh:

1. **approval history** pada berbagai dokumen
2. **discussion thread** pada dokumen tertentu
3. **notification event**
4. **status level MR** yang granular
5. **item-level tracking** pada order MR
6. **budget history** pada cost center
7. **attachment history** pada PO dan petty cash

Bagi kebutuhan skripsi, ini bisa dikaji sebagai implementasi:
- workflow information system
- digital approval system
- procurement monitoring system
- budget-aware procurement information system

---

## 17. Kekuatan Sistem
Beberapa kekuatan yang terlihat dari repository ini:

1. **Domain bisnis jelas dan spesifik**: procurement internal + petty cash.
2. **Role-based navigation** sudah diterapkan.
3. **Approval workflow multi-level** tersedia.
4. **Tracking proses sangat detail**, terutama level MR.
5. **Integrasi budget/cost center** memberi nilai kontrol keuangan.
6. **Notifikasi internal** mendukung responsiveness sistem.
7. **Pemakaian Supabase** mempercepat pengembangan full-stack.
8. **TypeScript types cukup kaya**, sehingga domain model terdokumentasi baik di kode.
9. **Penomoran dokumen otomatis** relevan untuk kebutuhan administrasi perusahaan.
10. **Ada pemisahan service layer**, yang memudahkan analisis arsitektur untuk penelitian.
11. **Asisten AI ber-tool dengan guardrail eksplisit** (§6.15) — akses read-only, wajib login, batas putaran tool-calling, dan penanganan error yang ramah, menunjukkan pertimbangan keamanan yang matang saat mengintegrasikan LLM ke data transaksional.
12. **Tanda tangan elektronik berlapis** (§6.14) — password akun + password signature terpisah + lockout otomatis, relevan untuk pembahasan non-repudiation pada approval digital.

---

## 18. Potensi Kelemahan / Catatan Analisis
Untuk pembelajaran model lain atau pembahasan skripsi, beberapa catatan penting:

1. **README belum mencerminkan sistem aktual**
   - README masih bawaan starter kit Next.js + Supabase.
   - Dokumentasi bisnis sistem belum tergambar dari README.

2. **Arsitektur masih sangat Supabase-centric**
   - Banyak logika langsung mengakses Supabase dari frontend/service layer.
   - Ini cepat dikembangkan, tetapi perlu audit ketat pada RLS dan permission.

3. **Sebagian business rule tersebar**
   - Ada di service, middleware, enum, dan kemungkinan SQL/RPC.
   - Untuk penelitian, ini penting dibahas sebagai tantangan maintainability.

4. **Belum tampak test suite**
   - Dari struktur root yang terbaca, belum terlihat folder test atau konfigurasi test.

5. **Sebagian integrasi belum terdokumentasi penuh**
   - Misalnya Amazon SES, Fonnte, dan notification orchestration.

6. **Kode mati (dead code) dan fitur setengah-migrasi**
   - `services/gaStockService.ts` dan type `GaStock` masih ada padahal halaman `stok-ga` sudah dihapus dari `app/` — modul Stok GA tidak lagi punya konsumen.
   - Jalur **BAST digital** (`saveBastAndComplete`, `BastData`, kolom `purchase_orders.bast`) sudah dibangun di service layer tetapi **belum disambungkan ke UI manapun**; jalur BAST yang aktif masih upload-file lama (`closePoWithBast`). Ini contoh baik untuk dibahas di skripsi sebagai risiko *incomplete feature migration* pada pengembangan iteratif.
   - Halaman `goods-receipt` sempat mengalami kondisi serupa (import komponen dialog baru ditambahkan, tetapi JSX lama yang memanggil handler yang sudah dihapus belum dibereskan, menyebabkan error TypeScript) sebelum diperbaiki — bukti nyata bahwa migrasi fitur di repo ini kadang dilakukan bertahap dan sempat meninggalkan state tidak konsisten di working tree.

7. **Basis pengetahuan Asisten AI berpotensi basi (stale)**
   - `lib/assistant/knowledge.ts` (§6.15.3) berisi ringkasan navigasi/prosedur yang ditulis manual, dan **sudah tidak sinkron** dengan menu aktual: masih menyebut "Stok GA" yang sudah dihapus, dan belum menyebut menu baru seperti "Goods Receipt", "MR Saya", "Feedback Masuk".
   - Ini relevan dibahas sebagai risiko *prompt/knowledge drift* — dokumentasi yang disuntikkan ke LLM tidak otomatis mengikuti perubahan kode, sehingga perlu proses maintenance tersendiri.

8. **`.env.example` tidak lengkap**
   - Variabel untuk Asisten AI (`ASSISTANT_PROVIDER`, `GEMINI_API_KEY`, dll. — lihat §14) belum dicantumkan, padahal sudah dipakai di kode produksi.

Catatan ini bukan berarti sistem buruk, tetapi justru berguna untuk analisis akademik — terutama untuk pembahasan seputar *technical debt* dan *maintainability* pada pengembangan sistem informasi secara iteratif.

---

## 19. Relevansi untuk Skripsi
Sistem ini sangat layak dijadikan objek skripsi, terutama untuk tema:

### 19.1 Analisis dan perancangan sistem informasi
Karena sistem memiliki:
- aktor yang jelas
- proses bisnis yang runtut
- dokumen formal (MR, PO, petty cash)
- approval workflow
- data master dan transaksi

### 19.2 Topik yang bisa diangkat
Contoh topik skripsi yang relevan:

1. **Rancang Bangun Sistem Informasi Pengadaan Barang Berbasis Web**
2. **Implementasi Workflow Approval Digital pada Sistem Pengadaan General Affair**
3. **Analisis Efektivitas Digitalisasi Material Request dan Purchase Order**
4. **Perancangan Sistem Monitoring Pengadaan dengan Integrasi Cost Center dan Notifikasi**
5. **Evaluasi User Access Control Berbasis Role dan Department pada Sistem Procurement**
6. **Implementasi Supabase sebagai Backend-as-a-Service pada Sistem Informasi Pengadaan**
7. **Analisis Pelacakan Status Pengadaan Menggunakan Model Workflow Bertingkat**
8. **Pengembangan Sistem Petty Cash Terintegrasi dengan Approval Multi-Level**
9. **Implementasi Asisten AI Berbasis LLM (Gemini/Claude) dengan Tool-Calling Read-Only untuk Navigasi dan Penelusuran Status pada Sistem Pengadaan** — lihat §6.15
10. **Analisis Keamanan Tanda Tangan Elektronik Berlapis pada Alur Approval Digital** — lihat §6.14

### 19.3 Komponen akademik yang mudah diturunkan dari sistem ini
- Identifikasi masalah manual procurement
- Analisis kebutuhan fungsional dan non-fungsional
- Use case diagram
- Activity diagram
- ERD / relasi data
- Sequence diagram approval
- Class/type model
- Evaluasi sistem
- pengujian fungsional modul

---

## 20. Saran Cara Memahami Repository Ini untuk Model Lain
Jika dokumen ini dipakai model lain untuk mempelajari sistem, urutan belajar yang disarankan adalah:

### Tahap 1 — Pahami domain bisnis
Pelajari konsep:
- MR
- PO
- approval
- petty cash
- cost center
- vendor
- barang

### Tahap 2 — Pahami model data
Mulai dari file:
- `type/index.ts`
- `type/enum.ts`

Karena dua file ini mendefinisikan objek dan status inti sistem.

### Tahap 3 — Pahami kontrol akses
Pelajari:
- `middleware.ts`
- `services/userService.ts`
- `components/app-sidebar.tsx`

Karena file-file ini menjelaskan auth, role, department, dan menu akses.

### Tahap 4 — Pahami alur bisnis utama
Fokus ke service:
- `services/purchaseOrderService.ts` (termasuk `saveGoodsReceipt`/`saveBastAndComplete`)
- `services/pettyCashService.ts`
- `services/dashboardService.ts`
- `services/notificationService.ts`
- `services/mrService.ts`
- `services/approvalService.ts`
- `services/costCenterService.ts` (`deductCostCenterBudget`/`refundCostCenterBudget`)
- `services/signatureService.ts` — **(baru)** tanda tangan digital, dipakai lintas modul approval/GR/BAST
- `services/feedbackService.ts` — **(baru)**

### Tahap 5 — Pahami tampilan dan route
Lihat:
- `app/page.tsx`
- `app/(With Sidebar)/layout.tsx`
- subroute modul pada `app/(With Sidebar)/...`

### Tahap 6 — Pahami data layer
Lihat:
- `lib/supabase/client.ts`
- `lib/supabase/server.ts`
- folder `supabase/migrations/*.sql` (urut berdasarkan timestamp nama file — ini riwayat perubahan skema paling akurat, lebih dipercaya daripada dokumen ini bila ada perbedaan)
- route `app/api/v1/signatures/*`

### Tahap 7 — Pahami Asisten AI (fitur baru, §6.15)
Lihat urut:
- `lib/assistant/knowledge.ts` (system prompt & batasan)
- `lib/assistant/tools.ts` (tool read-only yang tersedia)
- `lib/assistant/provider.ts` beserta `providers/gemini.ts` / `providers/claude.ts`
- `app/api/v1/assistant/route.ts` (endpoint streaming)
- `components/assistant/assistant-widget.tsx` (UI chat)

---

## 21. Kesimpulan
GarudaProcure adalah **sistem informasi pengadaan internal berbasis web** yang dibangun dengan **Next.js + TypeScript + Supabase**, dan dirancang untuk mendigitalisasi proses operasional **Material Request, Purchase Order, approval, petty cash, notifikasi, kontrol cost center, tanda tangan digital, serta asisten AI dalam-aplikasi**.

Sistem ini memiliki karakteristik penting:
- modular
- berbasis role dan department
- memiliki workflow approval multi-level dengan tanda tangan elektronik berlapis
- mendukung tracking status yang detail
- mendukung attachment dan notifikasi
- dilengkapi asisten AI ber-tool (read-only) untuk navigasi & penelusuran progres dokumen
- relevan untuk konteks enterprise internal

Untuk konteks skripsi, sistem ini sangat kaya karena dapat dianalisis dari sisi:
- proses bisnis
- arsitektur aplikasi
- model data
- kontrol akses
- workflow approval
- efektivitas digitalisasi pengadaan
- integrasi LLM/AI pada sistem informasi transaksional

Dengan kata lain, repository ini bukan sekadar template web biasa, tetapi sudah membentuk **sistem informasi operasional perusahaan** yang cukup matang untuk dijadikan objek studi, dokumentasi teknis, maupun dasar analisis akademik.
