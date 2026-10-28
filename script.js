console.log("script.js berhasil dipanggil!");


const API_URL =
  'https://script.google.com/macros/s/AKfycbwte2-gGB2U0i_AEGijAFZ2_A8qu0PMZO-njL3zzp0NHk-VbmR8qZtR5Z_dQ94uQ3G6UQ/exec';

let employees = [];

function getTableBody() {
  return document.getElementById('employeeTableBody')
    || document.getElementById('tableBody')
    || document.querySelector('#employeeTable tbody')
    || document.querySelector('#dataTable tbody');
}

function setLoadingMessage(message) {
  const element = document.getElementById('loadingMessage');

  if (element) {
    element.textContent = message;
  }
}

function renderTable() {
  const tbody = getTableBody();

  if (!tbody) {
    console.error(
      'Tabel tidak ditemukan. Tambahkan id="employeeTableBody" pada tbody.'
    );
    setLoadingMessage('Error: elemen tabel tidak ditemukan.');
    return;
  }

  tbody.replaceChildren();

  if (employees.length === 0) {
    setLoadingMessage('Belum ada data pelamar.');
    return;
  }

  employees.forEach((employee, index) => {
    const row = document.createElement('tr');

    const values = [
      index + 1,
      employee.id,
      employee.createdAt,
      employee.name,
      employee.email,
      employee.phone,
      employee.position,
      employee.birthDate,
      employee.gender,
      employee.education,
      employee.experience,
      employee.status,
      employee.notes
    ];

    values.forEach(value => {
      const cell = document.createElement('td');
      cell.textContent = value == null ? '' : String(value);
      row.appendChild(cell);
    });

    tbody.appendChild(row);
  });

  setLoadingMessage('');
  console.log('Tabel berhasil ditampilkan:', employees.length, 'data');
}

function loadEmployees() {
  setLoadingMessage('Memuat data...');
  console.log('Memulai pengambilan data pelamar...');

  const callbackName =
    'recruitmentCallback_' + Date.now();

  let finished = false;
  const script = document.createElement('script');

  const timeout = setTimeout(() => {
    finish();
    setLoadingMessage(
      'Gagal memuat data: API tidak merespons. Periksa deployment Apps Script.'
    );
    console.error('API timeout.');
  }, 20000);

  function finish() {
    if (finished) return;
    finished = true;

    clearTimeout(timeout);
    delete window[callbackName];
    script.remove();
  }

  window[callbackName] = function(response) {
    if (finished) return;
    finish();

    console.log('Respons Google Apps Script:', response);

    if (!response || response.success !== true ||
        !Array.isArray(response.data)) {
      setLoadingMessage(
        'Gagal membaca data: ' +
        (response?.message || 'Format respons API tidak sesuai.')
      );
      console.error('Respons API tidak valid:', response);
      return;
    }

    employees = response.data;
    renderTable();
  };

  script.onerror = function() {
    if (finished) return;
    finish();

    setLoadingMessage(
      'Koneksi API gagal. Periksa URL dan izin deployment Apps Script.'
    );
    console.error('Script API gagal dimuat.');
  };

  script.src =
    API_URL +
    '?action=list&callback=' +
    encodeURIComponent(callbackName) +
    '&_=' + Date.now();

  document.head.appendChild(script);
}

document.addEventListener('DOMContentLoaded', loadEmployees);
