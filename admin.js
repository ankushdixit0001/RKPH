/* =====================================================
   RKPH ERP ADMIN PANEL — PREMIUM FINAL admin.js
   PART 1 : Core + Login + Tabs + Toast + Dashboard
===================================================== */

/* ===============================
   SUPABASE CONFIG
=============================== */
const SUPABASE_URL = "https://xkmgugmhfmilgccwpqbi.supabase.co";
const SUPABASE_KEY = "sb_publishable_xGQ5xycskcU8MaabewpWYw_ZLqxbgZ7";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

/* ===============================
   GLOBAL STATE
=============================== */
const STATE = {
  loggedIn: false,
  students: [],
  results: [],
  fees: [],
  attendance: [],
  notices: [],
  assignments: []
};

/* ===============================
   HELPERS
=============================== */
function byId(id) {
  return document.getElementById(id);
}

function val(id) {
  const el = byId(id);
  return el ? el.value.trim() : "";
}

function setVal(id, value) {
  const el = byId(id);
  if (el) el.value = value || "";
}

function setText(id, txt) {
  const el = byId(id);
  if (el) el.textContent = txt;
}

/* ===============================
   TOAST
=============================== */
window.toast = function (msg, type = "success") {
  const box = byId("adminToast");
  if (!box) return;

  box.innerHTML = `
    <div style="
      background:${type === "error" ? "#ef4444" : "#14b8a6"};
      color:white;
      padding:12px 18px;
      border-radius:12px;
      min-width:220px;
      box-shadow:0 15px 35px rgba(0,0,0,.18);
      font-weight:600;
      animation:fadeIn .25s ease;
    ">
      ${msg}
    </div>
  `;

  setTimeout(() => {
    box.innerHTML = "";
  }, 2500);
};

/* ===============================
   LOGIN SYSTEM
=============================== */
const ADMIN_CREDENTIALS = {
  username: "admin",
  password: "rkph@admin2025"
};

window.doAdminLogin = function () {
  const user = val("loginUser");
  const pwd = val("loginPwd");

  if (
    user === ADMIN_CREDENTIALS.username &&
    pwd === ADMIN_CREDENTIALS.password
  ) {
    STATE.loggedIn = true;
    localStorage.setItem("rkph_admin_login", "1");

    byId("loginScreen").style.display = "none";
    byId("app").style.display = "flex";

    loadDashboard();
    toast("Login successful");

  } else {
    setText("loginErr", "Invalid username or password");
    toast("Login failed", "error");
  }
};

window.doLogout = function () {
  localStorage.removeItem("rkph_admin_login");
  location.reload();
};

/* ===============================
   SESSION RESTORE
=============================== */
(function restoreSession() {
  const ok = localStorage.getItem("rkph_admin_login");

  if (ok === "1") {
    STATE.loggedIn = true;

    window.addEventListener("load", () => {
      byId("loginScreen").style.display = "none";
      byId("app").style.display = "flex";
      loadDashboard();
    });
  }
})();

/* ===============================
   TAB SYSTEM
=============================== */
window.showTab = function (name, btn) {
  document.querySelectorAll(".tab").forEach(el => {
    el.classList.remove("active");
  });

  document.querySelectorAll(".nav-item").forEach(el => {
    el.classList.remove("active");
  });

  const tab = byId("tab-" + name);
  if (tab) tab.classList.add("active");

  if (btn) btn.classList.add("active");
};

/* ===============================
   MODAL SYSTEM
=============================== */
window.openModal = function (id) {
  const el = byId(id);
  if (el) el.classList.add("open");
};

window.closeModal = function (id) {
  const el = byId(id);
  if (el) el.classList.remove("open");
};

/* ===============================
   DASHBOARD LOAD
=============================== */
async function loadDashboard() {
  await Promise.all([
    fetchStudents(),
    fetchResults(),
    fetchFees()
  ]);

  fetchDashboardStats();
}

/* ===============================
   FETCH DATA
=============================== */
async function fetchStudents() {
  const { data } = await supabaseClient
    .from("students")
    .select("*")
    .order("roll");

  STATE.students = data || [];
}

async function fetchResults() {
  const { data } = await supabaseClient
    .from("results")
    .select("*");

  STATE.results = data || [];
}

async function fetchFees() {
  const { data } = await supabaseClient
    .from("fees")
    .select("*");

  STATE.fees = data || [];
}

/* ===============================
   DASHBOARD STATS
=============================== */
window.fetchDashboardStats = function () {
  setText("dash-students", STATE.students.length);
  setText("dash-results", STATE.results.length);
  setText("dash-notices", STATE.notices.length);
  setText("dash-assigns", STATE.assignments.length);

  renderDashboardLists();
};

function renderDashboardLists() {
  const nBox = byId("dash-notice-list");
  const aBox = byId("dash-assign-list");

  if (nBox) {
    nBox.innerHTML = STATE.notices.length
      ? STATE.notices.slice(0, 5).map(x =>
          `<div class="mini-pill">${x.title}</div>`
        ).join("")
      : `<div style="color:#94a3b8">No notices</div>`;
  }

  if (aBox) {
    aBox.innerHTML = STATE.assignments.length
      ? STATE.assignments.slice(0, 5).map(x =>
          `<div class="mini-pill">${x.title}</div>`
        ).join("")
      : `<div style="color:#94a3b8">No assignments</div>`;
  }
}

/* ===============================
   READY
=============================== */
window.addEventListener("load", () => {
  if (!STATE.loggedIn) {
    byId("app").style.display = "none";
  }
});

/* =====================================================
   RKPH ERP ADMIN PANEL — PREMIUM FINAL admin.js
   PART 2 : Student Management (Exact Final Version)
===================================================== */

/* ===============================
   STUDENT TABLE LOAD
=============================== */
window.loadStudents = async function () {
  await fetchStudents();
  renderStudentFilters();
  renderStudentTable();
  fetchDashboardStats();
};

/* ===============================
   FILTER DROPDOWNS
=============================== */
function renderStudentFilters() {
  const classSel = byId("stuFilterClass");
  const streamSel = byId("stuFilterStream");

  if (!classSel || !streamSel) return;

  const classes = [...new Set(
    STATE.students.map(x => x.class).filter(Boolean)
  )].sort();

  const streams = [...new Set(
    STATE.students.map(x => x.stream).filter(Boolean)
  )].sort();

  classSel.innerHTML =
    `<option value="">All Classes</option>` +
    classes.map(c => `<option>${c}</option>`).join("");

  streamSel.innerHTML =
    `<option value="">All Streams</option>` +
    streams.map(s => `<option>${s}</option>`).join("");
}

/* ===============================
   RENDER TABLE
=============================== */
window.renderStudentTable = function () {
  const tbody = byId("studentTbody");
  if (!tbody) return;

  const search = val("stuSearch").toLowerCase();
  const cls = val("stuFilterClass");
  const stream = val("stuFilterStream");

  let rows = [...STATE.students];

  if (search) {
    rows = rows.filter(st =>
      String(st.roll).toLowerCase().includes(search) ||
      String(st.name).toLowerCase().includes(search)
    );
  }

  if (cls) rows = rows.filter(st => st.class === cls);
  if (stream) rows = rows.filter(st => st.stream === stream);

  setText("stuCount", `${rows.length} Students`);

  if (!rows.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align:center;padding:24px">
          No students found
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = rows.map(st => `
    <tr>
      <td>${st.roll || "-"}</td>
      <td>${st.name || "-"}</td>
      <td>${st.class || "-"}</td>
      <td>${st.stream || "-"}</td>
      <td>${st.section || "-"}</td>
      <td>${st.session || "-"}</td>
      <td>${st.phone || "-"}</td>
      <td>${st.father_name || "-"}</td>
      <td style="white-space:nowrap">
        <button onclick="editStudent('${st.roll}')">Edit</button>
        <button onclick="deleteStudent('${st.roll}')">Delete</button>
      </td>
    </tr>
  `).join("");
};

/* ===============================
   OPEN MODAL
=============================== */
window.openStudentModal = function () {
  clearStudentForm();
  resetStudentBtn();

  setText("studentModalTitle", "Add Student");
  openModal("studentModal");
};

/* ===============================
   SAVE ROUTER
=============================== */
window.saveStudent = function () {
  const btn = byId("addStudentBtn");

  const mode = btn.dataset.mode || "add";

  if (mode === "edit") {
    updateStudent(btn.dataset.oldRoll);
  } else {
    addStudent();
  }
};

/* ===============================
   ADD STUDENT
=============================== */
async function addStudent() {
  try {
    const roll = val("s_roll");

    const duplicate = STATE.students.find(
      x => x.roll == roll
    );

    if (duplicate) {
      toast("Roll number already exists", "error");
      return;
    }

    const payload = {
      roll: roll,
      password: val("s_pass"),
      name: val("s_name"),
      class: val("s_class"),
      stream: val("s_stream"),
      section: val("s_section"),
      session: val("s_session"),
      phone: val("s_phone"),
      email: val("s_email"),
      father_name: val("s_father"),
      father_phone: val("s_fphone"),
      address: val("s_addr")
    };

    if (!payload.roll || !payload.name) {
      toast("Roll & Name required", "error");
      return;
    }

    const { error } = await supabaseClient
      .from("students")
      .insert([payload]);

    if (error) throw error;

    toast("Student Added");
    closeModal("studentModal");

    await loadStudents();
    clearStudentForm();

  } catch (err) {
    console.error(err);
    toast(err.message || "Add failed", "error");
  }
}

/* ===============================
   EDIT STUDENT
=============================== */
window.editStudent = function (roll) {
  const st = STATE.students.find(x => x.roll == roll);
  if (!st) return;

  setVal("s_roll", st.roll);
  setVal("s_pass", st.password);
  setVal("s_name", st.name);
  setVal("s_class", st.class);
  setVal("s_stream", st.stream);
  setVal("s_section", st.section);
  setVal("s_session", st.session);
  setVal("s_phone", st.phone);
  setVal("s_email", st.email);
  setVal("s_father", st.father_name);
  setVal("s_fphone", st.father_phone);
  setVal("s_addr", st.address);

  const btn = byId("addStudentBtn");
  btn.dataset.mode = "edit";
  btn.dataset.oldRoll = roll;

  btn.innerHTML = "Update Student";

  openModal("studentModal");
};

/* ===============================
   UPDATE STUDENT
=============================== */
async function updateStudent(oldRoll) {
  try {
    const newRoll = val("s_roll");

    const duplicate = STATE.students.find(
      x => x.roll == newRoll &&
      x.roll != oldRoll
    );

    if (duplicate) {
      toast("Roll number already exists", "error");
      return;
    }

    const payload = {
      roll: newRoll,
      password: val("s_pass"),
      name: val("s_name"),
      class: val("s_class"),
      stream: val("s_stream"),
      section: val("s_section"),
      session: val("s_session"),
      phone: val("s_phone"),
      email: val("s_email"),
      father_name: val("s_father"),
      father_phone: val("s_fphone"),
      address: val("s_addr")
    };

    const { error } = await supabaseClient
      .from("students")
      .update(payload)
      .eq("roll", oldRoll);

    if (error) throw error;

    toast("Student Updated");

    closeModal("studentModal");
    clearStudentForm();
    resetStudentBtn();

    await loadStudents();

  } catch (err) {
    console.error(err);
    toast(err.message || "Update failed", "error");
  }
}

/* ===============================
   DELETE STUDENT
=============================== */
window.deleteStudent = async function (roll) {
  if (!confirm(`Delete ${roll}?`)) return;

  const { error } = await supabaseClient
    .from("students")
    .delete()
    .eq("roll", roll);

  if (error) {
    toast("Delete failed", "error");
    return;
  }

  toast("Student Deleted");
  await loadStudents();
};

/* ===============================
   RESET BUTTON
=============================== */
function resetStudentBtn() {
  const btn = byId("addStudentBtn");

  btn.dataset.mode = "add";
  btn.dataset.oldRoll = "";
  btn.innerHTML = "Save Student";
}

/* ===============================
   CLEAR FORM
=============================== */
function clearStudentForm() {
  [
    "s_roll","s_pass","s_name","s_stream",
    "s_section","s_session","s_phone",
    "s_email","s_father","s_fphone",
    "s_addr"
  ].forEach(id => setVal(id, ""));

  setVal("s_class", "Class 9");
}

/* ===============================
   AUTO LOAD
=============================== */
window.addEventListener("load", () => {
  if (STATE.loggedIn) loadStudents();
});
/* =====================================================
   RKPH ERP ADMIN PANEL — PREMIUM FINAL admin.js
   PART 3 : Marks / Results Module (Exact HTML IDs)
===================================================== */

/* ===============================
   LOAD RESULTS
=============================== */
window.loadResults = async function () {
  await fetchResults();
  renderMarksFilters();
  renderMarksTable();
  fetchDashboardStats();
};

/* ===============================
   FILTERS
=============================== */
function renderMarksFilters() {
  const clsSel = byId("marksFilterClass");
  if (!clsSel) return;

  const classes = [...new Set(
    STATE.students.map(x => x.class).filter(Boolean)
  )].sort();

  clsSel.innerHTML =
    `<option value="">All Classes</option>` +
    classes.map(c => `<option>${c}</option>`).join("");

  renderRollDropdown();
}

/* ===============================
   STUDENT ROLL DROPDOWN
=============================== */
function renderRollDropdown() {
  const rollSel = byId("m_roll");
  if (!rollSel) return;

  rollSel.innerHTML =
    `<option value="">Select Roll</option>` +
    STATE.students.map(st =>
      `<option value="${st.roll}">
        ${st.roll} — ${st.name}
      </option>`
    ).join("");
}

/* ===============================
   AUTO FILL CLASS / STREAM
=============================== */
window.autoFillClass = function () {
  const roll = val("m_roll");

  const st = STATE.students.find(
    x => x.roll == roll
  );

  if (!st) return;

  setVal("m_cls", st.class || "");
  setVal("m_stream", st.stream || "");
};

/* ===============================
   SUBJECT ROW
=============================== */
window.addSubjectRow = function () {
  const wrap = byId("marksSubjRows");
  if (!wrap) return;

  const row = document.createElement("div");

  row.style.display = "grid";
  row.style.gridTemplateColumns =
    "1fr 80px 80px 70px 80px";
  row.style.gap = "6px";
  row.style.marginBottom = "8px";

  row.innerHTML = `
    <input class="f-input sbj-name" placeholder="Subject">
    <input class="f-input sbj-max" type="number" value="100">
    <input class="f-input sbj-obt" type="number" value="0">
    <input class="f-input sbj-grade" placeholder="A">
    <button onclick="this.parentElement.remove()">
      Remove
    </button>
  `;

  wrap.appendChild(row);
};

/* ===============================
   OPEN MODAL
=============================== */
window.openMarksModal = function () {
  clearMarksForm();
  setText("marksModalTitle", "Add Result");

  if (!byId("marksSubjRows").children.length) {
    addSubjectRow();
  }

  openModal("marksModal");
};

/* ===============================
   SAVE MARKS
=============================== */
window.saveMarks = async function () {
  try {
    const roll = val("m_roll");
    const exam = val("m_exam");

    if (!roll || !exam) {
      toast("Roll and Exam required", "error");
      return;
    }

    const subjectRows = [
      ...document.querySelectorAll(
        "#marksSubjRows > div"
      )
    ];

    let subjects = [];
    let totalMax = 0;
    let totalObt = 0;

    subjectRows.forEach(row => {
      const inputs = row.querySelectorAll("input");

      const name = inputs[0].value.trim();
      const max = Number(inputs[1].value || 0);
      const obt = Number(inputs[2].value || 0);
      const grade = inputs[3].value.trim();

      if (name) {
        subjects.push({
          subject: name,
          max_marks: max,
          obtained: obt,
          grade: grade
        });

        totalMax += max;
        totalObt += obt;
      }
    });

    const percent =
      totalMax > 0
        ? ((totalObt / totalMax) * 100).toFixed(2)
        : 0;

    const payload = {
      roll: roll,
      class: val("m_cls"),
      stream: val("m_stream"),
      exam: exam,
      session: "2025-26",
      total: totalObt,
      max_total: totalMax,
      percentage: percent,
      grade: autoGrade(percent),
      rank: val("m_rank"),
      remarks: val("m_remarks"),
      subjects: JSON.stringify(subjects)
    };

    const { error } = await supabaseClient
      .from("results")
      .insert([payload]);

    if (error) throw error;

    toast("Result Saved");

    closeModal("marksModal");
    clearMarksForm();

    await loadResults();

  } catch (err) {
    console.error(err);
    toast(err.message || "Save failed", "error");
  }
};

/* ===============================
   TABLE
=============================== */
window.renderMarksTable = function () {
  const tbody = byId("marksTbody");
  if (!tbody) return;

  const cls = val("marksFilterClass");
  const sess = val("marksFilterSession");

  let rows = [...STATE.results];

  if (cls) rows = rows.filter(x => x.class == cls);
  if (sess) rows = rows.filter(x => x.session == sess);

  if (!rows.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="padding:24px;text-align:center">
          No results found
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>${r.roll}</td>
      <td>${r.class || "-"}</td>
      <td>${r.session || "-"}</td>
      <td>${r.exam || "-"}</td>
      <td>${r.total || 0}</td>
      <td>${r.percentage || 0}%</td>
      <td>${r.grade || "-"}</td>
      <td>
        <button onclick="deleteResult('${r.id}')">
          Delete
        </button>
      </td>
    </tr>
  `).join("");
};

/* ===============================
   DELETE
=============================== */
window.deleteResult = async function (id) {
  if (!confirm("Delete result?")) return;

  const { error } = await supabaseClient
    .from("results")
    .delete()
    .eq("id", id);

  if (error) {
    toast("Delete failed", "error");
    return;
  }

  toast("Deleted");
  await loadResults();
};

/* ===============================
   HELPERS
=============================== */
function autoGrade(p) {
  p = Number(p);

  if (p >= 90) return "A+";
  if (p >= 80) return "A";
  if (p >= 70) return "B+";
  if (p >= 60) return "B";
  if (p >= 50) return "C";
  if (p >= 33) return "D";
  return "F";
}

function clearMarksForm() {
  [
    "m_roll","m_cls","m_stream",
    "m_exam","m_rank"
  ].forEach(id => setVal(id, ""));

  byId("marksSubjRows").innerHTML = "";
}

/* ===============================
   AUTO LOAD
=============================== */
window.addEventListener("load", () => {
  if (STATE.loggedIn) loadResults();
});

/* =====================================================
   RKPH ERP ADMIN PANEL — PREMIUM FINAL admin.js
   PART 4 : Fees Module (Exact HTML IDs)
===================================================== */

/* ===============================
   LOAD FEES
=============================== */
window.loadFees = async function () {
  await fetchFees();
  renderFeeFilters();
  renderFeeTable();
};

/* ===============================
   FILTER DROPDOWNS
=============================== */
function renderFeeFilters() {
  const clsSel = byId("feeClassFilter");
  const stuSel = byId("feeStudentPicker");

  if (!clsSel || !stuSel) return;

  const classes = [...new Set(
    STATE.students.map(x => x.class).filter(Boolean)
  )].sort();

  clsSel.innerHTML =
    `<option value="">All Classes</option>` +
    classes.map(c => `<option>${c}</option>`).join("");

  fillFeeStudentDropdown();
}

/* ===============================
   CLASS FILTER
=============================== */
window.filterFeeByClass = function () {
  fillFeeStudentDropdown();
  renderFeeTable();
};

function fillFeeStudentDropdown() {
  const cls = val("feeClassFilter");
  const stuSel = byId("feeStudentPicker");

  if (!stuSel) return;

  let rows = [...STATE.students];

  if (cls) {
    rows = rows.filter(x => x.class == cls);
  }

  stuSel.innerHTML =
    `<option value="">— Select Student —</option>` +
    rows.map(st => `
      <option value="${st.roll}">
        ${st.roll} — ${st.name}
      </option>
    `).join("");

  byId("addFeeBtn").disabled = true;
}

/* ===============================
   OPEN MODAL
=============================== */
window.openFeeModal = function () {
  const roll = val("feeStudentPicker");

  if (!roll) {
    toast("Select student first", "error");
    return;
  }

  const st = STATE.students.find(
    x => x.roll == roll
  );

  setText(
    "feeModalStudentName",
    `${st.roll} — ${st.name}`
  );

  clearFeeForm();
  openModal("feeModal");
};

/* ===============================
   STUDENT PICKER CHANGE
=============================== */
window.renderFeeTable = function () {
  const tbody = byId("feeTbody");
  const roll = val("feeStudentPicker");

  byId("addFeeBtn").disabled = !roll;

  if (!roll) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="padding:24px;text-align:center">
          Select a student
        </td>
      </tr>
    `;

    byId("feeSummaryStrip").style.display = "none";
    return;
  }

  let rows = STATE.fees.filter(
    x => x.roll == roll
  );

  if (!rows.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="padding:24px;text-align:center">
          No fee records found
        </td>
      </tr>
    `;

    showFeeSummary([]);
    return;
  }

  tbody.innerHTML = rows.map(f => `
    <tr>
      <td>${f.quarter || "-"}</td>
      <td>${f.fee_type || "-"}</td>
      <td>₹${Number(f.amount || 0).toLocaleString("en-IN")}</td>
      <td>${f.due_date || "-"}</td>
      <td>${f.paid_on || "-"}</td>
      <td>${badgeStatus(f.status)}</td>
      <td>
        <button onclick="deleteFee('${f.id}')">
          Delete
        </button>
      </td>
    </tr>
  `).join("");

  showFeeSummary(rows);
};

/* ===============================
   SUMMARY
=============================== */
function showFeeSummary(rows) {
  byId("feeSummaryStrip").style.display = "grid";

  let paid = 0;
  let pending = 0;
  let upcoming = 0;

  rows.forEach(r => {
    const amt = Number(r.amount || 0);

    if (r.status == "paid") paid += amt;
    else if (r.status == "pending") pending += amt;
    else upcoming += amt;
  });

  setText("fss-paid", "₹" + paid.toLocaleString("en-IN"));
  setText("fss-pending", "₹" + pending.toLocaleString("en-IN"));
  setText("fss-upcoming", "₹" + upcoming.toLocaleString("en-IN"));
  setText("fss-count", rows.length);
}

/* ===============================
   SAVE FEE
=============================== */
window.saveFee = async function () {
  try {
    const roll = val("feeStudentPicker");

    if (!roll) {
      toast("Select student first", "error");
      return;
    }

    const payload = {
      roll: roll,
      quarter: val("fe_q"),
      fee_type: val("fe_type"),
      amount: val("fe_amt"),
      due_date: val("fe_due"),
      paid_on: val("fe_paid"),
      status: val("fe_status")
    };

    const { error } = await supabaseClient
      .from("fees")
      .insert([payload]);

    if (error) throw error;

    toast("Fee Entry Saved");

    closeModal("feeModal");
    clearFeeForm();

    await loadFees();

  } catch (err) {
    console.error(err);
    toast(err.message || "Save failed", "error");
  }
};

/* ===============================
   DELETE
=============================== */
window.deleteFee = async function (id) {
  if (!confirm("Delete fee entry?")) return;

  const { error } = await supabaseClient
    .from("fees")
    .delete()
    .eq("id", id);

  if (error) {
    toast("Delete failed", "error");
    return;
  }

  toast("Deleted");
  await loadFees();
};

/* ===============================
   HELPERS
=============================== */
function clearFeeForm() {
  [
    "fe_q","fe_type","fe_amt",
    "fe_due","fe_paid"
  ].forEach(id => setVal(id, ""));

  setVal("fe_status", "paid");
}

function badgeStatus(s) {
  if (s == "paid") {
    return `<span style="color:#14b8a6;font-weight:700">Paid</span>`;
  }

  if (s == "pending") {
    return `<span style="color:#ef4444;font-weight:700">Pending</span>`;
  }

  return `<span style="color:#f59e0b;font-weight:700">Upcoming</span>`;
}

/* ===============================
   AUTO LOAD
=============================== */
window.addEventListener("load", () => {
  if (STATE.loggedIn) loadFees();
});
/* =====================================================
   RKPH ERP ADMIN PANEL — PREMIUM FINAL admin.js
   PART 5 : Notices + Assignments + Attendance + Final
===================================================== */

/* ===============================
   NOTICES
=============================== */
window.openNoticeModal = function () {
  clearNoticeForm();
  openModal("noticeModal");
};

window.saveNotice = function () {
  const title = val("n_title");
  if (!title) {
    toast("Notice title required", "error");
    return;
  }

  const payload = {
    id: Date.now(),
    title: title,
    date: val("n_date"),
    tag: val("n_tag"),
    type: val("n_type"),
    class: val("n_class"),
    student: val("n_student"),
    urgent: byId("n_urgent").checked
  };

  STATE.notices.unshift(payload);

  toast("Notice Saved");
  closeModal("noticeModal");

  renderNoticeLists();
  fetchDashboardStats();
};

function renderNoticeLists() {
  const box = byId("noticeGlobalList");
  if (!box) return;

  const rows = STATE.notices.filter(
    x => x.type === "global"
  );

  if (!rows.length) {
    box.innerHTML =
      `<div style="color:#94a3b8">No notices</div>`;
    return;
  }

  box.innerHTML = rows.map(n => `
    <div class="mini-pill">
      ${n.title}
    </div>
  `).join("");
}

window.switchNoticeTab = function (type, btn) {
  [
    "global",
    "class",
    "private"
  ].forEach(x => {
    byId("ntab-" + x + "-content").style.display =
      x === type ? "block" : "none";
  });

  document.querySelectorAll(
    "#tab-notices .btn"
  ).forEach(x => {
    x.classList.remove("btn-teal");
    x.classList.add("btn-ghost");
  });

  btn.classList.remove("btn-ghost");
  btn.classList.add("btn-teal");
};

function clearNoticeForm() {
  [
    "n_title","n_date"
  ].forEach(id => setVal(id, ""));

  setVal("n_tag", "General");
  setVal("n_type", "global");
}

/* ===============================
   ASSIGNMENTS
=============================== */
window.openAssignModal = function () {
  clearAssignForm();
  openModal("assignModal");
};

window.saveAssign = function () {
  const title = val("a_title");

  if (!title) {
    toast("Title required", "error");
    return;
  }

  STATE.assignments.unshift({
    id: Date.now(),
    subject: val("a_sub"),
    title: title,
    due: val("a_due"),
    status: byId("a_done").checked
      ? "Done"
      : "Pending"
  });

  toast("Assignment Saved");
  closeModal("assignModal");

  renderAssignTable();
  fetchDashboardStats();
};

window.filterAssignByClass = function () {
  renderAssignStudentPicker();
};

function renderAssignStudentPicker() {
  const cls = val("assignClassFilter");
  const sel = byId("assignStudentPicker");

  let rows = [...STATE.students];

  if (cls) rows = rows.filter(x => x.class == cls);

  sel.innerHTML =
    `<option value="">— Select Student —</option>` +
    rows.map(st => `
      <option value="${st.roll}">
        ${st.roll} — ${st.name}
      </option>
    `).join("");

  byId("addAssignBtn").disabled = false;
}

window.renderAssignTable = function () {
  const tbody = byId("assignTbody");
  if (!tbody) return;

  if (!STATE.assignments.length) {
    tbody.innerHTML = `
      <tr><td colspan="6"
      style="padding:24px;text-align:center">
      No assignments
      </td></tr>
    `;
    return;
  }

  tbody.innerHTML = STATE.assignments.map(a => `
    <tr>
      <td>${a.subject}</td>
      <td>${a.title}</td>
      <td>${a.due}</td>
      <td>2025-26</td>
      <td>${a.status}</td>
      <td>-</td>
    </tr>
  `).join("");
};

function clearAssignForm() {
  [
    "a_title","a_due"
  ].forEach(id => setVal(id, ""));

  setVal("a_sub", "Physics");
  byId("a_done").checked = false;
}

/* ===============================
   ATTENDANCE
=============================== */
window.filterAttByClass = function () {
  const cls = val("attClassFilter");
  const sel = byId("attStudentPicker");

  let rows = [...STATE.students];

  if (cls) rows = rows.filter(x => x.class == cls);

  sel.innerHTML =
    `<option value="">— Select Student —</option>` +
    rows.map(st => `
      <option value="${st.roll}">
        ${st.roll} — ${st.name}
      </option>
    `).join("");
};

window.renderAttendance = function () {
  const wrap = byId("attEditorWrap");
  const roll = val("attStudentPicker");

  if (!roll) {
    wrap.innerHTML = `
      <div style="padding:30px;text-align:center">
        Select student first
      </div>
    `;
    return;
  }

  wrap.innerHTML = `
    <div class="card">
      <div class="card-body">
        <h3 style="margin-bottom:12px">
          Attendance Editor
        </h3>
        <p style="color:#94a3b8">
          Monthly calendar system can be added next.
        </p>
      </div>
    </div>
  `;
};

/* ===============================
   FINAL INIT
=============================== */
window.addEventListener("load", () => {
  if (!STATE.loggedIn) return;

  renderNoticeLists();
  renderAssignTable();

  // Fill common class filters
  const classIds = [
    "assignClassFilter",
    "attClassFilter"
  ];

  const classes = [...new Set(
    STATE.students.map(x => x.class).filter(Boolean)
  )].sort();

  classIds.forEach(id => {
    const el = byId(id);
    if (!el) return;

    el.innerHTML =
      `<option value="">All Classes</option>` +
      classes.map(c =>
        `<option>${c}</option>`
      ).join("");
  });
});

/* =====================================================
   DB SYNC JS PATCH
   Connect Notices + Assignments + Attendance to Supabase
   Paste inside your current admin.js
===================================================== */

/* ===============================
   FETCH MODULE DATA
=============================== */
async function fetchNotices() {
  const { data, error } = await supabaseClient
    .from("notice")
    .select("*")
    .order("created_at", { ascending: false });

  if (!error) STATE.notices = data || [];
}

async function fetchAssignments() {
  const { data, error } = await supabaseClient
    .from("assignment")
    .select("*")
    .order("created_at", { ascending: false });

  if (!error) STATE.assignments = data || [];
}

async function fetchAttendance() {
  const { data, error } = await supabaseClient
    .from("attendance")
    .select("*")
    .order("att_date", { ascending: false });

  if (!error) STATE.attendance = data || [];
}

/* ===============================
   LOAD ALL ON LOGIN
=============================== */
async function loadExtraModules() {
  await Promise.all([
    fetchNotices(),
    fetchAssignments(),
    fetchAttendance()
  ]);

  renderNoticeLists();
  renderAssignTable();
  fetchDashboardStats();
}

/* call this after successful login */
const oldLogin = window.doAdminLogin;
window.doAdminLogin = async function () {
  await oldLogin();

  if (STATE.loggedIn) {
    await loadExtraModules();
  }
};

/* ===============================
   SAVE NOTICE TO DB
=============================== */
window.saveNotice = async function () {
  try {
    const payload = {
      title: val("n_title"),
      notice_date: val("n_date"),
      tag: val("n_tag"),
      type: val("n_type"),
      target_class: val("n_class"),
      target_roll: val("n_student"),
      urgent: byId("n_urgent").checked
    };

    const { error } = await supabaseClient
      .from("notice")
      .insert([payload]);

    if (error) throw error;

    toast("Notice Saved");
    closeModal("noticeModal");

    await fetchNotices();
    renderNoticeLists();
    fetchDashboardStats();

  } catch (err) {
    toast(err.message || "Save failed", "error");
  }
};

/* ===============================
   SAVE ASSIGNMENT TO DB
=============================== */
window.saveAssign = async function () {
  try {
    const payload = {
      roll: val("assignStudentPicker"),
      class: val("assignClassFilter"),
      subject: val("a_sub"),
      title: val("a_title"),
      due_date: val("a_due"),
      session: "2025-26",
      status: byId("a_done").checked
        ? "Submitted"
        : "Pending"
    };

    const { error } = await supabaseClient
      .from("assignment")
      .insert([payload]);

    if (error) throw error;

    toast("Assignment Saved");
    closeModal("assignModal");

    await fetchAssignments();
    renderAssignTable();
    fetchDashboardStats();

  } catch (err) {
    toast(err.message || "Save failed", "error");
  }
};

/* ===============================
   RENDER ASSIGNMENTS
=============================== */
window.renderAssignTable = function () {
  const tbody = byId("assignTbody");
  if (!tbody) return;

  const rows = STATE.assignments;

  if (!rows.length) {
    tbody.innerHTML = `
      <tr><td colspan="6"
      style="padding:24px;text-align:center">
      No assignments
      </td></tr>
    `;
    return;
  }

  tbody.innerHTML = rows.map(a => `
    <tr>
      <td>${a.subject || "-"}</td>
      <td>${a.title || "-"}</td>
      <td>${a.due_date || "-"}</td>
      <td>${a.session || "-"}</td>
      <td>${a.status || "-"}</td>
      <td>${a.roll || a.class || "-"}</td>
    </tr>
  `).join("");
};

/* ===============================
   MARK ATTENDANCE TO DB
=============================== */
window.markAttendance = async function () {
  try {
    const roll = val("attStudentPicker");
    const attDate = val("attDate");

    if (!roll || !attDate) {
      toast("Select student & date", "error");
      return;
    }

    const payload = {
      roll: roll,
      att_date: attDate,
      status: val("attStatus"),
      remarks: val("attRemarks")
    };

    const { error } = await supabaseClient
      .from("attendance")
      .insert([payload]);

    if (error) throw error;

    toast("Attendance Saved");

    await fetchAttendance();

  } catch (err) {
    toast(err.message || "Save failed", "error");
  }
};

/* ===============================
   RENDER NOTICES
=============================== */
function renderNoticeLists() {
  const box = byId("noticeGlobalList");
  if (!box) return;

  if (!STATE.notices.length) {
    box.innerHTML =
      `<div style="color:#94a3b8">No notices</div>`;
    return;
  }

  box.innerHTML = STATE.notices.map(n => `
    <div class="mini-pill">
      ${n.title}
    </div>
  `).join("");
}

/* ========= FINAL LOAD FIX ========= */

async function loadAllDbModules() {
  try {
    await Promise.all([
      fetchNotices(),
      fetchAssignments(),
      fetchAttendance()
    ]);

    renderNoticeLists();
    renderAssignTable();
    fetchDashboardStats();

  } catch (e) {
    console.error(e);
  }
}

/* run after page load */
window.addEventListener("load", async () => {
  if (localStorage.getItem("rkph_admin_login") === "1") {
    await loadAllDbModules();
  }
});

/* improve tab switching */
const oldShowTab = window.showTab;

window.showTab = async function(name, btn) {
  oldShowTab(name, btn);

  if (name === "notices") {
    await fetchNotices();
    renderNoticeLists();
  }

  if (name === "assignments") {
    await fetchAssignments();
    renderAssignTable();
  }

  if (name === "attendance") {
    await fetchAttendance();
  }

  fetchDashboardStats();
};
/* ===============================
   END OF FILE
=============================== */