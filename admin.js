// ===============================
// ADMIN AUTH
// ===============================

async function doAdminLogin() {
  const user = document.getElementById("loginUser").value;
  const pass = document.getElementById("loginPwd").value;

  // simple auth (you can later move to DB)
  if (user === "admin" && pass === "admin123") {
    document.getElementById("loginScreen").style.display = "none";
    document.getElementById("app").style.display = "block";

    loadDashboard();
  } else {
    document.getElementById("loginErr").innerText = "Invalid credentials";
  }
}

// ===============================
// DASHBOARD
// ===============================

async function loadDashboard() {
  const { data: students } = await supabaseClient.from("students").select("*");
  const { data: results } = await supabaseClient.from("results").select("*");

  document.getElementById("dash-students").innerText = students.length;
  document.getElementById("dash-results").innerText = results.length;
}

// ===============================
// STUDENTS
// ===============================

async function addStudent() {
  const roll = document.getElementById("s_roll").value.trim();
  const name = document.getElementById("s_name").value.trim();
  const password = document.getElementById("s_pass").value.trim();
  const studentClass = document.getElementById("s_class").value;

  if (!roll || !name || !password) {
    alert("Fill all required fields");
    return;
  }

  const { error } = await supabaseClient.from("students").insert([{
    roll,
    name,
    password,
    class: studentClass
  }]);

  if (error) {
    alert("Error: " + error.message);
  } else {
    alert("Student added ✅");
    loadStudents();

    // clear form
    document.getElementById("s_roll").value = "";
    document.getElementById("s_name").value = "";
    document.getElementById("s_pass").value = "";
  }
}

async function loadStudents() {
  const { data } = await supabaseClient.from("students").select("*");

  const tbody = document.getElementById("studentTbody");
  tbody.innerHTML = "";

  data.forEach(s => {
    tbody.innerHTML += `
      <tr>
        <td>${s.roll}</td>
        <td>${s.name}</td>
        <td>${s.class}</td>
        <td>
          <button onclick="deleteStudent('${s.roll}')">❌</button>
        </td>
      </tr>
    `;
  });
}

async function deleteStudent(roll) {
  await supabaseClient.from("students").delete().eq("roll", roll);
  loadStudents();
}

// ===============================
// RESULTS
// ===============================

async function addResult() {
  const result = {
    roll: document.getElementById("m_roll").value,
    subject: document.getElementById("m_subject").value,
    marks: document.getElementById("m_marks").value
  };

  await supabaseClient.from("results").insert([result]);

  alert("Result added ✅");
}

// ===============================
// TAB SWITCH
// ===============================

function showTab(tab, el) {
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  document.getElementById("tab-" + tab).classList.add("active");

  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
  el.classList.add("active");

  if (tab === "students") loadStudents();
}