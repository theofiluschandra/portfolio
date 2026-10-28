// URL Web App Google Apps Script. Gunakan URL deployment /exec.
const API_URL = 'https://script.google.com/macros/s/AKfycbwte2-gGB2U0i_AEGijAFZ2_A8qu0PMZO-njL3zzp0NHk-VbmR8qZtR5Z_dQ94uQ3G6UQ/exec';

let employees = [];
let requestCounter = 0;


const form = document.getElementById('employeeForm');
const notice = document.getElementById('notice');
const saveButton = document.getElementById('saveButton');
const tableArea = document.getElementById('tableArea');
const searchInput = document.getElementById('search');
const countLabel = document.getElementById('count');
const refreshButton = document.getElementById('refreshButton');

// Periksa apakah semua elemen HTML yang dibutuhkan ditemukan.
const missingElements = [];

if (!form) missingElements.push('employeeForm');
if (!notice) missingElements.push('notice');
if (!saveButton) missingElements.push('saveButton');
if (!tableArea) missingElements.push('tableArea');
if (!searchInput) missingElements.push('search');
if (!countLabel) missingElements.push('count');
if (!refreshButton) missingElements.push('refreshButton');

if (missingElements.length > 0) {
  console.error(
    'Elemen HTML tidak ditemukan:',
    missingElements.join(', ')
  );
}


function showNotice(message, type) {
  notice.textContent = message;
  notice.className = type;
  notice.style.display = 'block';
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  }[ch]));
}

function renderTable() {
  const query = searchInput.value.trim().toLowerCase();
  const filtered = employees.filter(e =>
    [e.name, e.email, e.position, e.phone, e.status]
      .some(v => String(v || '').toLowerCase().includes(query))
  );

  countLabel.textContent = filtered.length + ' data';

  if (!filtered.length) {
    tableArea.innerHTML = '<div class="empty">' +
      (employees.length ? 'Tidak ada data yang cocok.' : 'Belum ada data pelamar pada tab DataKaryawan.') +
      '</div>';
    return;
  }

  tableArea.innerHTML =
    '<div class="table-wrap"><table><thead><tr>' +
    '<th>Nama</th><th>Kontak</th><th>Posisi</th><th>Pendidikan</th>' +
    '<th>Pengalaman</th><th>Status</th><th>Tanggal input</th>' +
    '</tr></thead><tbody id="employeeTableBody">' +
    filtered.map(e => '<tr>' +
      '<td><strong>' + escapeHtml(e.name) + '</strong><br><small>' + escapeHtml(e.id) + '</small></td>' +
      '<td>' + escapeHtml(e.email) + '<br>' + escapeHtml(e.phone) + '</td>' +
      '<td>' + escapeHtml(e.position || '-') + '</td>' +
      '<td>' + escapeHtml(e.education || '-') + '</td>' +
      '<td>' + escapeHtml(e.experience || '0') + ' tahun</td>' +
      '<td><span class="pill">' + escapeHtml(e.status || 'Baru') + '</span></td>' +
      '<td>' + escapeHtml(e.createdAt || '-') + '</td></tr>').join('') +
    '</tbody></table></div>';
}

function loadEmployees() {
  const thisRequest = ++requestCounter;
  tableArea.innerHTML = '<div class="loading">Memuat data dari Google Sheets...</div>';

  // JSONP memungkinkan pembacaan lintas domain dari GitHub Pages.
  const callbackName = 'recruitmentCallback_' + thisRequest;
  const scriptId = 'recruitmentApiScript_' + thisRequest;
  const script = document.createElement('script');
  let finished = false;

  const cleanup = () => {
    if (finished) return;
    finished = true;
    delete window[callbackName];
    script.remove();
  };

  window[callbackName] = function(response) {
    cleanup();
    console.log('Respons API Google Apps Script:', response);

    if (!response || response.success !== true || !Array.isArray(response.data)) {
      tableArea.innerHTML = '<div class="empty">Respons API tidak sesuai. Periksa fungsi doGet(e) dan deployment Apps Script.</div>';
      console.error('Format respons API tidak valid:', response);
      return;
    }

    employees = response.data;
    renderTable();
  };

  script.id = scriptId;
  script.src = API_URL + '?action=list&callback=' + encodeURIComponent(callbackName) + '&_=' + Date.now();
  script.onerror = function() {
    cleanup();
    tableArea.innerHTML = '<div class="empty">Gagal menghubungi API. Periksa URL deployment, izin akses Web App, dan versi deployment.</div>';
    console.error('Script API gagal dimuat:', script.src);
  };

  // Batas waktu agar teks "Memuat data..." tidak terus-menerus.
  const timeoutId = window.setTimeout(() => {
    if (!finished) {
      cleanup();
      tableArea.innerHTML = '<div class="empty">Permintaan API terlalu lama. Periksa deployment Apps Script dan koneksi internet.</div>';
    }
  }, 15000);

  const originalCleanup = cleanup;
  // Bersihkan timeout saat callback atau error menyelesaikan request.
  window[callbackName] = function(response) {
    window.clearTimeout(timeoutId);
    originalCleanup();
    console.log('Respons API Google Apps Script:', response);

    if (!response || response.success !== true || !Array.isArray(response.data)) {
      tableArea.innerHTML = '<div class="empty">Respons API tidak sesuai. Periksa fungsi doGet(e) dan deployment Apps Script.</div>';
      console.error('Format respons API tidak valid:', response);
      return;
    }
    employees = response.data;
    renderTable();
  };
  script.onerror = function() {
    window.clearTimeout(timeoutId);
    originalCleanup();
    tableArea.innerHTML = '<div class="empty">Gagal menghubungi API. Periksa URL deployment, izin akses Web App, dan versi deployment.</div>';
    console.error('Script API gagal dimuat:', script.src);
  };

  document.head.appendChild(script);
}

searchInput.addEventListener('input', renderTable);
document.getElementById('refreshButton').addEventListener('click', loadEmployees);

// Catatan: pengiriman lintas domain dengan fetch no-cors tidak dapat membaca respons server.
// Untuk menghindari klaim sukses palsu, tombol simpan memberi instruksi konfigurasi backend bila
// endpoint belum mendukung metode penyimpanan lintas domain yang aman.

form.addEventListener('submit', function(event) {
  event.preventDefault();

  if (!form.reportValidity()) return;

  const data = new FormData(form);
  const email = String(data.get('email') || '').trim().toLowerCase();

  // Cegah duplikasi yang sudah terlihat pada daftar saat ini.
  if (employees.some(e =>
    String(e.email || '').trim().toLowerCase() === email
  )) {
    showNotice('Email tersebut sudah ada dalam daftar pelamar.', 'error');
    return;
  }

  saveButton.disabled = true;
  saveButton.textContent = 'Mengirim...';

  const iframeName = 'saveResultFrame';
  let iframe = document.querySelector(
    'iframe[name="' + iframeName + '"]'
  );

  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.name = iframeName;
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
  }

  // Form POST biasa ke Apps Script melalui iframe tersembunyi.
  const postForm = document.createElement('form');
  postForm.method = 'POST';
  postForm.action = API_URL;
  postForm.target = iframeName;
  postForm.style.display = 'none';

  data.forEach((value, key) => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = key;
    input.value = String(value);
    postForm.appendChild(input);
  });

  document.body.appendChild(postForm);

  let submitted = false;

  iframe.onload = function() {
    if (!submitted) return;
    submitted = false;

    showNotice(
      'Permintaan penyimpanan telah dikirim. Muat ulang daftar dan periksa Google Spreadsheet untuk memastikan data benar-benar tersimpan.',
      'success'
    );

    saveButton.disabled = false;
    saveButton.textContent = 'Simpan Data';

    postForm.remove();

    // Ambil ulang daftar dari Google Sheets.
    window.setTimeout(loadEmployees, 1500);
  };

  // Beri waktu agar iframe siap sebelum POST.
  window.setTimeout(function() {
    submitted = true;
    postForm.submit();
  }, 300);

});


loadEmployees();
