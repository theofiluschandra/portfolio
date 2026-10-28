console.log("script.js berhasil dipanggil!");

let employees = [];
    const form = document.getElementById('employeeForm');
    const notice = document.getElementById('notice');
    const saveButton = document.getElementById('saveButton');

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
      const query = document.getElementById('search').value.trim().toLowerCase();
      const filtered = employees.filter(e =>
        [e.name,e.email,e.position,e.phone,e.status].some(v => String(v || '').toLowerCase().includes(query))
      );
      document.getElementById('count').textContent = filtered.length + ' data';
      const area = document.getElementById('tableArea');
      if (!filtered.length) {
        area.innerHTML = '<div class="empty">' + (employees.length ? 'Tidak ada data yang cocok.' : 'Belum ada data pelamar. Isi formulir di sebelah kiri untuk mulai.') + '</div>';
        return;
      }
      area.innerHTML = '<div class="table-wrap"><table><thead><tr><th>Nama</th><th>Kontak</th><th>Posisi</th><th>Pendidikan</th><th>Pengalaman</th><th>Status</th><th>Tanggal input</th></tr></thead><tbody>' +
        filtered.map(e => '<tr><td><strong>' + escapeHtml(e.name) + '</strong><br><small>' + escapeHtml(e.id) + '</small></td><td>' + escapeHtml(e.email) + '<br>' + escapeHtml(e.phone) + '</td><td>' + escapeHtml(e.position || '-') + '</td><td>' + escapeHtml(e.education || '-') + '</td><td>' + escapeHtml(e.experience || '0') + ' tahun</td><td><span class="pill">' + escapeHtml(e.status || 'Baru') + '</span></td><td>' + escapeHtml(e.createdAt || '-') + '</td></tr>').join('') +
        '</tbody></table></div>';
    }
    function loadEmployees() {
      document.getElementById('tableArea').innerHTML = '<div class="loading">Memuat data...</div>';
      google.script.run.withSuccessHandler(data => {
        employees = data || [];
        renderTable();
      }).withFailureHandler(err => {
        document.getElementById('tableArea').innerHTML = '<div class="empty">Gagal memuat data. ' + escapeHtml(err.message || err) + '</div>';
      }).getEmployees();
    }
    form.addEventListener('submit', event => {
      event.preventDefault();
      saveButton.disabled = true;
      saveButton.textContent = 'Menyimpan...';
      const data = Object.fromEntries(new FormData(form).entries());
      google.script.run.withSuccessHandler(result => {
        showNotice(result.message, 'ok');
        form.reset();
        document.getElementById('experience').value = 0;
        loadEmployees();
        saveButton.disabled = false;
        saveButton.textContent = 'Simpan Data';
      }).withFailureHandler(err => {
        showNotice(err.message || 'Data gagal disimpan.', 'error');
        saveButton.disabled = false;
        saveButton.textContent = 'Simpan Data';
      }).saveEmployee(data);
    });
    document.getElementById('search').addEventListener('input', renderTable);
    document.getElementById('refreshButton').addEventListener('click', loadEmployees);
    loadEmployees();
}
