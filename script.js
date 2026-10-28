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
form.addEventListener('submit', async event => {
  event.preventDefault();
  showNotice('Formulir siap, tetapi penyimpanan lintas domain perlu diuji setelah API baca berhasil. Jangan kirim data sensitif sebelum akses API diamankan.', 'error');
});

loadEmployees();
