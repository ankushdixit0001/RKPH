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
PART 5 CLEAN FINAL
===================================================== */

/* ---------- FETCH ---------- */
async function fetchNotices(){
 const {data}=await supabaseClient.from("notice").select("*").order("created_at",{ascending:false});
 STATE.notices=data||[];
}

async function fetchAssignments(){
 const {data}=await supabaseClient.from("assignment").select("*").order("created_at",{ascending:false});
 STATE.assignments=data||[];
}

async function fetchAttendance(){
 const {data}=await supabaseClient.from("attendance").select("*").order("att_date",{ascending:false});
 STATE.attendance=data||[];
}

/* ---------- NOTICE ---------- */
window.openNoticeModal=function(){
 openModal("noticeModal");
};

window.saveNotice=async function(){
 await supabaseClient.from("notice").insert([{
   title:val("n_title"),
   notice_date:val("n_date"),
   tag:val("n_tag"),
   type:val("n_type"),
   target_class:val("n_class"),
   target_roll:val("n_student"),
   urgent:byId("n_urgent").checked
 }]);

 closeModal("noticeModal");
 await fetchNotices();
 renderNoticeLists();
 fetchDashboardStats();
 toast("Notice Saved");
};

window.renderNoticeLists=function(){
 const box=byId("noticeGlobalList");
 if(!box)return;

 const rows=STATE.notices.filter(x=>x.type==="global");

 box.innerHTML=rows.length
 ? rows.map(x=>`<div class="mini-pill">${x.title}</div>`).join("")
 : "No notices";
};

/* ---------- ASSIGNMENT ---------- */
window.openAssignModal=function(){
 openModal("assignModal");
};

window.filterAssignByClass=function(){
 const cls=val("assignClassFilter");
 const sel=byId("assignStudentPicker");

 let rows=[...STATE.students];
 if(cls) rows=rows.filter(x=>x.class===cls);

 sel.innerHTML=`<option value="">Select Student</option>`+
 rows.map(x=>`<option value="${x.roll}">${x.roll} - ${x.name}</option>`).join("");

 byId("addAssignBtn").disabled=false;
};

window.saveAssign=async function(){
 await supabaseClient.from("assignment").insert([{
   roll:val("assignStudentPicker"),
   class:val("assignClassFilter"),
   subject:val("a_sub"),
   title:val("a_title"),
   due_date:val("a_due"),
   session:"2025-26",
   status:byId("a_done").checked?"Submitted":"Pending"
 }]);

 closeModal("assignModal");
 await fetchAssignments();
 renderAssignTable();
 fetchDashboardStats();
 toast("Assignment Saved");
};

window.renderAssignTable=function(){
 const tbody=byId("assignTbody");
 if(!tbody)return;

 tbody.innerHTML=STATE.assignments.length
 ? STATE.assignments.map(x=>`
 <tr>
   <td>${x.subject||"-"}</td>
   <td>${x.title||"-"}</td>
   <td>${x.due_date||"-"}</td>
   <td>${x.session||"-"}</td>
   <td>${x.status||"-"}</td>
   <td>${x.roll||x.class||"-"}</td>
 </tr>`).join("")
 : `<tr><td colspan="6">No assignments</td></tr>`;
};

/* ---------- ATTENDANCE ---------- */
window.filterAttByClass=function(){
 const cls=val("attClassFilter");
 const sel=byId("attStudentPicker");

 let rows=[...STATE.students];
 if(cls) rows=rows.filter(x=>x.class===cls);

 sel.innerHTML=`<option value="">Select Student</option>`+
 rows.map(x=>`<option value="${x.roll}">${x.roll} - ${x.name}</option>`).join("");
};

window.renderAttendance=function(){
 const wrap=byId("attEditorWrap");
 const roll=val("attStudentPicker");

 if(!roll){
   wrap.innerHTML="Select student first";
   return;
 }

 wrap.innerHTML=`
 <div class="card"><div class="card-body">
 <input type="date" id="attDate" class="f-input"><br><br>
 <select id="attStatus" class="f-input">
 <option>Present</option>
 <option>Absent</option>
 <option>Leave</option>
 </select><br><br>
 <input id="attRemarks" class="f-input" placeholder="Remarks"><br><br>
 <button class="btn btn-teal" onclick="markAttendance()">Save Attendance</button>
 </div></div>`;
};

window.markAttendance=async function(){
 await supabaseClient.from("attendance").insert([{
   roll:val("attStudentPicker"),
   att_date:val("attDate"),
   status:val("attStatus"),
   remarks:val("attRemarks")
 }]);

 toast("Attendance Saved");
};

/* ---------- TAB FIX ---------- */
const oldShowTab=window.showTab;

window.showTab=async function(name,btn){
 oldShowTab(name,btn);

 if(name==="notices"){
   await fetchNotices();
   renderNoticeLists();
 }

 if(name==="assignments"){
   await fetchAssignments();
   renderAssignTable();
 }

 if(name==="attendance"){
   await fetchAttendance();
 }

 fetchDashboardStats();
};

/* ---------- LOAD ---------- */
window.addEventListener("load",async()=>{
 if(!STATE.loggedIn)return;

 await fetchNotices();
 await fetchAssignments();
 await fetchAttendance();

 renderNoticeLists();
 renderAssignTable();
 fetchDashboardStats();
});



/* ==========================================
   FEES FINAL MODULE
========================================== */

/* ---------- LOAD FEES ---------- */
window.loadFees = async function () {
  await fetchFees();
  renderFeeFilters();
  renderFeeTable();
};

/* ---------- FILTERS ---------- */
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

  fillFeeStudents();
}

window.filterFeeByClass = function () {
  fillFeeStudents();
  renderFeeTable();
};

function fillFeeStudents() {
  const cls = val("feeClassFilter");
  const sel = byId("feeStudentPicker");

  let rows = [...STATE.students];

  if (cls) rows = rows.filter(x => x.class === cls);

  sel.innerHTML =
    `<option value="">— Select Student —</option>` +
    rows.map(s =>
      `<option value="${s.roll}">
       ${s.roll} - ${s.name}
      </option>`
    ).join("");

  byId("addFeeBtn").disabled = false;
}

/* ---------- OPEN MODAL ---------- */
window.openFeeModal = function () {

  const roll = val("feeStudentPicker");

  if (!roll) {
    toast("Select student first", "error");
    return;
  }

  const html = `
  <div class="modal open" id="feeTempModal">
    <div class="modal-box">
      <div class="card-header">
        <h3>Add Fee Entry</h3>
        <button onclick="closeModal('feeTempModal')">✕</button>
      </div>
      <div class="card-body" style="display:grid;gap:10px">

        <input id="f_quarter" class="f-input"
          placeholder="Quarter (Q1/Q2/Q3/Q4)">

        <input id="f_type" class="f-input"
          placeholder="Fee Type">

        <input id="f_amount" type="number"
          class="f-input"
          placeholder="Amount">

        <input id="f_due" type="date"
          class="f-input">

        <select id="f_status" class="f-input">
          <option>paid</option>
          <option>pending</option>
          <option>upcoming</option>
        </select>

        <button class="btn btn-amber"
          onclick="saveFee()">
          Save Fee
        </button>

      </div>
    </div>
  </div>`;

  document.body.insertAdjacentHTML("beforeend", html);
};

/* ---------- SAVE ---------- */
window.saveFee = async function () {

  const payload = {
    roll: val("feeStudentPicker"),
    quarter: val("f_quarter"),
    fee_type: val("f_type"),
    amount: Number(val("f_amount")),
    due_date: val("f_due"),
    paid_on:
      val("f_status") === "paid"
      ? new Date().toISOString().slice(0,10)
      : null,
    status: val("f_status")
  };

  const { error } = await supabaseClient
    .from("fees")
    .insert([payload]);

  if (error) {
    toast(error.message, "error");
    return;
  }

  closeModal("feeTempModal");
  toast("Fee Saved");

  await fetchFees();
  renderFeeTable();
};

/* ---------- DELETE ---------- */
window.deleteFee = async function (
  roll, quarter, type, due
) {

  if (!confirm("Delete fee row?")) return;

  await supabaseClient
    .from("fees")
    .delete()
    .match({
      roll: roll,
      quarter: quarter,
      fee_type: type,
      due_date: due
    });

  await fetchFees();
  renderFeeTable();

  toast("Deleted");
};

/* ---------- TABLE ---------- */
window.renderFeeTable = function () {

  const tbody = byId("feeTbody");
  if (!tbody) return;

  const roll = val("feeStudentPicker");

  let rows = [...STATE.fees];

  if (roll) rows = rows.filter(x => x.roll === roll);

  updateFeeSummary(rows);

  if (!rows.length) {
    tbody.innerHTML =
      `<tr><td colspan="7">
      No fee records
      </td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(f => `
    <tr>
      <td>${f.quarter || "-"}</td>
      <td>${f.fee_type || "-"}</td>
      <td>₹${f.amount || 0}</td>
      <td>${f.due_date || "-"}</td>
      <td>${f.paid_on || "-"}</td>
      <td>${f.status || "-"}</td>
      <td>
        <button onclick="
          deleteFee(
          '${f.roll}',
          '${f.quarter}',
          '${f.fee_type}',
          '${f.due_date}'
          )">Delete</button>
      </td>
    </tr>
  `).join("");
};

/* ---------- SUMMARY ---------- */
function updateFeeSummary(rows) {

  const strip = byId("feeSummaryStrip");
  if (!strip) return;

  strip.style.display = "grid";

  let paid = 0;
  let pending = 0;
  let upcoming = 0;

  rows.forEach(x => {
    const amt = Number(x.amount || 0);

    if (x.status === "paid") paid += amt;
    else if (x.status === "pending") pending += amt;
    else upcoming += amt;
  });

  setText("fss-paid", "₹" + paid);
  setText("fss-pending", "₹" + pending);
  setText("fss-upcoming", "₹" + upcoming);
  setText("fss-count", rows.length);
}

/* ---------- TAB AUTO LOAD ---------- */
const oldShowTabFees = window.showTab;

window.showTab = async function(name, btn) {

  oldShowTabFees(name, btn);

  if (name === "fees") {
    await loadFees();
  }
};

/* ==========================================
   RESULTS FINAL MODULE
========================================== */

/* ---------- LOAD ---------- */
window.loadResults = async function () {
  await fetchResults();
  renderMarksFilters();
  renderMarksTable();
};

/* ---------- FILTERS ---------- */
function renderMarksFilters() {
  const cls = byId("marksFilterClass");
  if (!cls) return;

  const classes = [...new Set(
    STATE.students.map(x => x.class).filter(Boolean)
  )].sort();

  cls.innerHTML =
    `<option value="">All Classes</option>` +
    classes.map(c => `<option>${c}</option>`).join("");

  fillResultStudents();
}

function fillResultStudents() {
  const sel = byId("m_roll");
  if (!sel) return;

  sel.innerHTML =
    `<option value="">Select Roll</option>` +
    STATE.students.map(s =>
      `<option value="${s.roll}">
      ${s.roll} - ${s.name}
      </option>`
    ).join("");
}

/* ---------- OPEN ---------- */
window.openMarksModal = function () {

  const wrap = byId("marksSubjRows");
  wrap.innerHTML = "";

  addSubjectRow();

  openModal("marksModal");
};

/* ---------- SUBJECT ROW ---------- */
window.addSubjectRow = function () {

  const wrap = byId("marksSubjRows");

  const row = document.createElement("div");

  row.style.display = "grid";
  row.style.gridTemplateColumns =
    "1fr 90px 90px 70px 70px";
  row.style.gap = "8px";
  row.style.marginBottom = "8px";

  row.innerHTML = `
    <input class="f-input sbj-name"
      placeholder="Subject">

    <input class="f-input sbj-max"
      type="number" value="100">

    <input class="f-input sbj-obt"
      type="number" value="0">

    <input class="f-input sbj-grade"
      placeholder="A">

    <button onclick="this.parentElement.remove()">
      ✕
    </button>
  `;

  wrap.appendChild(row);
};

/* ---------- AUTO FILL ---------- */
window.autoFillClass = function () {

  const roll = val("m_roll");

  const st = STATE.students.find(
    x => x.roll == roll
  );

  if (!st) return;

  setVal("m_cls", st.class);
  setVal("m_stream", st.stream);
};

/* ---------- SAVE ---------- */
window.saveMarks = async function () {

  const rows = [
    ...document.querySelectorAll(
      "#marksSubjRows > div"
    )
  ];

  let subs = [];
  let total = 0;
  let max = 0;

  rows.forEach(r => {

    const i = r.querySelectorAll("input");

    const sub = i[0].value.trim();
    const mx = Number(i[1].value || 0);
    const ob = Number(i[2].value || 0);
    const gr = i[3].value.trim();

    if (!sub) return;

    subs.push({
      subject: sub,
      max_marks: mx,
      obtained: ob,
      grade: gr
    });

    total += ob;
    max += mx;
  });

  const per =
    max > 0
    ? ((total / max) * 100).toFixed(2)
    : 0;

  const payload = {
    roll: val("m_roll"),
    class: val("m_cls"),
    stream: val("m_stream"),
    exam: val("m_exam"),
    session: "2025-26",
    total: total,
    max_total: max,
    percentage: per,
    grade: autoResultGrade(per),
    rank: val("m_rank"),
    remarks: val("m_remarks"),
    subjects: subs
  };

  const { error } = await supabaseClient
    .from("results")
    .insert([payload]);

  if (error) {
    toast(error.message, "error");
    return;
  }

  toast("Result Saved");

  closeModal("marksModal");

  await fetchResults();
  renderMarksTable();
};

/* ---------- TABLE ---------- */
window.renderMarksTable = function () {

  const tbody = byId("marksTbody");
  if (!tbody) return;

  const cls = val("marksFilterClass");
  const sess = val("marksFilterSession");

  let rows = [...STATE.results];

  if (cls) rows = rows.filter(x => x.class === cls);
  if (sess) rows = rows.filter(x => x.session === sess);

  if (!rows.length) {
    tbody.innerHTML =
      `<tr><td colspan="8">
      No results
      </td></tr>`;
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
        <button onclick="
          deleteResult('${r.roll}',
          '${r.exam}',
          '${r.session}')">
          Delete
        </button>
      </td>
    </tr>
  `).join("");
};

/* ---------- DELETE ---------- */
window.deleteResult = async function (
  roll, exam, session
) {

  if (!confirm("Delete result?")) return;

  await supabaseClient
    .from("results")
    .delete()
    .match({
      roll: roll,
      exam: exam,
      session: session
    });

  await fetchResults();
  renderMarksTable();

  toast("Deleted");
};

/* ---------- GRADE ---------- */
function autoResultGrade(p) {

  p = Number(p);

  if (p >= 90) return "A+";
  if (p >= 80) return "A";
  if (p >= 70) return "B+";
  if (p >= 60) return "B";
  if (p >= 50) return "C";
  if (p >= 33) return "D";

  return "F";
}

/* ---------- TAB ---------- */
const oldShowTabResult = window.showTab;

window.showTab = async function(name, btn) {

  oldShowTabResult(name, btn);

  if (name === "marks") {
    await loadResults();
  }
};
/* ==========================================
   NOTICES FINAL MODULE
========================================== */

/* ---------- LOAD ---------- */
window.loadNotices = async function () {
  await fetchNotices();
  fillNoticeFilters();
  renderNoticeLists();
};

/* ---------- FETCH ---------- */
async function fetchNotices() {
  const { data } = await supabaseClient
    .from("notice")
    .select("*")
    .order("created_at", { ascending:false });

  STATE.notices = data || [];
}

/* ---------- FILTERS ---------- */
function fillNoticeFilters() {

  const classSel1 = byId("noticeClassFilter");
  const classSel2 = byId("noticePrivateClassFilter");

  const classes = [...new Set(
    STATE.students.map(x => x.class).filter(Boolean)
  )].sort();

  const html =
    `<option value="">All Classes</option>` +
    classes.map(c => `<option>${c}</option>`).join("");

  if (classSel1) classSel1.innerHTML = html;
  if (classSel2) classSel2.innerHTML = html;

  filterPrivateNoticeByClass();
}

/* ---------- OPEN ---------- */
window.openNoticeModal = function () {
  openModal("noticeModal");
};

/* ---------- SAVE ---------- */
window.saveNotice = async function () {

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

  if (error) {
    toast(error.message, "error");
    return;
  }

  closeModal("noticeModal");
  toast("Notice Saved");

  await fetchNotices();
  renderNoticeLists();
  fetchDashboardStats();
};

/* ---------- SWITCH UI ---------- */
window.switchNoticeTab = function(type, btn) {

  ["global","class","private"].forEach(x => {
    byId("ntab-" + x).className = "btn btn-ghost";
    byId("ntab-" + x + "-content").style.display = "none";
  });

  byId("ntab-" + type).className = "btn btn-teal";
  byId("ntab-" + type + "-content").style.display = "block";
};

/* ---------- RENDER ---------- */
window.renderNoticeLists = function () {
  renderGlobalNotices();
  renderClassNotices();
  renderPrivateNotices();
};

/* GLOBAL */
function renderGlobalNotices() {

  const box = byId("noticeGlobalList");
  if (!box) return;

  const rows = STATE.notices.filter(
    x => x.type === "global"
  );

  box.innerHTML = rows.length
    ? rows.map(n => noticeCard(n)).join("")
    : "No notices";
}

/* CLASS */
window.renderClassNotices = function () {

  const box = byId("noticeClassList");
  if (!box) return;

  const cls = val("noticeClassFilter");

  let rows = STATE.notices.filter(
    x => x.type === "class"
  );

  if (cls) rows = rows.filter(
    x => x.target_class === cls
  );

  box.innerHTML = rows.length
    ? rows.map(n => noticeCard(n)).join("")
    : "No class notices";
};

/* PRIVATE */
window.filterPrivateNoticeByClass = function () {

  const cls = val("noticePrivateClassFilter");
  const sel = byId("noticePrivateStudent");

  let rows = [...STATE.students];

  if (cls) rows = rows.filter(
    x => x.class === cls
  );

  sel.innerHTML =
    `<option value="">Select Student</option>` +
    rows.map(s =>
      `<option value="${s.roll}">
      ${s.roll} - ${s.name}
      </option>`
    ).join("");

  renderPrivateNotices();
};

window.renderPrivateNotices = function () {

  const box = byId("noticePrivateList");
  if (!box) return;

  const roll = val("noticePrivateStudent");

  let rows = STATE.notices.filter(
    x => x.type === "private"
  );

  if (roll) rows = rows.filter(
    x => x.target_roll === roll
  );

  box.innerHTML = rows.length
    ? rows.map(n => noticeCard(n)).join("")
    : "No private notices";
};

/* ---------- DELETE ---------- */
window.deleteNotice = async function (
  title, date
) {

  if (!confirm("Delete notice?")) return;

  await supabaseClient
    .from("notice")
    .delete()
    .match({
      title: title,
      notice_date: date
    });

  await fetchNotices();
  renderNoticeLists();
  fetchDashboardStats();

  toast("Deleted");
};

/* ---------- CARD ---------- */
function noticeCard(n) {

  return `
  <div class="mini-pill"
    style="display:flex;
    justify-content:space-between;
    gap:10px">

    <span>
      ${n.urgent ? "🔴 " : ""}
      ${n.title}
      <small style="opacity:.6">
      ${n.notice_date || ""}
      </small>
    </span>

    <button onclick="
      deleteNotice(
      '${n.title}',
      '${n.notice_date}'
      )">✕</button>

  </div>`;
}

/* ---------- TAB ---------- */
const oldShowTabNotice = window.showTab;

window.showTab = async function(name, btn) {

  oldShowTabNotice(name, btn);

  if (name === "notices") {
    await loadNotices();
  }
};
/* ==========================================
   ASSIGNMENTS FINAL MODULE
========================================== */

/* ---------- LOAD ---------- */
window.loadAssignments = async function () {
  await fetchAssignments();
  fillAssignFilters();
  renderAssignTable();
};

/* ---------- FETCH ---------- */
async function fetchAssignments() {

  const { data } = await supabaseClient
    .from("assignment")
    .select("*")
    .order("created_at", { ascending:false });

  STATE.assignments = data || [];
}

/* ---------- FILTERS ---------- */
function fillAssignFilters() {

  const clsSel = byId("assignClassFilter");

  if (!clsSel) return;

  const classes = [...new Set(
    STATE.students.map(x => x.class).filter(Boolean)
  )].sort();

  clsSel.innerHTML =
    `<option value="">All Classes</option>` +
    classes.map(c => `<option>${c}</option>`).join("");

  filterAssignByClass();
}

window.filterAssignByClass = function () {

  const cls = val("assignClassFilter");
  const sel = byId("assignStudentPicker");

  let rows = [...STATE.students];

  if (cls) {
    rows = rows.filter(x => x.class === cls);
  }

  sel.innerHTML =
    `<option value="">— Select Student —</option>` +
    rows.map(s =>
      `<option value="${s.roll}">
      ${s.roll} - ${s.name}
      </option>`
    ).join("");

  byId("addAssignBtn").disabled = false;

  renderAssignTable();
};

/* ---------- OPEN ---------- */
window.openAssignModal = function () {
  openModal("assignModal");
};

/* ---------- SAVE ---------- */
window.saveAssign = async function () {

  const payload = {
    roll: val("assignStudentPicker"),
    class: val("assignClassFilter"),
    subject: val("a_sub"),
    title: val("a_title"),
    due_date: val("a_due"),
    session: "2025-26",
    status: byId("a_done").checked
      ? "Completed"
      : "Pending"
  };

  const { error } = await supabaseClient
    .from("assignment")
    .insert([payload]);

  if (error) {
    toast(error.message, "error");
    return;
  }

  closeModal("assignModal");
  toast("Assignment Saved");

  await fetchAssignments();
  renderAssignTable();
  fetchDashboardStats();
};

/* ---------- TABLE ---------- */
window.renderAssignTable = function () {

  const tbody = byId("assignTbody");
  if (!tbody) return;

  const cls = val("assignClassFilter");
  const roll = val("assignStudentPicker");
  const sess = val("assignSessionFilter");

  let rows = [...STATE.assignments];

  if (cls) rows = rows.filter(
    x => x.class === cls
  );

  if (roll) rows = rows.filter(
    x => x.roll === roll
  );

  if (sess) rows = rows.filter(
    x => x.session === sess
  );

  if (!rows.length) {
    tbody.innerHTML =
      `<tr><td colspan="6">
      No assignments
      </td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(a => `
    <tr>
      <td>${a.subject || "-"}</td>
      <td>${a.title || "-"}</td>
      <td>${a.due_date || "-"}</td>
      <td>${a.session || "-"}</td>
      <td>${a.status || "-"}</td>
      <td style="display:flex;gap:6px">
        <button onclick="
          toggleAssign(
          '${a.title}',
          '${a.roll}',
          '${a.due_date}',
          '${a.status}'
          )">
          Toggle
        </button>

        <button onclick="
          deleteAssign(
          '${a.title}',
          '${a.roll}',
          '${a.due_date}'
          )">
          Delete
        </button>
      </td>
    </tr>
  `).join("");
};

/* ---------- TOGGLE ---------- */
window.toggleAssign = async function (
  title, roll, due, status
) {

  const next =
    status === "Completed"
    ? "Pending"
    : "Completed";

  await supabaseClient
    .from("assignment")
    .update({ status: next })
    .match({
      title: title,
      roll: roll,
      due_date: due
    });

  await fetchAssignments();
  renderAssignTable();

  toast("Updated");
};

/* ---------- DELETE ---------- */
window.deleteAssign = async function (
  title, roll, due
) {

  if (!confirm("Delete assignment?")) return;

  await supabaseClient
    .from("assignment")
    .delete()
    .match({
      title: title,
      roll: roll,
      due_date: due
    });

  await fetchAssignments();
  renderAssignTable();
  fetchDashboardStats();

  toast("Deleted");
};

/* ---------- TAB ---------- */
const oldShowTabAssign = window.showTab;

window.showTab = async function(name, btn) {

  oldShowTabAssign(name, btn);

  if (name === "assignments") {
    await loadAssignments();
  }
};
/* ==========================================
   ATTENDANCE FINAL MODULE
========================================== */

/* ---------- LOAD ---------- */
window.loadAttendance = async function () {
  await fetchAttendance();
  fillAttendanceFilters();
};

/* ---------- FETCH ---------- */
async function fetchAttendance() {

  const { data } = await supabaseClient
    .from("attendance")
    .select("*")
    .order("att_date", { ascending:false });

  STATE.attendance = data || [];
}

/* ---------- FILTERS ---------- */
function fillAttendanceFilters() {

  const clsSel = byId("attClassFilter");

  if (!clsSel) return;

  const classes = [...new Set(
    STATE.students.map(x => x.class).filter(Boolean)
  )].sort();

  clsSel.innerHTML =
    `<option value="">All Classes</option>` +
    classes.map(c => `<option>${c}</option>`).join("");

  filterAttByClass();
}

window.filterAttByClass = function () {

  const cls = val("attClassFilter");
  const sel = byId("attStudentPicker");

  let rows = [...STATE.students];

  if (cls) rows = rows.filter(
    x => x.class === cls
  );

  sel.innerHTML =
    `<option value="">— Select Student —</option>` +
    rows.map(s =>
      `<option value="${s.roll}">
      ${s.roll} - ${s.name}
      </option>`
    ).join("");
};

/* ---------- EDITOR ---------- */
window.renderAttendance = function () {

  const wrap = byId("attEditorWrap");
  const roll = val("attStudentPicker");

  if (!roll) {
    wrap.innerHTML =
      `<div style="padding:40px;text-align:center">
      Select student first
      </div>`;
    return;
  }

  wrap.innerHTML = `
  <div class="card">
    <div class="card-body"
      style="display:grid;gap:12px">

      <input id="attDate"
        type="date"
        class="f-input"
        value="${todayDate()}">

      <select id="attStatus"
        class="f-input">

        <option>Present</option>
        <option>Absent</option>
        <option>Leave</option>
        <option>Late</option>
        <option>Half Day</option>

      </select>

      <input id="attRemarks"
        class="f-input"
        placeholder="Remarks">

      <button class="btn btn-teal"
        onclick="saveAttendance()">
        Save Attendance
      </button>

      <div id="attSummary"></div>
      <div id="attHistory"></div>

    </div>
  </div>
  `;

  renderAttendanceHistory();
};

/* ---------- SAVE ---------- */
window.saveAttendance = async function () {

  const payload = {
    roll: val("attStudentPicker"),
    att_date: val("attDate"),
    status: val("attStatus"),
    remarks: val("attRemarks")
  };

  /* delete same date first */
  await supabaseClient
    .from("attendance")
    .delete()
    .match({
      roll: payload.roll,
      att_date: payload.att_date
    });

  const { error } = await supabaseClient
    .from("attendance")
    .insert([payload]);

  if (error) {
    toast(error.message, "error");
    return;
  }

  toast("Attendance Saved");

  await fetchAttendance();
  renderAttendanceHistory();
};

/* ---------- HISTORY ---------- */
function renderAttendanceHistory() {

  const box = byId("attHistory");
  const sum = byId("attSummary");

  if (!box || !sum) return;

  const roll = val("attStudentPicker");

  const rows = STATE.attendance.filter(
    x => x.roll === roll
  );

  const recent = rows.slice(0, 10);

  const present = rows.filter(
    x => x.status === "Present"
  ).length;

  const absent = rows.filter(
    x => x.status === "Absent"
  ).length;

  sum.innerHTML = `
    <div style="
      display:flex;
      gap:10px;
      flex-wrap:wrap">

      <div class="mini-pill">
      Present: ${present}
      </div>

      <div class="mini-pill">
      Absent: ${absent}
      </div>

      <div class="mini-pill">
      Total: ${rows.length}
      </div>

    </div>
  `;

  box.innerHTML = recent.length
    ? recent.map(r => `
      <div class="mini-pill"
      style="
      display:flex;
      justify-content:space-between">

      <span>
      ${r.att_date}
      - ${r.status}
      </span>

      <button onclick="
        deleteAttendance(
        '${r.roll}',
        '${r.att_date}'
        )">✕</button>

      </div>
    `).join("")
    : "No records";
}

/* ---------- DELETE ---------- */
window.deleteAttendance = async function (
  roll, dt
) {

  await supabaseClient
    .from("attendance")
    .delete()
    .match({
      roll: roll,
      att_date: dt
    });

  await fetchAttendance();
  renderAttendanceHistory();

  toast("Deleted");
};

/* ---------- HELPER ---------- */
function todayDate() {
  return new Date()
    .toISOString()
    .slice(0,10);
}

/* ---------- TAB ---------- */
const oldShowTabAtt = window.showTab;

window.showTab = async function(name, btn) {

  oldShowTabAtt(name, btn);

  if (name === "attendance") {
    await loadAttendance();
  }
};
/* ==========================================
   TIMETABLE FINAL MODULE
========================================== */

const TT_DAYS = [
  "Monday","Tuesday","Wednesday",
  "Thursday","Friday","Saturday"
];

const TT_PERIODS = [1,2,3,4,5,6,7,8];

/* ---------- LOAD ---------- */
window.loadTimetable = async function () {
  await fetchTT();
  renderTTEditor();
  await fetchExams();
  renderExamTable();
};

/* ---------- FETCH ---------- */
async function fetchTT() {

  const { data } = await supabaseClient
    .from("timetable")
    .select("*");

  STATE.timetable = data || [];
}

/* ---------- GRID ---------- */
window.renderTTEditor = function () {

  const box = byId("ttEditorGrid");
  if (!box) return;

  const cls = "Class " + val("ttClassPicker");

  let html = `
  <table class="admin-tbl">
  <thead>
  <tr>
    <th>Day</th>`;

  TT_PERIODS.forEach(p => {
    html += `<th>P${p}</th>`;
  });

  html += `</tr></thead><tbody>`;

  TT_DAYS.forEach(day => {

    html += `<tr><td>${day}</td>`;

    TT_PERIODS.forEach(p => {

      const row = STATE.timetable.find(
        x =>
        x.class === cls &&
        x.day_name === day &&
        Number(x.period_no) === p
      );

      html += `
      <td>
        <input
          class="f-input tt-cell"
          data-class="${cls}"
          data-day="${day}"
          data-period="${p}"
          value="${row?.subject || ""}"
          placeholder="Subject">

        <input
          class="f-input tt-teacher"
          data-class="${cls}"
          data-day="${day}"
          data-period="${p}"
          value="${row?.teacher || ""}"
          placeholder="Teacher"
          style="margin-top:6px">
      </td>`;
    });

    html += `</tr>`;
  });

  html += `</tbody></table>`;

  box.innerHTML = html;
};

/* ---------- SAVE ---------- */
window.saveTTChanges = async function () {

  const cls = "Class " + val("ttClassPicker");

  const cells = [
    ...document.querySelectorAll(".tt-cell")
  ];

  for (const c of cells) {

    const subject = c.value.trim();

    const day = c.dataset.day;
    const period = c.dataset.period;

    const teacher = document.querySelector(
      `.tt-teacher[data-class="${cls}"][data-day="${day}"][data-period="${period}"]`
    ).value.trim();

    await supabaseClient
      .from("timetable")
      .delete()
      .match({
        class: cls,
        day_name: day,
        period_no: period
      });

    if (subject) {

      await supabaseClient
        .from("timetable")
        .insert([{
          class: cls,
          day_name: day,
          period_no: period,
          subject: subject,
          teacher: teacher,
          start_time: "",
          end_time: ""
        }]);
    }
  }

  toast("Timetable Saved");

  await fetchTT();
  renderTTEditor();
};

/* ---------- TAB ---------- */
const oldShowTabTT = window.showTab;

window.showTab = async function(name, btn) {

  oldShowTabTT(name, btn);

  if (name === "timetable") {
    await loadTimetable();
  }
};
/* ==========================================
   EXAM FINAL MODULE
========================================== */

/* ---------- LOAD ---------- */
window.loadExams = async function () {
  await fetchExams();
  renderExamTable();
};

/* ---------- FETCH ---------- */
async function fetchExams() {

  const { data } = await supabaseClient
    .from("exam")
    .select("*")
    .order("exam_date", { ascending:true });

  STATE.exams = data || [];
}

/* ---------- OPEN ---------- */
window.openExamModal = function () {

  const cls = "Class " + val("ttClassPicker");

  const html = `
  <div class="modal open" id="examTempModal">
    <div class="modal-box">

      <div class="card-header">
        <h3>Add Exam</h3>
        <button onclick="
          closeModal('examTempModal')
        ">✕</button>
      </div>

      <div class="card-body"
        style="display:grid;gap:10px">

        <input id="ex_name"
          class="f-input"
          placeholder="Exam Name">

        <input id="ex_subject"
          class="f-input"
          placeholder="Subject">

        <input id="ex_date"
          type="date"
          class="f-input">

        <input id="ex_start"
          type="time"
          class="f-input">

        <input id="ex_end"
          type="time"
          class="f-input">

        <input id="ex_room"
          class="f-input"
          placeholder="Room / Venue">

        <button class="btn btn-amber"
          onclick="saveExam()">
          Save Exam
        </button>

      </div>
    </div>
  </div>`;

  document.body.insertAdjacentHTML(
    "beforeend",
    html
  );
};

/* ---------- SAVE ---------- */
window.saveExam = async function () {

  const payload = {
    class: "Class " + val("ttClassPicker"),
    exam_name: val("ex_name"),
    subject: val("ex_subject"),
    exam_date: val("ex_date"),
    start_time: val("ex_start"),
    end_time: val("ex_end"),
    room_no: val("ex_room"),
    max_marks: 100
  };

  const { error } = await supabaseClient
    .from("exam")
    .insert([payload]);

  if (error) {
    toast(error.message, "error");
    return;
  }

  closeModal("examTempModal");

  toast("Exam Saved");

  await fetchExams();
  renderExamTable();
};

/* ---------- TABLE ---------- */
window.renderExamTable = function () {

  const tbody = byId("examTbody");
  if (!tbody) return;

  const cls = "Class " + val("ttClassPicker");

  let rows = STATE.exams.filter(
    x => x.class === cls
  );

  if (!rows.length) {
    tbody.innerHTML =
      `<tr><td colspan="6">
      No exams scheduled
      </td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(e => `
    <tr>
      <td>${e.exam_date || "-"}</td>
      <td>${dayName(e.exam_date)}</td>
      <td>
        ${e.exam_name || ""}
        <br>
        <small>${e.subject || ""}</small>
      </td>
      <td>
        ${e.start_time || ""}
        -
        ${e.end_time || ""}
      </td>
      <td>${e.room_no || "-"}</td>
      <td>
        <button onclick="
          deleteExam(
          '${e.class}',
          '${e.exam_name}',
          '${e.subject}',
          '${e.exam_date}'
          )">
          Delete
        </button>
      </td>
    </tr>
  `).join("");
};

/* ---------- DELETE ---------- */
window.deleteExam = async function (
  cls, name, sub, dt
) {

  if (!confirm("Delete exam?")) return;

  await supabaseClient
    .from("exam")
    .delete()
    .match({
      class: cls,
      exam_name: name,
      subject: sub,
      exam_date: dt
    });

  await fetchExams();
  renderExamTable();

  toast("Deleted");
};

/* ---------- HELPER ---------- */
function dayName(dt) {

  if (!dt) return "-";

  const d = new Date(dt);

  return d.toLocaleDateString(
    "en-US",
    { weekday:"long" }
  );
}

/* ---------- TAB ---------- */
const oldShowTabExam = window.showTab;

window.showTab = async function(name, btn) {

  oldShowTabExam(name, btn);

  if (name === "timetable") {
    await loadExams();
  }
};
/* ==========================================
   FINAL SYSTEM PATCH
========================================== */

/* ---------- DASHBOARD ---------- */
window.fetchDashboardStats = async function () {

  setText("dash-students",
    (STATE.students || []).length
  );

  setText("dash-results",
    (STATE.results || []).length
  );

  setText("dash-notices",
    (STATE.notices || []).length
  );

  setText("dash-assigns",
    (STATE.assignments || []).length
  );

  renderDashNoticeList();
  renderDashAssignList();
};

/* ---------- RECENT NOTICE ---------- */
function renderDashNoticeList() {

  const box = byId("dash-notice-list");
  if (!box) return;

  const rows =
    (STATE.notices || [])
    .slice(0,5);

  box.innerHTML = rows.length
    ? rows.map(x => `
      <div class="mini-pill">
        ${x.title}
      </div>
    `).join("")
    : "No notices";
}

/* ---------- RECENT ASSIGN ---------- */
function renderDashAssignList() {

  const box = byId("dash-assign-list");
  if (!box) return;

  const rows =
    (STATE.assignments || [])
    .slice(0,5);

  box.innerHTML = rows.length
    ? rows.map(x => `
      <div class="mini-pill">
        ${x.title}
      </div>
    `).join("")
    : "No assignments";
}

/* ---------- MASTER LOAD ---------- */
window.loadAllModules = async function () {

  try {

    if (window.fetchStudents)
      await fetchStudents();

    if (window.fetchResults)
      await fetchResults();

    if (window.fetchFees)
      await fetchFees();

    if (window.fetchNotices)
      await fetchNotices();

    if (window.fetchAssignments)
      await fetchAssignments();

    if (window.fetchAttendance)
      await fetchAttendance();

    if (window.fetchTT)
      await fetchTT();

    if (window.fetchExams)
      await fetchExams();

    if (window.renderStudentTable)
      renderStudentTable();

    if (window.renderMarksTable)
      renderMarksTable();

    if (window.renderFeeTable)
      renderFeeTable();

    if (window.renderNoticeLists)
      renderNoticeLists();

    if (window.renderAssignTable)
      renderAssignTable();

    if (window.renderExamTable)
      renderExamTable();

    fetchDashboardStats();

  } catch (e) {
    console.error(e);
  }
};

/* ---------- AFTER LOGIN ---------- */
const oldLoginFinal = window.doAdminLogin;

window.doAdminLogin = async function () {

  await oldLoginFinal();

  setTimeout(async () => {
    await loadAllModules();
  }, 300);
};

/* ---------- TAB SWITCH ---------- */
const oldShowTabFinal = window.showTab;

window.showTab = async function(name, btn) {

  oldShowTabFinal(name, btn);

  if (name === "dashboard") {
    fetchDashboardStats();
  }

  if (name === "students" &&
      window.renderStudentTable)
    renderStudentTable();

  if (name === "marks" &&
      window.renderMarksTable)
    renderMarksTable();

  if (name === "fees" &&
      window.renderFeeTable)
    renderFeeTable();

  if (name === "notices" &&
      window.renderNoticeLists)
    renderNoticeLists();

  if (name === "assignments" &&
      window.renderAssignTable)
    renderAssignTable();

  if (name === "timetable" &&
      window.renderTTEditor)
    renderTTEditor();

  if (name === "timetable" &&
      window.renderExamTable)
    renderExamTable();
};

/* ---------- PAGE LOAD ---------- */
window.addEventListener("load", async () => {

  if (localStorage.getItem(
    "rkph_admin_login"
  ) === "1") {

    setTimeout(async () => {
      await loadAllModules();
    }, 400);
  }
});
/* ==========================================
   FINAL EDIT PATCH
========================================== */

/* ---------- EDIT FEE ---------- */
window.editFee = function(
 roll, quarter, type, amount, due, status
){

 byId("feeStudentPicker").value = roll;

 openFeeModal();

 setTimeout(() => {
   setVal("f_quarter", quarter);
   setVal("f_type", type);
   setVal("f_amount", amount);
   setVal("f_due", due);
   setVal("f_status", status);
 }, 150);
};

/* replace fee buttons */
const oldRenderFeeTable2 = window.renderFeeTable;

window.renderFeeTable = function() {

 oldRenderFeeTable2();

 const tb = byId("feeTbody");
 if(!tb) return;

 [...tb.querySelectorAll("tr")].forEach((tr,i) => {

   const row = STATE.fees[i];
   if(!row) return;

   tr.lastElementChild.innerHTML = `
   <button onclick="
   editFee(
   '${row.roll}',
   '${row.quarter}',
   '${row.fee_type}',
   '${row.amount}',
   '${row.due_date}',
   '${row.status}'
   )">Edit</button>

   <button onclick="
   deleteFee(
   '${row.roll}',
   '${row.quarter}',
   '${row.fee_type}',
   '${row.due_date}'
   )">Delete</button>
   `;
 });
};

/* ---------- EDIT NOTICE ---------- */
window.editNotice = function(
 title,date,tag,type,cls,roll
){

 openNoticeModal();

 setTimeout(() => {

   setVal("n_title", title);
   setVal("n_date", date);
   setVal("n_tag", tag);
   setVal("n_type", type);
   setVal("n_class", cls);
   setVal("n_student", roll);

 },150);
};

/* ---------- EDIT ASSIGN ---------- */
window.editAssign = function(
 sub,title,due,status
){

 openAssignModal();

 setTimeout(() => {

   setVal("a_sub", sub);
   setVal("a_title", title);
   setVal("a_due", due);

   if(status==="Completed")
     byId("a_done").checked=true;

 },150);
};

/* ---------- SAFE RESULT DUP ---------- */
const oldSaveMarks2 = window.saveMarks;

window.saveMarks = async function() {

 const roll = val("m_roll");
 const exam = val("m_exam");

 await supabaseClient
   .from("results")
   .delete()
   .match({
     roll: roll,
     exam: exam,
     session: "2025-26"
   });

 await oldSaveMarks2();
};

/* ---------- SEARCH IMPROVE ---------- */
const oldStudentRender2 =
window.renderStudentTable;

window.renderStudentTable = function() {

 oldStudentRender2();

 const cnt = byId("stuCount");

 if(cnt)
   cnt.textContent =
   (STATE.students||[]).length +
   " Students";
};

/* ---------- ARCHIVE HELP ---------- */
window.currentSession = function() {
 return "2025-26";
};

/* ==========================================
   FINAL CORE ROUTER PATCH
========================================== */

window.APP_READY = false;

/* ---------- SAFE TAB LOAD ---------- */
window.masterTabLoad = async function(name) {

  try {

    if (name === "dashboard") {
      if (window.fetchDashboardStats)
        fetchDashboardStats();
    }

    if (name === "students") {
      if (window.loadStudents)
        await loadStudents();
    }

    if (name === "marks") {
      if (window.loadResults)
        await loadResults();
    }

    if (name === "fees") {
      if (window.loadFees)
        await loadFees();
    }

    if (name === "notices") {
      if (window.loadNotices)
        await loadNotices();
    }

    if (name === "assignments") {
      if (window.loadAssignments)
        await loadAssignments();
    }

    if (name === "attendance") {
      if (window.loadAttendance)
        await loadAttendance();
    }

    if (name === "timetable") {
      if (window.loadTimetable)
        await loadTimetable();
    }

  } catch(err) {
    console.error(err);
  }
};

/* ---------- CLEAN SHOWTAB ---------- */
window.showTab = function(name, btn) {

  document.querySelectorAll(".tab")
    .forEach(el =>
      el.classList.remove("active")
    );

  document.querySelectorAll(".nav-item")
    .forEach(el =>
      el.classList.remove("active")
    );

  const tab =
    document.getElementById(
      "tab-" + name
    );

  if (tab)
    tab.classList.add("active");

  if (btn)
    btn.classList.add("active");

  masterTabLoad(name);
};

/* ---------- MASTER STARTUP ---------- */
window.bootAdminPanel =
async function () {

  if (APP_READY) return;

  APP_READY = true;

  try {

    if (window.fetchStudents)
      await fetchStudents();

    if (window.fetchResults)
      await fetchResults();

    if (window.fetchFees)
      await fetchFees();

    if (window.fetchDashboardStats)
      fetchDashboardStats();

  } catch(err) {
    console.error(err);
  }
};

/* ---------- AFTER LOGIN ---------- */
const oldLoginStable =
window.doAdminLogin;

window.doAdminLogin =
async function () {

  await oldLoginStable();

  setTimeout(() => {
    bootAdminPanel();
  }, 250);
};

/* ---------- AUTO SESSION ---------- */
window.addEventListener(
  "load",
  function () {

    if (
      localStorage.getItem(
        "rkph_admin_login"
      ) === "1"
    ) {

      setTimeout(() => {
        bootAdminPanel();
      }, 350);
    }
  }
);
/* ==========================================
   DATA SYNC ENGINE PATCH
========================================== */

/* ---------- SINGLE REFRESH ---------- */
window.refreshModule =
async function (name) {

  try {

    if (name === "students") {
      await fetchStudents();
      if (window.renderStudentTable)
        renderStudentTable();
    }

    if (name === "marks") {
      await fetchResults();
      if (window.renderMarksTable)
        renderMarksTable();
    }

    if (name === "fees") {
      await fetchFees();
      if (window.renderFeeTable)
        renderFeeTable();
    }

    if (name === "notices") {
      if (window.fetchNotices)
        await fetchNotices();

      if (window.renderNoticeLists)
        renderNoticeLists();
    }

    if (name === "assignments") {
      if (window.fetchAssignments)
        await fetchAssignments();

      if (window.renderAssignTable)
        renderAssignTable();
    }

    if (name === "attendance") {
      if (window.fetchAttendance)
        await fetchAttendance();
    }

    if (name === "timetable") {
      if (window.fetchTT)
        await fetchTT();

      if (window.renderTTEditor)
        renderTTEditor();

      if (window.fetchExams)
        await fetchExams();

      if (window.renderExamTable)
        renderExamTable();
    }

    if (window.fetchDashboardStats)
      fetchDashboardStats();

  } catch(err) {
    console.error(err);
  }
};

/* ---------- MASTER RELOAD ---------- */
window.reloadEverything =
async function () {

  await Promise.all([
    window.fetchStudents
      ? fetchStudents()
      : Promise.resolve(),

    window.fetchResults
      ? fetchResults()
      : Promise.resolve(),

    window.fetchFees
      ? fetchFees()
      : Promise.resolve()
  ]);

  if (window.fetchDashboardStats)
    fetchDashboardStats();
};

/* ---------- SAFE TOAST ERROR ---------- */
window.handleDbError =
function (err, msg="Action failed") {

  console.error(err);

  toast(
    err?.message || msg,
    "error"
  );
};
/* ==========================================
   STUDENTS FINAL PATCH
========================================== */

/* ---------- MODAL RESET ---------- */
window.closeStudentModal =
function () {

  const modal =
    document.getElementById(
      "studentModal"
    );

  if (modal)
    modal.classList.remove(
      "open"
    );

  if (typeof clearStudentForm
      === "function")
    clearStudentForm();

  if (typeof resetStudentBtn
      === "function")
    resetStudentBtn();
};

/* ---------- SAFE OPEN ---------- */
const oldOpenStudent =
window.openStudentModal;

window.openStudentModal =
function () {

  if (typeof oldOpenStudent
      === "function") {
    oldOpenStudent();
  }

  setTimeout(() => {

    const roll =
      document.getElementById(
        "s_roll"
      );

    if (roll) roll.focus();

  },120);
};

/* ---------- AFTER SAVE ---------- */
const oldSaveStudent =
window.saveStudent;

window.saveStudent =
async function () {

  if (typeof oldSaveStudent
      === "function") {

    await oldSaveStudent();

    setTimeout(async () => {
      await refreshModule(
        "students"
      );
    },250);
  }
};

/* ---------- DELETE PATCH ---------- */
const oldDeleteStudent =
window.deleteStudent;

window.deleteStudent =
async function (roll) {

  await oldDeleteStudent(
    roll
  );

  setTimeout(async () => {
    await refreshModule(
      "students"
    );
  },250);
};

/* ---------- LIVE SEARCH ---------- */
window.addEventListener(
  "load",
  function () {

    const input =
      document.getElementById(
        "stuSearch"
      );

    if (input) {

      input.addEventListener(
        "keyup",
        function () {

          if (
            window.renderStudentTable
          ) {
            renderStudentTable();
          }

        }
      );
    }
  }
);

/* ==========================================
   RESULTS FINAL PATCH
========================================== */

/* ---------- OPEN CLEAN ---------- */
const oldOpenMarks =
window.openMarksModal;

window.openMarksModal =
function () {

  if (typeof oldOpenMarks
      === "function") {
    oldOpenMarks();
  }

  setTimeout(() => {

    const roll =
      document.getElementById(
        "m_roll"
      );

    if (roll) roll.focus();

  },120);
};

/* ---------- SAFE SAVE ---------- */
const oldSaveMarksStable =
window.saveMarks;

window.saveMarks =
async function () {

  try {

    const roll =
      document.getElementById(
        "m_roll"
      )?.value || "";

    const exam =
      document.getElementById(
        "m_exam"
      )?.value || "";

    if (!roll || !exam) {
      toast(
        "Roll and exam required",
        "error"
      );
      return;
    }

    /* remove old same exam */
    await supabaseClient
      .from("results")
      .delete()
      .match({
        roll: roll,
        exam: exam,
        session: "2025-26"
      });

    if (typeof oldSaveMarksStable
        === "function") {

      await oldSaveMarksStable();
    }

    setTimeout(async () => {
      await refreshModule(
        "marks"
      );
    },250);

  } catch(err) {
    handleDbError(
      err,
      "Save failed"
    );
  }
};

/* ---------- DELETE ---------- */
const oldDeleteResult =
window.deleteResult;

window.deleteResult =
async function(id) {

  await oldDeleteResult(id);

  setTimeout(async () => {
    await refreshModule(
      "marks"
    );
  },220);
};

/* ---------- FILTER LIVE ---------- */
window.addEventListener(
  "load",
  function () {

    [
      "marksFilterClass",
      "marksFilterSession"
    ].forEach(id => {

      const el =
        document.getElementById(
          id
        );

      if (el) {

        el.addEventListener(
          "change",
          function () {

            if (
              window.renderMarksTable
            ) {
              renderMarksTable();
            }

          }
        );
      }
    });

  }
);

/* ==========================================
   FEES FINAL PATCH
========================================== */

/* ---------- OPEN MODAL ---------- */
const oldOpenFee =
window.openFeeModal;

window.openFeeModal =
function () {

  const roll =
    document.getElementById(
      "feeStudentPicker"
    )?.value || "";

  if (!roll) {
    toast(
      "Select student first",
      "error"
    );
    return;
  }

  if (typeof oldOpenFee
      === "function") {
    oldOpenFee();
  }

  setTimeout(() => {

    const amt =
      document.getElementById(
        "fe_amt"
      );

    if (amt) amt.focus();

  },120);
};

/* ---------- SAVE ---------- */
const oldSaveFee =
window.saveFee;

window.saveFee =
async function () {

  try {

    const roll =
      document.getElementById(
        "feeStudentPicker"
      )?.value || "";

    const amt =
      document.getElementById(
        "fe_amt"
      )?.value || "";

    if (!roll || !amt) {
      toast(
        "Student and amount required",
        "error"
      );
      return;
    }

    if (typeof oldSaveFee
        === "function") {

      await oldSaveFee();
    }

    setTimeout(async () => {
      await refreshModule(
        "fees"
      );
    },250);

  } catch(err) {
    handleDbError(
      err,
      "Fee save failed"
    );
  }
};

/* ---------- DELETE ---------- */
const oldDeleteFee =
window.deleteFee;

window.deleteFee =
async function(id) {

  await oldDeleteFee(id);

  setTimeout(async () => {
    await refreshModule(
      "fees"
    );
  },220);
};

/* ---------- FILTER EVENTS ---------- */
window.addEventListener(
  "load",
  function () {

    const cls =
      document.getElementById(
        "feeClassFilter"
      );

    const stu =
      document.getElementById(
        "feeStudentPicker"
      );

    if (cls) {
      cls.addEventListener(
        "change",
        function () {

          if (
            window.filterFeeByClass
          ) {
            filterFeeByClass();
          }

        }
      );
    }

    if (stu) {
      stu.addEventListener(
        "change",
        function () {

          if (
            window.renderFeeTable
          ) {
            renderFeeTable();
          }

        }
      );
    }

  }
);

/* ---------- QUICK TOTAL ---------- */
window.getStudentDue =
function(roll) {

  const rows =
    (STATE.fees || [])
    .filter(x =>
      x.roll == roll &&
      String(
        x.status || ""
      ).toLowerCase()
      !== "paid"
    );

  return rows.reduce(
    (sum,x)=>
      sum +
      Number(x.amount||0),
    0
  );
};

/* ==========================================
   NOTICES + ASSIGNMENTS PATCH
========================================== */

/* ---------- NOTICE SAVE ---------- */
const oldSaveNotice =
window.saveNotice;

window.saveNotice =
async function () {

  try {

    if (typeof oldSaveNotice
        === "function") {
      await oldSaveNotice();
    }

    setTimeout(async () => {

      await refreshModule(
        "notices"
      );

      if (
        window.fetchDashboardStats
      ) {
        fetchDashboardStats();
      }

    },250);

  } catch(err) {
    handleDbError(
      err,
      "Notice save failed"
    );
  }
};

/* ---------- NOTICE DELETE ---------- */
const oldDeleteNotice =
window.deleteNotice;

window.deleteNotice =
async function(id) {

  await oldDeleteNotice(id);

  setTimeout(async () => {
    await refreshModule(
      "notices"
    );
  },220);
};

/* ---------- NOTICE TAB ---------- */
window.switchNoticeTab =
function(type,btn){

  [
   "global",
   "class",
   "private"
  ].forEach(x => {

    const a =
      document.getElementById(
        "ntab-" + x
      );

    const b =
      document.getElementById(
        "ntab-" + x +
        "-content"
      );

    if (a)
      a.className =
      "btn " +
      (x===type
      ? "btn-teal"
      : "btn-ghost");

    if (b)
      b.style.display =
      x===type
      ? "block"
      : "none";
  });
};

/* ---------- ASSIGN SAVE ---------- */
const oldSaveAssign =
window.saveAssignment;

window.saveAssignment =
async function () {

  try {

    if (
      typeof oldSaveAssign
      === "function"
    ) {
      await oldSaveAssign();
    }

    setTimeout(async () => {
      await refreshModule(
        "assignments"
      );
    },250);

  } catch(err) {
    handleDbError(
      err,
      "Assignment save failed"
    );
  }
};

/* ---------- ASSIGN DELETE ---------- */
const oldDeleteAssign =
window.deleteAssignment;

window.deleteAssignment =
async function(id){

  await oldDeleteAssign(id);

  setTimeout(async () => {
    await refreshModule(
      "assignments"
    );
  },220);
};

/* ---------- ASSIGN FILTER ---------- */
window.addEventListener(
  "load",
  function () {

    [
      "assignClassFilter",
      "assignStudentPicker",
      "assignSessionFilter"
    ].forEach(id => {

      const el =
        document.getElementById(
          id
        );

      if (el) {

        el.addEventListener(
          "change",
          function () {

            if (
              window.renderAssignTable
            ) {
              renderAssignTable();
            }

          }
        );
      }

    });

  }
);
/* ==========================================
   ATTENDANCE + TIMETABLE PATCH
========================================== */

/* ---------- ATTENDANCE PICKERS ---------- */
window.addEventListener(
  "load",
  function () {

    [
      "attClassFilter",
      "attStudentPicker"
    ].forEach(id => {

      const el =
        document.getElementById(id);

      if (el) {

        el.addEventListener(
          "change",
          function () {

            if (
              window.renderAttendance
            ) {
              renderAttendance();
            }

          }
        );
      }
    });

  }
);

/* ---------- SAVE ATTENDANCE ---------- */
const oldSaveAtt =
window.saveAttendance;

if (oldSaveAtt) {

  window.saveAttendance =
  async function () {

    await oldSaveAtt();

    setTimeout(async () => {
      await refreshModule(
        "attendance"
      );
    },220);
  };
}

/* ---------- SAVE TIMETABLE ---------- */
const oldSaveTT =
window.saveTTChanges;

if (oldSaveTT) {

  window.saveTTChanges =
  async function () {

    await oldSaveTT();

    toast(
      "Timetable saved",
      "success"
    );

    setTimeout(async () => {
      await refreshModule(
        "timetable"
      );
    },250);
  };
}

/* ---------- EXAM SAVE ---------- */
const oldSaveExam =
window.saveExam;

if (oldSaveExam) {

  window.saveExam =
  async function () {

    await oldSaveExam();

    setTimeout(async () => {
      await refreshModule(
        "timetable"
      );
    },250);
  };
}

/* ---------- EXAM DELETE ---------- */
const oldDeleteExam =
window.deleteExam;

if (oldDeleteExam) {

  window.deleteExam =
  async function(id){

    await oldDeleteExam(id);

    setTimeout(async () => {
      await refreshModule(
        "timetable"
      );
    },220);
  };
}

/* ---------- CLASS PICKER ---------- */
window.addEventListener(
  "load",
  function () {

    const tt =
      document.getElementById(
        "ttClassPicker"
      );

    if (tt) {

      tt.addEventListener(
        "change",
        function () {

          if (
            window.renderTTEditor
          ) {
            renderTTEditor();
          }

          if (
            window.renderExamTable
          ) {
            renderExamTable();
          }

        }
      );
    }

  }
);
/* ==========================================
   FINAL STABILITY PATCH
========================================== */

/* ---------- TOAST FALLBACK ---------- */
if (typeof window.toast !== "function") {

  window.toast =
  function(msg){

    alert(msg);
  };
}

/* ---------- BUTTON LOCK ---------- */
window.lockButtonTemp =
function(btn){

  if (!btn) return;

  btn.disabled = true;

  setTimeout(() => {
    btn.disabled = false;
  },1200);
};

/* ---------- ALL BUTTONS SAFE ---------- */
document.addEventListener(
  "click",
  function(e){

    const btn =
      e.target.closest("button");

    if (!btn) return;

    if (
      btn.classList.contains(
        "btn"
      ) ||
      btn.classList.contains(
        "btn-login"
      )
    ) {
      lockButtonTemp(btn);
    }
  }
);

/* ---------- ESC CLOSE MODAL ---------- */
document.addEventListener(
  "keydown",
  function(e){

    if (e.key !== "Escape")
      return;

    document
      .querySelectorAll(
        ".modal.open"
      )
      .forEach(m =>
        m.classList.remove(
          "open"
        )
      );
  }
);

/* ---------- MOBILE SIDEBAR CLOSE ---------- */
document.addEventListener(
  "click",
  function(e){

    const side =
      document.querySelector(
        ".sidebar"
      );

    if (!side) return;

    if (
      window.innerWidth < 900 &&
      !e.target.closest(
        ".sidebar"
      ) &&
      !e.target.closest(
        ".mob-menu-btn"
      )
    ) {
      side.classList.remove(
        "open"
      );
    }
  }
);

/* ---------- SAFE CALL ---------- */
window.safeCall =
function(fn){

  try {

    if (
      typeof window[fn]
      === "function"
    ) {
      window[fn]();
    }

  } catch(err) {
    console.error(err);
  }
};

/* ---------- AUTO DASHBOARD ---------- */
setInterval(() => {

  const dash =
    document.getElementById(
      "tab-dashboard"
    );

  if (
    dash &&
    dash.classList.contains(
      "active"
    )
  ) {

    if (
      window.fetchDashboardStats
    ) {
      fetchDashboardStats();
    }
  }

}, 30000);