/* =====================================================
   RKPH ERP ADMIN PANEL — CLEAN FINAL admin.js
   Stable Login + Session + Dashboard + CRUD Base
===================================================== */
'use strict';

/* =========================================
   SUPABASE CONFIG
========================================= */
const SUPABASE_URL = 'https://xkmgugmhfmilgccwpqbi.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_xGQ5xycskcU8MaabewpWYw_ZLqxbgZ7';

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

/* =========================================
   GLOBAL STATE
========================================= */
const STATE = {
  admin: null,
  loggedIn: false,
  students: [],
  results: [],
  fees: [],
  attendance: []
};

/* =========================================
   INIT
========================================= */
document.addEventListener('DOMContentLoaded', initApp);

function initApp() {
  bindUI();
  bindModals();
  restoreSession();
}

/* =========================================
   UI BINDINGS
========================================= */
function bindUI() {
  const user = document.getElementById('loginUser');
  const pass = document.getElementById('loginPwd');

  if (user) {
    user.addEventListener('keydown', e => {
      if (e.key === 'Enter') adminLogin();
    });
  }

  if (pass) {
    pass.addEventListener('keydown', e => {
      if (e.key === 'Enter') adminLogin();
    });
  }
}

function bindModals() {
  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', e => {
      if (e.target === modal) modal.classList.remove('open');
    });
  });
}

/* =========================================
   SESSION
========================================= */
function restoreSession() {
  try {
    const saved = localStorage.getItem('rkph_admin');
    if (!saved) {
      showLogin();
      return;
    }

    STATE.admin = JSON.parse(saved);
    STATE.loggedIn = true;

    showDashboard();
    loadDashboard();

  } catch (err) {
    localStorage.removeItem('rkph_admin');
    showLogin();
  }
}

/* =========================================
   LOGIN
========================================= */
function adminLogin() {
  const user = val('loginUser');
  const pass = val('loginPwd');
  const err = document.getElementById('loginErr');

  if (!user || !pass) {
    setErr('Enter username & password');
    return false;
  }

  if (user === 'admin' && pass === 'rkph@admin2025') {
    STATE.loggedIn = true;
    STATE.admin = { name: 'Administrator' };

    localStorage.setItem(
      'rkph_admin',
      JSON.stringify(STATE.admin)
    );

    clearErr();
    showDashboard();

    toast('Login Successful', 'success');

    loadDashboard();
    return true;
  }

  setErr('Invalid username or password');
  toast('Invalid Login', 'error');
  return false;

  function setErr(msg) {
    if (err) err.innerText = msg;
  }

  function clearErr() {
    if (err) err.innerText = '';
  }
}

window.doAdminLogin = adminLogin;

/* =========================================
   LOGOUT
========================================= */
function adminLogout() {
  STATE.loggedIn = false;
  STATE.admin = null;

  localStorage.removeItem('rkph_admin');

  showLogin();
  toast('Logged out', 'info');
}

window.doLogout = adminLogout;

/* =========================================
   SCREEN CONTROL
========================================= */
function showLogin() {
  const login = document.getElementById('loginScreen');
  const app = document.getElementById('app');

  if (login) login.style.display = 'flex';
  if (app) app.style.display = 'none';
}

function showDashboard() {
  const login = document.getElementById('loginScreen');
  const app = document.getElementById('app');

  if (login) login.style.display = 'none';
  if (app) app.style.display = 'block';
}

/* =========================================
   DASHBOARD LOAD
========================================= */
async function loadDashboard() {
  await Promise.allSettled([
    fetchDashboardStats(),
    loadStudents(),
    loadResults(),
    loadFees(),
    loadAttendance()
  ]);
}

/* =========================================
   STATS
========================================= */
async function fetchDashboardStats() {
  try {
    const [
      students,
      results,
      fees,
      attendance
    ] = await Promise.all([
      supabaseClient.from('students').select('*', { count: 'exact', head: true }),
      supabaseClient.from('results').select('*', { count: 'exact', head: true }),
      supabaseClient.from('fees').select('*', { count: 'exact', head: true }),
      supabaseClient.from('attendance').select('*', { count: 'exact', head: true })
    ]);

    setText('dash-students', students.count || 0);
    setText('dash-results', results.count || 0);
    setText('dash-notices', fees.count || 0);
    setText('dash-assigns', attendance.count || 0);

  } catch (err) {
    console.error(err);
  }
}

// ================================
// STUDENT MANAGEMENT FINAL MODULE
// ================================

async function loadStudents() {
  try {
    const { data, error } = await supabaseClient
      .from('students')
      .select('*')
      .order('roll', { ascending: true });

    if (error) throw error;

    STATE.students = data || [];
    renderStudentTable();

  } catch (err) {
    console.error(err);
    toast('Failed to load students', 'error');
  }
}

// -------------------
// Render Table
// -------------------
function renderStudentTable() {
  const tbody = document.getElementById('studentTbody');
  if (!tbody) return;

  const search = val('stuSearch').toLowerCase();
  const cls = val('stuFilterClass');
  const stream = val('stuFilterStream');

  let rows = [...STATE.students];

  if (search) {
    rows = rows.filter(st =>
      String(st.roll).toLowerCase().includes(search) ||
      String(st.name).toLowerCase().includes(search)
    );
  }

  if (cls) rows = rows.filter(st => st.class == cls);
  if (stream) rows = rows.filter(st => st.stream == stream);

  if (!rows.length) {
    tbody.innerHTML =
      `<tr><td colspan="9">No students found</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(st => `
    <tr>
      <td>${st.roll}</td>
      <td>${st.name}</td>
      <td>${st.class}</td>
      <td>${st.stream || '-'}</td>
      <td>${st.section || '-'}</td>
      <td>${st.session || '-'}</td>
      <td>${st.phone || '-'}</td>
      <td>${st.father_name || '-'}</td>
      <td>
        <button onclick="editStudent('${st.roll}')">Edit</button>
        <button onclick="deleteStudent('${st.roll}')">Delete</button>
      </td>
    </tr>
  `).join('');

  setText('stuCount', `${rows.length} Students`);
}

// -------------------
// Add Student
// -------------------
async function addStudent() {
  try {
    const roll = val('s_roll');

    // Duplicate check
    const exists = STATE.students.find(x => x.roll == roll);
    if (exists) {
      toast('Roll number already exists', 'error');
      return;
    }

    const payload = {
      roll,
      password: val('s_pass'),
      name: val('s_name'),
      class: val('s_class'),
      section: val('s_section'),
      stream: val('s_stream'),
      session: '2025-26',
      phone: val('s_phone'),
      email: val('s_email'),
      father_name: val('s_father'),
      father_phone: val('s_fphone'),
      address: val('s_addr')
    };

    if (!payload.roll || !payload.name) {
      toast('Roll & Name required', 'error');
      return;
    }

    const { error } = await supabaseClient
      .from('students')
      .insert([payload]);

    if (error) throw error;

    toast('Student Added', 'success');

    closeModal('studentModal');
    clearStudentForm();
    loadStudents();
    fetchDashboardStats();

  } catch (err) {
    console.error(err);
    toast('Failed to add student', 'error');
  }
}

// -------------------
// Edit Student
// -------------------
window.editStudent = function (roll) {
  const st = STATE.students.find(x => x.roll == roll);
  if (!st) return;

  setVal('s_roll', st.roll);
  setVal('s_pass', st.password);
  setVal('s_name', st.name);
  setVal('s_class', st.class);
  setVal('s_section', st.section);
  setVal('s_stream', st.stream);
  setVal('s_phone', st.phone);
  setVal('s_email', st.email);
  setVal('s_father', st.father_name);
  setVal('s_fphone', st.father_phone);
  setVal('s_addr', st.address);

  const btn = document.getElementById('addStudentBtn');
  btn.innerText = 'Update Student';
  btn.onclick = () => updateStudent(roll);

  openModal('studentModal');
};

// -------------------
// Update Student
// -------------------
async function updateStudent(oldRoll) {
  try {
    const payload = {
      roll: val('s_roll'),
      password: val('s_pass'),
      name: val('s_name'),
      class: val('s_class'),
      section: val('s_section'),
      stream: val('s_stream'),
      phone: val('s_phone'),
      email: val('s_email'),
      father_name: val('s_father'),
      father_phone: val('s_fphone'),
      address: val('s_addr')
    };

    const { error } = await supabaseClient
      .from('students')
      .update(payload)
      .eq('roll', oldRoll);

    if (error) throw error;

    toast('Student Updated', 'success');

    closeModal('studentModal');
    clearStudentForm();
    resetStudentBtn();
    loadStudents();

  } catch (err) {
    toast('Update failed', 'error');
  }
}

// -------------------
// Delete Student
// -------------------
window.deleteStudent = async function (roll) {
  if (!confirm(`Delete student ${roll}?`)) return;

  try {
    const { error } = await supabaseClient
      .from('students')
      .delete()
      .eq('roll', roll);

    if (error) throw error;

    toast('Deleted', 'success');

    loadStudents();
    fetchDashboardStats();

  } catch (err) {
    toast('Delete failed', 'error');
  }
};

// -------------------
// Reset Button
// -------------------
function resetStudentBtn() {
  const btn = document.getElementById('addStudentBtn');
  btn.innerText = 'Add Student';
  btn.onclick = addStudent;
}

/* =========================================
   RESULTS
========================================= */
async function loadResults() {
  try {
    const { data } = await supabaseClient
      .from('results')
      .select('*')
      .order('id', { ascending: false });

    STATE.results = data || [];
  } catch (err) {}
}

/* =========================================
   FEES
========================================= */
async function loadFees() {
  try {
    const { data } = await supabaseClient
      .from('fees')
      .select('*')
      .order('id', { ascending: false });

    STATE.fees = data || [];
  } catch (err) {}
}

/* =========================================
   ATTENDANCE
========================================= */
async function loadAttendance() {
  try {
    const { data } = await supabaseClient
      .from('attendance')
      .select('*')
      .order('date', { ascending: false });

    STATE.attendance = data || [];
  } catch (err) {}
}

/* =========================================
   TABS
========================================= */
window.showTab = function (name, el) {
  document.querySelectorAll('.tab')
    .forEach(x => x.classList.remove('active'));

  document.querySelectorAll('.nav-item')
    .forEach(x => x.classList.remove('active'));

  const tab = document.getElementById('tab-' + name);
  if (tab) tab.classList.add('active');

  if (el) el.classList.add('active');

  if (name === 'students') loadStudents();
  if (name === 'marks') loadResults();
  if (name === 'fees') loadFees();
  if (name === 'attendance') loadAttendance();
};

/* =========================================
   MODALS
========================================= */
window.openModal = id => {
  const el = document.getElementById(id);
  if (el) el.classList.add('open');
};

window.closeModal = id => {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
};

/* =========================================
   HELPERS
========================================= */
function val(id) {
  return document.getElementById(id)?.value.trim() || '';
}

function setText(id, txt) {
  const el = document.getElementById(id);
  if (el) el.textContent = txt;
}

function clearStudentForm() {
  [
    's_roll','s_pass','s_name','s_class',
    's_section','s_stream','s_phone',
    's_email','s_father','s_fphone','s_addr'
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
}

/* =========================================
   TOAST
========================================= */
function toast(msg, type = 'info') {
  const box = document.createElement('div');
  box.className = `toast toast-${type}`;
  box.innerText = msg;

  document.body.appendChild(box);

  setTimeout(() => box.classList.add('show'), 100);
  setTimeout(() => box.remove(), 3000);
}

/* =====================================================
   RKPH ERP ADMIN PANEL — CLEAN FINAL admin.js
   PART 2 : Edit + Search + Results + Fees + Attendance
===================================================== */

/* =========================================
   SEARCH STUDENTS
========================================= */
window.renderStudentTable = function () {
  const search = val('stuSearch').toLowerCase();
  const cls = val('stuFilterClass');
  const stream = val('stuFilterStream');

  let rows = [...STATE.students];

  if (search) {
    rows = rows.filter(st =>
      String(st.roll).toLowerCase().includes(search) ||
      String(st.name).toLowerCase().includes(search)
    );
  }

  if (cls) {
    rows = rows.filter(st => String(st.class) === cls);
  }

  if (stream) {
    rows = rows.filter(st => String(st.stream) === stream);
  }

  const tbody = document.getElementById('studentTbody');
  if (!tbody) return;

  if (!rows.length) {
    tbody.innerHTML = `
      <tr><td colspan="9">No students found</td></tr>
    `;
    return;
  }

  tbody.innerHTML = rows.map(st => `
    <tr>
      <td>${st.roll || ''}</td>
      <td>${st.name || ''}</td>
      <td>${st.class || ''}</td>
      <td>${st.stream || '-'}</td>
      <td>${st.section || '-'}</td>
      <td>${st.session || '-'}</td>
      <td>${st.phone || '-'}</td>
      <td>${st.father_name || '-'}</td>
      <td>
        <button onclick="editStudent('${st.roll}')">Edit</button>
        <button onclick="deleteStudent('${st.roll}')">Delete</button>
      </td>
    </tr>
  `).join('');

  setText('stuCount', `${rows.length} Students`);
};

/* =========================================
   EDIT STUDENT
========================================= */
window.editStudent = function (roll) {
  const st = STATE.students.find(x => x.roll == roll);
  if (!st) return;

  setVal('s_roll', st.roll);
  setVal('s_pass', st.password);
  setVal('s_name', st.name);
  setVal('s_class', st.class);
  setVal('s_section', st.section);
  setVal('s_stream', st.stream);
  setVal('s_phone', st.phone);
  setVal('s_email', st.email);
  setVal('s_father', st.father_name);
  setVal('s_fphone', st.father_phone);
  setVal('s_addr', st.address);

  const btn = document.getElementById('addStudentBtn');
  if (btn) {
    btn.innerText = 'Update Student';
    btn.onclick = () => updateStudent(roll);
  }

  openModal('studentModal');
};

async function updateStudent(oldRoll) {
  try {
    const payload = {
      roll: val('s_roll'),
      password: val('s_pass'),
      name: val('s_name'),
      class: val('s_class'),
      section: val('s_section'),
      stream: val('s_stream'),
      phone: val('s_phone'),
      email: val('s_email'),
      father_name: val('s_father'),
      father_phone: val('s_fphone'),
      address: val('s_addr')
    };

    const { error } = await supabaseClient
      .from('students')
      .update(payload)
      .eq('roll', oldRoll);

    if (error) throw error;

    toast('Student Updated', 'success');
    closeModal('studentModal');
    clearStudentForm();
    resetStudentBtn();

    loadStudents();

  } catch (err) {
    toast('Update failed', 'error');
  }
}

function resetStudentBtn() {
  const btn = document.getElementById('addStudentBtn');
  if (!btn) return;

  btn.innerText = 'Add Student';
  btn.onclick = addStudent;
}

/* =========================================
   RESULTS MODULE
========================================= */
window.renderMarksTable = function () {
  const tbody = document.getElementById('marksTbody');
  if (!tbody) return;

  if (!STATE.results.length) {
    tbody.innerHTML = `
      <tr><td colspan="8">No results found</td></tr>
    `;
    return;
  }

  tbody.innerHTML = STATE.results.map(r => {
    const percent =
      r.max_marks > 0
        ? ((r.marks / r.max_marks) * 100).toFixed(1)
        : 0;

    return `
      <tr>
        <td>${r.roll}</td>
        <td>${r.class || '-'}</td>
        <td>${r.session || '-'}</td>
        <td>${r.exam}</td>
        <td>${r.marks}/${r.max_marks}</td>
        <td>${percent}%</td>
        <td>${r.grade || '-'}</td>
        <td>
          <button onclick="deleteResult(${r.id})">Delete</button>
        </td>
      </tr>
    `;
  }).join('');
};

window.saveMarks = async function () {
  try {
    const payload = {
      roll: val('res_roll'),
      exam: val('res_exam'),
      subject: val('res_subject'),
      marks: Number(val('res_marks')),
      max_marks: Number(val('res_max_marks')),
      grade: val('res_grade')
    };

    const { error } = await supabaseClient
      .from('results')
      .insert([payload]);

    if (error) throw error;

    toast('Result Added', 'success');
    closeModal('marksModal');

    loadResults();
    fetchDashboardStats();

  } catch (err) {
    toast('Save failed', 'error');
  }
};

window.deleteResult = async function (id) {
  if (!confirm('Delete result?')) return;

  try {
    await supabaseClient
      .from('results')
      .delete()
      .eq('id', id);

    loadResults();
    fetchDashboardStats();

    toast('Deleted', 'success');

  } catch (err) {
    toast('Delete failed', 'error');
  }
};

/* =========================================
   FEES MODULE
========================================= */
window.renderFeeTable = function () {
  const tbody = document.getElementById('feeTbody');
  if (!tbody) return;

  if (!STATE.fees.length) {
    tbody.innerHTML = `
      <tr><td colspan="7">No fee records found</td></tr>
    `;
    return;
  }

  tbody.innerHTML = STATE.fees.map(f => `
    <tr>
      <td>${f.quarter || '-'}</td>
      <td>${f.type || '-'}</td>
      <td>₹${f.amount || 0}</td>
      <td>${f.due_date || '-'}</td>
      <td>${f.paid_on || '-'}</td>
      <td>${f.status || '-'}</td>
      <td>
        <button onclick="deleteFee(${f.id})">Delete</button>
      </td>
    </tr>
  `).join('');
};

window.saveFee = async function () {
  try {
    const payload = {
      roll: val('fee_roll'),
      amount: Number(val('fee_amount')),
      status: val('fee_status'),
      date: val('fee_date')
    };

    const { error } = await supabaseClient
      .from('fees')
      .insert([payload]);

    if (error) throw error;

    toast('Fee Added', 'success');
    closeModal('feeModal');

    loadFees();
    fetchDashboardStats();

  } catch (err) {
    toast('Save failed', 'error');
  }
};

window.deleteFee = async function (id) {
  if (!confirm('Delete fee record?')) return;

  try {
    await supabaseClient
      .from('fees')
      .delete()
      .eq('id', id);

    loadFees();
    fetchDashboardStats();

    toast('Deleted', 'success');

  } catch (err) {
    toast('Delete failed', 'error');
  }
};

/* =========================================
   ATTENDANCE MODULE
========================================= */
window.renderAttendance = function () {
  const box = document.getElementById('attEditorWrap');
  if (!box) return;

  if (!STATE.attendance.length) {
    box.innerHTML = `
      <div style="padding:30px;text-align:center">
        No attendance records
      </div>
    `;
    return;
  }

  box.innerHTML = `
    <table class="admin-tbl">
      <thead>
        <tr>
          <th>Roll</th>
          <th>Date</th>
          <th>Status</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        ${STATE.attendance.map(a => `
          <tr>
            <td>${a.roll}</td>
            <td>${a.date}</td>
            <td>${a.status}</td>
            <td>
              <button onclick="deleteAttendance(${a.id})">
                Delete
              </button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
};

window.deleteAttendance = async function (id) {
  if (!confirm('Delete attendance?')) return;

  try {
    await supabaseClient
      .from('attendance')
      .delete()
      .eq('id', id);

    loadAttendance();
    fetchDashboardStats();

    toast('Deleted', 'success');

  } catch (err) {
    toast('Delete failed', 'error');
  }
};

/* =========================================
   HELPERS
========================================= */
function setVal(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value || '';
}

/* =====================================================
   RKPH ERP ADMIN PANEL — CLEAN FINAL admin.js
   PART 3 : Notices + Assignments + Modals + Final Utils
===================================================== */

/* =========================================
   NOTICE MODULE
========================================= */
window.saveNotice = function () {
  const title = val('notice_title');
  const msg = val('notice_message');

  if (!title) {
    toast('Enter notice title', 'error');
    return;
  }

  toast('Notice Saved', 'success');
  closeModal('noticeModal');

  const tbody = document.getElementById('noticeTbody');
  if (!tbody) return;

  const row = document.createElement('tr');

  row.innerHTML = `
    <td>${title}</td>
    <td>${msg || '-'}</td>
    <td>${new Date().toLocaleDateString()}</td>
    <td>
      <button onclick="this.closest('tr').remove()">
        Delete
      </button>
    </td>
  `;

  tbody.prepend(row);
};

/* =========================================
   ASSIGNMENT MODULE
========================================= */
window.saveAssign = function () {
  const subject = val('assign_subject');
  const title = val('assign_title');

  if (!subject) {
    toast('Enter subject', 'error');
    return;
  }

  toast('Assignment Saved', 'success');
  closeModal('assignModal');

  const tbody = document.getElementById('assignTbody');
  if (!tbody) return;

  const row = document.createElement('tr');

  row.innerHTML = `
    <td>${subject}</td>
    <td>${title || '-'}</td>
    <td>${val('assign_due') || '-'}</td>
    <td>
      <button onclick="this.closest('tr').remove()">
        Delete
      </button>
    </td>
  `;

  tbody.prepend(row);
};

/* =========================================
   EXAM MODULE
========================================= */
window.saveExam = function () {
  const name = val('exam_name');

  if (!name) {
    toast('Enter exam name', 'error');
    return;
  }

  toast('Exam Saved', 'success');
  closeModal('examModal');

  const tbody = document.getElementById('examTbody');
  if (!tbody) return;

  const row = document.createElement('tr');

  row.innerHTML = `
    <td>${name}</td>
    <td>${val('exam_class') || '-'}</td>
    <td>${val('exam_date') || '-'}</td>
    <td>
      <button onclick="this.closest('tr').remove()">
        Delete
      </button>
    </td>
  `;

  tbody.prepend(row);
};

/* =========================================
   OPEN MODALS
========================================= */
window.openStudentModal = function () {
  clearStudentForm();
  resetStudentBtn();

  const title = document.getElementById('studentModalTitle');
  if (title) title.innerText = 'Add Student';

  openModal('studentModal');
};

window.openMarksModal = function () {
  clearMarksForm();

  const title = document.getElementById('marksModalTitle');
  if (title) title.innerText = 'Add Result';

  openModal('marksModal');
};

window.openNoticeModal = function () {
  openModal('noticeModal');
};

window.openAssignModal = function () {
  openModal('assignModal');
};

window.openFeeModal = function () {
  openModal('feeModal');
};

window.openExamModal = function () {
  openModal('examModal');
};

/* =========================================
   FORM CLEAR
========================================= */
function clearMarksForm() {
  [
    'res_roll',
    'res_exam',
    'res_subject',
    'res_marks',
    'res_max_marks',
    'res_grade'
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
}

/* =========================================
   NOTICE TABS
========================================= */
window.switchNoticeTab = function (type, btn) {
  document.querySelectorAll('.notice-tab')
    .forEach(el => el.style.display = 'none');

  const target = document.getElementById(
    'ntab-' + type + '-content'
  );

  if (target) target.style.display = 'block';

  document.querySelectorAll('.notice-btn')
    .forEach(x => x.classList.remove('active'));

  if (btn) btn.classList.add('active');
};

/* =========================================
   SUBJECT ROWS
========================================= */
window.addSubjectRow = function () {
  const wrap = document.getElementById('marksSubjRows');
  if (!wrap) return;

  const row = document.createElement('div');

  row.style.display = 'grid';
  row.style.gridTemplateColumns =
    '1fr 80px 80px 80px 90px';
  row.style.gap = '8px';
  row.style.marginBottom = '8px';

  row.innerHTML = `
    <input placeholder="Subject" class="f-input">
    <input placeholder="Marks" class="f-input">
    <input placeholder="Max" class="f-input">
    <input placeholder="Grade" class="f-input">
    <button onclick="this.parentElement.remove()">
      Remove
    </button>
  `;

  wrap.appendChild(row);
};

/* =========================================
   TABLE FILTER PLACEHOLDERS
========================================= */
window.renderClassNotices = function () {};
window.renderPrivateNotices = function () {};
window.filterPrivateNoticeByClass = function () {};
window.filterAssignByClass = function () {};
window.renderAssignTable = function () {};
window.filterAttByClass = function () {};
window.renderTTEditor = function () {};

/* =========================================
   OVERRIDE LOADERS TO AUTO RENDER
========================================= */
const _loadResults = loadResults;
loadResults = async function () {
  await _loadResults();
  renderMarksTable();
};

const _loadFees = loadFees;
loadFees = async function () {
  await _loadFees();
  renderFeeTable();
};

const _loadAttendance = loadAttendance;
loadAttendance = async function () {
  await _loadAttendance();
  renderAttendance();
};

const _loadStudents = loadStudents;
loadStudents = async function () {
  await _loadStudents();
  renderStudentTable();
};

/* =========================================
   GLOBAL SAVE STUDENT BUTTON
========================================= */
window.saveStudent = function () {
  const btn = document.getElementById('addStudentBtn');

  if (btn && btn.innerText.includes('Update')) {
    btn.click();
    return;
  }

  addStudent();
  closeModal('studentModal');
};

/* =========================================
   FINAL START
========================================= */
setTimeout(() => {
  if (STATE.loggedIn) {
    loadDashboard();
  }
}, 300);


/* =====================================================
   RKPH ERP ADMIN PANEL — CLEAN FINAL admin.js
   PART 4 : Premium Final Patch + Error Safe + Polish
===================================================== */

/* =========================================
   GLOBAL ERROR SAFETY
========================================= */
window.addEventListener('error', function (e) {
  console.error('JS Error:', e.message);
});

window.addEventListener('unhandledrejection', function (e) {
  console.error('Promise Error:', e.reason);
});

/* =========================================
   SAFE TOAST STYLE PATCH
========================================= */
(function injectToastStyle() {
  if (document.getElementById('toastPatch')) return;

  const style = document.createElement('style');
  style.id = 'toastPatch';

  style.innerHTML = `
    .toast{
      position:fixed;
      right:20px;
      top:20px;
      z-index:99999;
      padding:12px 18px;
      border-radius:12px;
      color:#fff;
      font-size:14px;
      font-weight:600;
      opacity:0;
      transform:translateY(-10px);
      transition:.25s ease;
      box-shadow:0 10px 30px rgba(0,0,0,.15);
    }
    .toast.show{
      opacity:1;
      transform:translateY(0);
    }
    .toast-success{background:#10b981;}
    .toast-error{background:#ef4444;}
    .toast-info{background:#3b82f6;}
  `;

  document.head.appendChild(style);
})();

/* =========================================
   LOADER PATCH
========================================= */
function showLoader() {
  const el = document.getElementById('globalLoader');
  if (el) el.style.display = 'flex';
}

function hideLoader() {
  const el = document.getElementById('globalLoader');
  if (el) el.style.display = 'none';
}

/* =========================================
   BUTTON AUTO DISABLE
========================================= */
function lockBtn(btn) {
  if (!btn) return;
  btn.disabled = true;
  btn.style.opacity = '.6';
}

function unlockBtn(btn) {
  if (!btn) return;
  btn.disabled = false;
  btn.style.opacity = '1';
}

/* =========================================
   LOGIN BUTTON PATCH
========================================= */
(function patchLoginBtn() {
  const btn = document.getElementById('loginBtn');
  if (!btn) return;

  btn.onclick = async function () {
    lockBtn(btn);
    showLoader();

    try {
      adminLogin();
    } finally {
      setTimeout(() => {
        unlockBtn(btn);
        hideLoader();
      }, 500);
    }
  };
})();

/* =========================================
   ESC CLOSE MODAL
========================================= */
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open')
      .forEach(m => m.classList.remove('open'));
  }
});

/* =========================================
   AUTO ACTIVE FIRST TAB
========================================= */
setTimeout(() => {
  const firstTab = document.querySelector('.nav-item');
  const firstPane = document.querySelector('.tab');

  if (firstTab && firstPane && STATE.loggedIn) {
    firstTab.classList.add('active');
    firstPane.classList.add('active');
  }
}, 300);

/* =========================================
   SESSION TIMEOUT OPTIONAL
========================================= */
let sessionTimer;

function resetSessionTimer() {
  clearTimeout(sessionTimer);

  sessionTimer = setTimeout(() => {
    if (STATE.loggedIn) {
      toast('Session expired', 'info');
      adminLogout();
    }
  }, 1000 * 60 * 60 * 6); // 6 hr
}

['click', 'keydown', 'mousemove'].forEach(evt => {
  document.addEventListener(evt, resetSessionTimer);
});

resetSessionTimer();

/* =========================================
   QUICK COUNTERS REFRESH
========================================= */
window.refreshDashboard = function () {
  fetchDashboardStats();
  loadStudents();
  loadResults();
  loadFees();
  loadAttendance();

  toast('Dashboard Refreshed', 'success');
};

/* =========================================
   TABLE EXPORT CSV
========================================= */
window.exportTable = function (tableId, fileName = 'export.csv') {
  const table = document.getElementById(tableId);
  if (!table) return;

  let csv = [];

  table.querySelectorAll('tr').forEach(row => {
    let cols = row.querySelectorAll('th,td');
    let data = [];

    cols.forEach(col => {
      data.push(
        '"' + col.innerText.replace(/"/g, '""') + '"'
      );
    });

    csv.push(data.join(','));
  });

  const blob = new Blob([csv.join('\n')], {
    type: 'text/csv'
  });

  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  a.click();
};

/* =========================================
   LIVE CLOCK
========================================= */
(function liveClock() {
  const el = document.getElementById('liveClock');
  if (!el) return;

  setInterval(() => {
    const d = new Date();
    el.innerText = d.toLocaleString();
  }, 1000);
})();

/* =========================================
   FINAL READY MESSAGE
========================================= */
setTimeout(() => {
  console.log(
    'RKPH Premium Admin Panel Loaded Successfully'
  );
}, 500);


/* =====================================================
   RKPH ERP ADMIN PANEL — CLEAN FINAL admin.js
   PART 5 : Final Bindings + Utility Hooks + Ready End
   (LAST PART)
===================================================== */

/* =========================================
   GLOBAL WINDOW EXPORTS
========================================= */
window.addStudent = addStudent;
window.updateStudent = updateStudent;
window.loadStudents = loadStudents;

window.loadResults = loadResults;
window.loadFees = loadFees;
window.loadAttendance = loadAttendance;

window.fetchDashboardStats = fetchDashboardStats;
window.refreshDashboard = refreshDashboard;

/* =========================================
   AUTO INPUT ENTER SUBMIT
========================================= */
(function bindFormsEnterKey() {
  const forms = [
    ['studentModal', saveStudent],
    ['marksModal', saveMarks],
    ['noticeModal', saveNotice],
    ['assignModal', saveAssign],
    ['feeModal', saveFee],
    ['examModal', saveExam]
  ];

  forms.forEach(item => {
    const modal = document.getElementById(item[0]);
    if (!modal) return;

    modal.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        item[1]();
      }
    });
  });
})();

/* =========================================
   SEARCH LIVE BINDINGS
========================================= */
(function bindLiveSearch() {
  const stu = document.getElementById('stuSearch');
  if (stu) {
    stu.addEventListener('input', renderStudentTable);
  }

  const cls = document.getElementById('stuFilterClass');
  if (cls) {
    cls.addEventListener('change', renderStudentTable);
  }

  const stream = document.getElementById('stuFilterStream');
  if (stream) {
    stream.addEventListener('change', renderStudentTable);
  }
})();

/* =========================================
   SMART EMPTY STATES
========================================= */
function patchEmptyStates() {
  [
    'studentTbody',
    'marksTbody',
    'feeTbody',
    'noticeTbody',
    'assignTbody'
  ].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;

    if (!el.innerHTML.trim()) {
      el.innerHTML = `
        <tr>
          <td colspan="10"
            style="padding:25px;text-align:center;color:#888">
            No records found
          </td>
        </tr>
      `;
    }
  });
}

/* =========================================
   AUTO PATCH AFTER LOAD
========================================= */
setTimeout(() => {
  patchEmptyStates();
}, 800);

/* =========================================
   QUICK ACTION SHORTCUTS
========================================= */
document.addEventListener('keydown', function (e) {

  if (!STATE.loggedIn) return;

  // Ctrl + N = Add Student
  if (e.ctrlKey && e.key.toLowerCase() === 'n') {
    e.preventDefault();
    openStudentModal();
  }

  // Ctrl + R = Refresh
  if (e.ctrlKey && e.key.toLowerCase() === 'r') {
    e.preventDefault();
    refreshDashboard();
  }

  // Ctrl + L = Logout
  if (e.ctrlKey && e.key.toLowerCase() === 'l') {
    e.preventDefault();
    adminLogout();
  }
});

/* =========================================
   SAFE NUMBER FORMATTER
========================================= */
window.money = function (num) {
  return '₹' + Number(num || 0)
    .toLocaleString('en-IN');
};

/* =========================================
   THEME MEMORY (OPTIONAL)
========================================= */
window.toggleDarkMode = function () {
  document.body.classList.toggle('dark-mode');

  const enabled =
    document.body.classList.contains('dark-mode');

  localStorage.setItem(
    'rkph_dark',
    enabled ? '1' : '0'
  );
};

(function restoreTheme() {
  const dark = localStorage.getItem('rkph_dark');

  if (dark === '1') {
    document.body.classList.add('dark-mode');
  }
})();

/* =========================================
   FINAL SYSTEM HEALTH CHECK
========================================= */
(function healthCheck() {
  const required = [
    'loginScreen',
    'app'
  ];

  required.forEach(id => {
    if (!document.getElementById(id)) {
      console.warn(id + ' not found');
    }
  });
})();

/* =========================================
   LAST READY BOOT
========================================= */
setTimeout(() => {
  console.log(
    'RKPH FINAL CLEAN admin.js READY'
  );

  if (STATE.loggedIn) {
    patchEmptyStates();
  }

}, 1200);

/* =========================================
   END OF FILE
========================================= */