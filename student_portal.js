/* =====================================================
   RKPH Student Portal — student_portal.js
   Functions only. Data is in rkph_data.js.
   
   Load order in student_portal.html:
     1. <script src="rkph_data.js"></script>   ← data
     2. <script src="student_portal.js"></script> ← functions
   ===================================================== */
'use strict';

/* ─── Auth state ─── */
let AUTH = { loggedIn: false, student: null };

/* ─── Timetable current class (default 11) ─── */
let curTTCls = 11;
let _tt = null;

/* ─── Calendar state ─── */
let calYear = new Date().getFullYear(), calMonth = new Date().getMonth();

document.addEventListener('DOMContentLoaded',()=>{
  if(!document.getElementById('spHeader')) return; // not student portal
  initHeader();
  lockAuthSections();
  initResults();
  initTimetable();
  renderFeeTable('all');
  renderCalendar();
  renderSubjBars();
  injectShakeCSS();
  const hash=window.location.hash.slice(1);
  if(hash && hash!=='login'){
    const el=document.getElementById(hash);
    if(el) setTimeout(()=>el.scrollIntoView({behavior:'smooth',block:'start'}),200);
  }
});

/* ═══════════════════════════════════
   HEADER / NAV
═══════════════════════════════════ */
function initHeader(){
  const hdr=document.getElementById('spHeader');
  window.addEventListener('scroll',()=>hdr.classList.toggle('scrolled',scrollY>50),{passive:true});
  document.querySelectorAll('.sp-nav-link').forEach(link=>{
    link.addEventListener('click',e=>{
      e.preventDefault();
      const sec=link.dataset.sec;
      const isAuth=link.classList.contains('sp-nav-auth');
      if(isAuth && !AUTH.loggedIn){
        showToast('Please log in to access this section','error');
        document.getElementById('login').scrollIntoView({behavior:'smooth',block:'start'});
        closeNav(); return;
      }
      const el=document.getElementById(sec);
      if(el) el.scrollIntoView({behavior:'smooth',block:'start'});
      closeNav();
    });
  });
  const obs=new IntersectionObserver(entries=>{
    entries.forEach(e=>{
      if(e.isIntersecting){
        const id=e.target.id;
        document.querySelectorAll('.sp-nav-link').forEach(l=>l.classList.toggle('active',l.dataset.sec===id));
      }
    });
  },{rootMargin:'-40% 0px -55% 0px'});
  document.querySelectorAll('.sp-section').forEach(s=>obs.observe(s));
}
window.toggleMobileNav=function(){
  document.getElementById('spHamburger').classList.toggle('open');
  document.getElementById('spNav').classList.toggle('open');
};
function closeNav(){
  document.getElementById('spHamburger').classList.remove('open');
  document.getElementById('spNav').classList.remove('open');
}

/* ═══════════════════════════════════
   AUTH GATE
═══════════════════════════════════ */
function lockAuthSections(){
  document.querySelectorAll('.sp-protected').forEach(s=>{s.style.display='none';s.classList.remove('revealed')});
  document.querySelectorAll('.sp-nav-auth').forEach(l=>l.classList.add('nav-locked'));
}
function unlockAuthSections(){
  document.querySelectorAll('.sp-protected').forEach(s=>{
    s.style.display='block'; void s.offsetHeight; s.classList.add('revealed');
  });
  document.querySelectorAll('.sp-nav-auth').forEach(l=>l.classList.remove('nav-locked'));
}

/* ═══════════════════════════════════
   LOGIN / LOGOUT
═══════════════════════════════════ */
window.togglePass=function(){
  const inp=document.getElementById('loginPass');
  const icon=document.getElementById('eyeIcon');
  const show=inp.type==='password';
  inp.type=show?'text':'password';
  icon.className=show?'fas fa-eye-slash':'fas fa-eye';
};

window.doLogin = async function() {
  const roll = document.getElementById('loginRoll').value.trim().toUpperCase();
  const pass = document.getElementById('loginPass').value.trim();

  if (!roll || !pass) {
    alert("Enter Roll Number and Password");
    return;
  }

  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('roll', roll)
    .single();

  if (error || !data) {
    alert("Student not found");
    return;
  }

  if (data.password !== pass) {
    alert("Wrong password");
    return;
  }

  AUTH = { loggedIn: true, student: data };

  loadFees(data.roll);
  loadAttendance(data.roll);

  document.getElementById('loginFormWrap').style.display = 'none';
  document.getElementById('loginDashboard').style.display = 'block';

  document.getElementById('dashName').textContent = data.name;
  document.getElementById('dashMeta').textContent =
    `${data.class} · Roll: ${data.roll}`;

  document.getElementById('spUserBadge').style.display = 'flex';
  document.getElementById('spUserName').textContent = data.name.split(' ')[0];

  unlockAuthSections();

  alert("Login successful 🚀");
};

window.doLogout=function(){
  AUTH={loggedIn:false,student:null};
  sessionStorage.removeItem('sp_roll');
  lockAuthSections();
  document.getElementById('loginFormWrap').style.display='flex';
  document.getElementById('loginDashboard').style.display='none';
  document.getElementById('loginRoll').value='';
  document.getElementById('loginPass').value='';
  document.getElementById('spUserBadge').style.display='none';
  document.getElementById('login').scrollIntoView({behavior:'smooth',block:'start'});
  showToast('Logged out successfully','info');
};
window.gotoSection=function(id){
  if(!AUTH.loggedIn){showToast('Please log in first','error');return}
  const el=document.getElementById(id);
  if(el) el.scrollIntoView({behavior:'smooth',block:'start'});
};

/* ═══════════════════════════════════
   RESULTS  (PUBLIC)
═══════════════════════════════════ */
const QUICK_SHORTCUTS=[
  {
    "cls": "11",
    "exam": "Annual 2024",
    "label": "Annual 2024",
    "sub": "Class 11 PCM (Physics-Chemistry-Maths)",
    "icon": "fas fa-trophy",
    "col": "var(--amber)"
  },
  {
    "cls": "11",
    "exam": "Half Yearly 2024",
    "label": "Half Yearly 2024",
    "sub": "Class 11 PCM (Physics-Chemistry-Maths)",
    "icon": "fas fa-trophy",
    "col": "var(--amber)"
  },
  {
    "cls": "10",
    "exam": "Annual 2024",
    "label": "Annual 2024",
    "sub": "Class 10 General",
    "icon": "fas fa-trophy",
    "col": "var(--amber)"
  }
];

let _currentResult=null;
function initResults(){
  const grid=document.getElementById('resQuickGrid');
  if(!grid) return;
  grid.innerHTML=QUICK_SHORTCUTS.map(r=>`
    <div class="g-card rq-item" onclick="loadQuick('${r.cls}','${r.exam}')">
      <i class="${r.icon}" style="color:${r.col}"></i>
      <div><strong>${r.label}</strong><p>${r.sub}</p></div>
      <i class="fas fa-arrow-right rq-arrow"></i>
    </div>`).join('');
}

window.searchResult = async function() {
  const query = document.getElementById('resQuery').value.trim().toUpperCase();

  if (!query) {
    alert("Enter roll number");
    return;
  }

  // 🔥 Supabase se results fetch
  const { data, error } = await supabase
    .from('results')
    .select('*')
    .eq('roll', query);

  if (error || !data || data.length === 0) {
    alert("No result found");
    return;
  }

  // 🎯 UI render karna
  const resultDiv = document.getElementById('resultOutput');
  
  let html = `<h3>Results for ${query}</h3><div class="marks">`;

  data.forEach(r => {
    html += `
      <div style="margin-bottom:10px;padding:10px;border:1px solid #ccc">
        <strong>${r.subject}</strong><br>
        Marks: ${r.marks} / ${r.max_marks}<br>
        Grade: ${r.grade}<br>
        Exam: ${r.exam}
      </div>
    `;
  });

  html += `</div>`;

  resultDiv.innerHTML = html;
  resultDiv.style.display = 'block';
};


window.loadQuick=function(cls,exam){
  document.getElementById('resClass').value=cls;
  document.getElementById('resExam').value=exam;
  document.getElementById('resQuery').value=Object.keys(STUDENTS)[0]||'';
  searchResult();
};
function renderResult(data,exam){
  _currentResult={data,exam};
  document.getElementById('resName').textContent=data.name;
  document.getElementById('resMeta').textContent=`${data.cls} – ${data.stream} · Roll: ${data.roll} · ${exam}`;
  document.getElementById('resPct').textContent=data.pct.toFixed(1)+'%';
  document.getElementById('resGrade').textContent='Grade '+data.grade;
  const GC={'A+':'var(--teal)','A':'var(--teal)','B+':'var(--amber)','B':'var(--amber)','C+':'var(--rose)','C':'var(--rose)'};
  document.getElementById('resMarksGrid').innerHTML=data.subjects.map(s=>{
    const p=Math.round(s.obt/s.mm*100);
    const c=p>=75?'var(--teal)':p>=55?'var(--amber)':'var(--rose)';
    return `<div class="g-card rmc">
      <div class="rmc-subj">${s.n}</div>
      <div class="rmc-bar-bg"><div class="rmc-bar" style="width:${p}%;background:${c}"></div></div>
      <div class="rmc-bottom">
        <span class="rmc-score">${s.obt}<small style="font-size:.7rem;opacity:.5"> / ${s.mm}</small></span>
        <span class="rmc-grade" style="color:${GC[s.g]||'var(--muted)'}">${s.g}</span>
      </div></div>`;
  }).join('');
  const pass=data.pct>=33;
  const cells=[
    ['Total Marks', data.total+' / '+data.mm],
    ['Percentage', data.pct.toFixed(1)+'%'],
    ['Grade', data.grade],
    ['Result', pass?'PASS':'FAIL', pass?'var(--teal)':'var(--rose)'],
    ['Class Rank', data.rank],
    ['Remarks', data.remarks],
  ];
  document.getElementById('resSummary').innerHTML=cells.map(([l,v,c])=>
    `<div class="rs-cell"><span>${l}</span><strong style="${c?'color:'+c:''}">${v}</strong></div>`
  ).join('');
  document.getElementById('resultOutput').style.display='block';
}
window.downloadMarksheet=function(){
  if(!_currentResult){showToast('No result to download','error');return}
  const {data,exam}=_currentResult;
  const rows=data.subjects.map(s=>`<tr><td>${s.n}</td><td style="text-align:center">${s.mm}</td><td style="text-align:center">${s.obt}</td><td style="text-align:center">${Math.round(s.obt/s.mm*100)}%</td><td style="text-align:center;font-weight:700">${s.g}</td></tr>`).join('');
  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Marksheet</title><style>body{font-family:Arial,sans-serif;max-width:760px;margin:40px auto;color:#111}.header{text-align:center;border-bottom:3px double #333;padding-bottom:16px;margin-bottom:24px}.header h1{font-size:22px;margin:0 0 4px}.info{display:grid;grid-template-columns:1fr 1fr;gap:8px;background:#f9f9f9;padding:14px;border-radius:6px;margin-bottom:24px}.info-row{font-size:14px}.info-row strong{display:inline-block;min-width:120px}table{width:100%;border-collapse:collapse;font-size:14px}th{background:#1a1a2e;color:#fff;padding:10px 12px;text-align:left}td{padding:9px 12px;border-bottom:1px solid #eee}.summary{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:#ddd;border:1px solid #ddd;margin-top:20px;border-radius:6px;overflow:hidden}.s-cell{background:#fff;padding:12px;text-align:center}.s-cell span{display:block;font-size:11px;color:#666;text-transform:uppercase;margin-bottom:4px}.s-cell strong{font-size:18px}.pass{color:#1a9e6b}.footer{margin-top:30px;text-align:center;font-size:12px;color:#888}</style></head><body><div class="header"><h1>Ram Krishna Paramhans Inter College</h1><h2 style="margin-top:8px;font-size:18px;font-weight:bold;color:#111">MARK SHEET — ${exam}</h2></div><div class="info"><div class="info-row"><strong>Student Name:</strong> ${data.name}</div><div class="info-row"><strong>Roll Number:</strong> ${data.roll}</div><div class="info-row"><strong>Class:</strong> ${data.cls} – ${data.stream}</div><div class="info-row"><strong>Examination:</strong> ${exam}</div><div class="info-row"><strong>Class Rank:</strong> ${data.rank}</div><div class="info-row"><strong>Remarks:</strong> ${data.remarks}</div></div><table><thead><tr><th>Subject</th><th style="text-align:center">Max</th><th style="text-align:center">Obtained</th><th style="text-align:center">%</th><th style="text-align:center">Grade</th></tr></thead><tbody>${rows}</tbody></table><div class="summary"><div class="s-cell"><span>Total</span><strong>${data.total} / ${data.mm}</strong></div><div class="s-cell"><span>Percentage</span><strong>${data.pct.toFixed(1)}%</strong></div><div class="s-cell"><span>Result</span><strong class="${data.pct>=33?'pass':'fail'}">${data.pct>=33?'PASS':'FAIL'}</strong></div></div><div class="footer">Generated ${new Date().toLocaleDateString('en-IN',{dateStyle:'long'})} · RKPH Inter College</div></body></html>`;
  triggerDownload(`Marksheet_${data.roll}_${exam.replace(/ /g,'_')}.html`,html);
  showToast('Marksheet downloaded!','success');
};
window.printMarksheet=function(){if(!_currentResult){showToast('Search a result first','error');return}window.print();};

/* ═══════════════════════════════════
   TIMETABLE
═══════════════════════════════════ */
function initTimetable(){
  document.getElementById('todayDateStr').textContent=
    new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  renderWeeklyTT(); renderExamTT(); renderTodaySlots();
  // Auto-refresh today's highlight every minute
  setInterval(renderTodaySlots, 60000);
}
window.switchTT=function(btn,tab){
  document.querySelectorAll('.tt-tab').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('ttWeeklyWrap').style.display=tab==='weekly'?'block':'none';
  document.getElementById('ttExamWrap').style.display=tab==='exam'?'block':'none';
};
window.changeTTClass=function(v){
  curTTCls=parseInt(v);
  renderWeeklyTT(); renderExamTT(); renderTodaySlots();
  const tt=TT_DATA[curTTCls]||TT_DATA[11];
  const hdr=document.querySelector('.tt-today-header h4');
  if(hdr) hdr.innerHTML=`<i class="fas fa-sun"></i> Today's Schedule <small style="font-weight:400;opacity:.6;font-size:.78em">— ${tt.label}</small>`;
};

/* ─── Parse period time to minutes since midnight ─── */
function parsePeriodMinutes(p){
  if(!p||p==='BREAK'||p==='LUNCH') return null;
  const m=p.match(/(\d+):(\d+)/);
  if(!m) return null;
  return parseInt(m[1])*60+parseInt(m[2]);
}
function getCurrentPeriodIdx(){
  const now=new Date();
  const nowMin=now.getHours()*60+now.getMinutes();
  for(let i=0;i<PERIODS.length;i++){
    const p=PERIODS[i];
    if(p==='BREAK'||p==='LUNCH') continue;
    const parts=p.split('–');
    if(parts.length<2) continue;
    const start=parsePeriodMinutes(parts[0]);
    const end=parsePeriodMinutes(parts[1]);
    if(start!==null&&end!==null&&nowMin>=start&&nowMin<=end) return i;
  }
  return -1;
}
function getNextPeriodIdx(){
  const now=new Date();
  const nowMin=now.getHours()*60+now.getMinutes();
  for(let i=0;i<PERIODS.length;i++){
    const p=PERIODS[i];
    if(p==='BREAK'||p==='LUNCH') continue;
    const start=parsePeriodMinutes(p.split('–')[0]);
    if(start!==null&&nowMin<start) return i;
  }
  return -1;
}

function renderWeeklyTT(){
  const tt=TT_DATA[curTTCls]||TT_DATA[11];
  const days=Object.keys(tt.days);
  const today=new Date().toLocaleDateString('en-IN',{weekday:'long'});
  const curIdx=getCurrentPeriodIdx();
  let html=`<thead><tr><th style="text-align:left;min-width:105px">Time</th>${days.map(d=>`<th class="${d===today?'tt-today-col':''}">${d}${d===today?' <span style="font-size:.6rem;color:var(--teal);font-weight:400">Today</span>':''}</th>`).join('')}</tr></thead><tbody>`;
  PERIODS.forEach((p,i)=>{
    if(p==='BREAK'||p==='LUNCH'){
      html+=`<tr><td colspan="${days.length+1}" class="tt-break-td">— ${p} —</td></tr>`;
    } else {
      const isCurrent=(i===curIdx);
      html+=`<tr class="${isCurrent?'tt-current-row':''}"><td class="tt-period-td${isCurrent?' tt-active-period':''}">${p}${isCurrent?' <span class="tt-now-badge">NOW</span>':''}</td>`;
      days.forEach(d=>{
        const s=tt.days[d][i];
        const isToday=d===today;
        html+=`<td style="background:${sc(s)};${isCurrent&&isToday?'font-weight:700;border:1.5px solid rgba(79,195,195,.5)':''}">${s||'—'}</td>`;
      });
      html+=`</tr>`;
    }
  });
  document.getElementById('weeklyTable').innerHTML=html+'</tbody>';
}
function renderExamTT(){
  const tt=TT_DATA[curTTCls]||TT_DATA[11];
  const today=new Date();
  let html=`<thead><tr><th>Date</th><th>Day</th><th>Subject</th><th>Time</th><th>Venue</th><th>Status</th></tr></thead><tbody>`;
  if(!tt.exam||!tt.exam.length){
    html+=`<tr><td colspan="6" style="text-align:center;opacity:.5;padding:1.5rem">No exam schedule available for ${tt.label}</td></tr>`;
  } else {
    tt.exam.forEach(e=>{
      // Parse date to check if past/today/upcoming
      const parts=e.date.split(' ');
      const months={'Jan':0,'Feb':1,'Mar':2,'Apr':3,'May':4,'Jun':5,'Jul':6,'Aug':7,'Sep':8,'Oct':9,'Nov':10,'Dec':11,'January':0,'February':1,'March':2,'April':3,'May':4,'June':5,'July':6,'August':7,'September':8,'October':9,'November':10,'December':11};
      const eDate=parts.length>=3?new Date(parseInt(parts[2]),months[parts[1]]||0,parseInt(parts[0])):null;
      const isPast=eDate&&eDate<today&&eDate.toDateString()!==today.toDateString();
      const isToday=eDate&&eDate.toDateString()===today.toDateString();
      const statusBadge=isToday?`<span style="color:var(--teal);font-weight:700">Today</span>`:isPast?`<span style="opacity:.45">Done</span>`:`<span style="color:var(--amber)">Upcoming</span>`;
      html+=`<tr style="${isPast?'opacity:.5':''}${isToday?';background:rgba(79,195,195,.07)':''}"><td><strong>${e.date}</strong></td><td>${e.day}</td><td style="background:${sc(e.sub)};font-weight:600">${e.sub}</td><td>${e.time}</td><td>${e.venue}</td><td>${statusBadge}</td></tr>`;
    });
  }
  document.getElementById('examTable').innerHTML=html+'</tbody>';
}
function renderTodaySlots(){
  const tt=TT_DATA[curTTCls]||TT_DATA[11];
  const DAYS=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const todayName=DAYS[new Date().getDay()];
  const sched=tt.days[todayName]||null;
  const curIdx=getCurrentPeriodIdx();
  const nextIdx=getNextPeriodIdx();
  let html='';
  if(!sched){
    html='<p style="opacity:.45;font-size:.87rem;padding:.5rem 0">No timetable data for today.</p>';
  } else {
    let hasSlots=false;
    sched.forEach((sub,i)=>{
      if(!sub)return;
      const p=PERIODS[i];
      if(!p||p==='BREAK'||p==='LUNCH')return;
      hasSlots=true;
      const isCurrent=(i===curIdx);
      const isNext=(i===nextIdx&&curIdx===-1||i===nextIdx&&i>curIdx);
      const teacher=(tt.teachers && tt.teachers[sub])||'';
      html+=`<div class="tt-slot${isCurrent?' tt-slot-active':isNext?' tt-slot-next':''}" style="border-left:3px solid ${isCurrent?'var(--teal)':isNext?'var(--amber)':sub==='Free Period'?'rgba(255,255,255,.15)':'rgba(79,195,195,.3)'}">
        <span class="tt-slot-time">${p}</span>
        <span class="tt-slot-sub" style="background:${sc(sub)}">${sub}</span>
        ${teacher?`<span class="tt-slot-teacher">${teacher}</span>`:''}
        ${isCurrent?'<span class="tt-slot-badge" style="color:var(--teal);font-size:.65rem;font-weight:700;margin-left:auto">▶ NOW</span>':''}
        ${isNext?'<span class="tt-slot-badge" style="color:var(--amber);font-size:.65rem;font-weight:700;margin-left:auto">NEXT</span>':''}
      </div>`;
    });
    if(!hasSlots) html='<p style="opacity:.45;font-size:.87rem;padding:.5rem 0">No classes today — enjoy your day!</p>';
  }
  document.getElementById('todaySchedule').innerHTML=html;
}
window.downloadTimetable=function(){
  const cls=parseInt(document.getElementById('ttClassSelect').value||'11');
  const tt=TT_DATA[cls]||TT_DATA[11];
  const days=Object.keys(tt.days);
  let rows='';
  PERIODS.forEach((p,i)=>{
    if(p==='BREAK'||p==='LUNCH'){rows+=`<tr><td colspan="${days.length+1}" style="text-align:center;background:#f0f0f0;color:#888;font-size:12px;padding:5px">${p}</td></tr>`;}
    else{rows+=`<tr><td style="font-size:12px;color:#666;white-space:nowrap">${p}</td>`;days.forEach(d=>{const s=tt.days[d][i];rows+=`<td style="text-align:center;font-weight:${s?'600':'400'}">${s||'—'}</td>`;});rows+='</tr>';}
  });
  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Timetable – ${tt.label}</title><style>body{font-family:Arial,sans-serif;max-width:960px;margin:30px auto;color:#111}.hdr{text-align:center;border-bottom:2px solid #333;padding-bottom:12px;margin-bottom:20px}.hdr h1{margin:0 0 4px;font-size:20px}.hdr p{margin:0;color:#555;font-size:14px}table{width:100%;border-collapse:collapse;font-size:13px}th{background:#1a1a2e;color:#fff;padding:9px 10px;text-align:center}td{padding:8px 10px;border:1px solid #ddd}.footer{margin-top:20px;text-align:center;font-size:12px;color:#999}</style></head><body><div class="hdr"><h1>Ram Krishna Paramhans Inter College</h1><p>Weekly Timetable — ${tt.label} | Academic Year 2025–26</p></div><table><thead><tr><th>Period / Time</th>${days.map(d=>`<th>${d}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table><div class="footer">Downloaded on ${new Date().toLocaleDateString('en-IN',{dateStyle:'long'})} · RKPH Inter College</div></body></html>`;
  triggerDownload(`Timetable_Class${cls}.html`,html);
  showToast('Timetable downloaded!','success');
};

/* ═══════════════════════════════════
   FEE TABLE
═══════════════════════════════════ */
window.filterFees=function(filter){renderFeeTable(filter);}
function genReceiptNo(roll,q,type,amt){
  let hash=0; const raw=roll+q+type+amt;
  for(let i=0;i<raw.length;i++) hash=((hash<<5)-hash)+raw.charCodeAt(i),hash|=0;
  return 'RKPH-'+(new Date().getFullYear())+'-'+(Math.abs(hash)%900000+100000);
}
function numberToWords(n){
  const a=['','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
  const b=['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
  n=parseInt(n)||0; if(n===0)return'zero';
  const t=n=>n<20?a[n]:b[Math.floor(n/10)]+(n%10?' '+a[n%10]:'');
  const h=n=>n>99?(a[Math.floor(n/100)]+' hundred'+(n%100?' '+t(n%100):'')):(n?t(n):'');
  if(n>=100000)return h(Math.floor(n/100000))+' lakh'+(n%100000?' '+h(Math.floor(n%100000/1000))+' thousand'+(n%1000?' '+h(n%1000):''):'');
  if(n>=1000)return h(Math.floor(n/1000))+' thousand'+(n%1000?' '+h(n%1000):'');
  return h(n);
}
/* ─── Fee due-date helpers ─── */
function feeDaysLeft(dueDateStr){
  if(!dueDateStr||dueDateStr==='—') return null;
  // Parse "05 Apr 2026" or "05 Apr 2025" format
  const months={Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11,
    January:0,February:1,March:2,April:3,May:4,June:5,July:6,August:7,September:8,October:9,November:10,December:11};
  const parts=dueDateStr.trim().split(/\s+/);
  if(parts.length<3) return null;
  const d=parseInt(parts[0]), m=months[parts[1]], y=parseInt(parts[2]);
  if(isNaN(d)||m===undefined||isNaN(y)) return null;
  const due=new Date(y,m,d);
  const today=new Date(); today.setHours(0,0,0,0);
  return Math.round((due-today)/(1000*60*60*24));
}
function dueDateBadge(daysLeft, status){
  if(status==='paid'||status==='upcoming') return '';
  if(daysLeft===null) return '';
  if(daysLeft<0) return `<span style="color:var(--rose);font-size:.68rem;font-weight:600;display:block">Overdue ${Math.abs(daysLeft)}d</span>`;
  if(daysLeft===0) return `<span style="color:var(--rose);font-size:.68rem;font-weight:700;display:block">Due Today!</span>`;
  if(daysLeft<=7) return `<span style="color:var(--amber);font-size:.68rem;font-weight:600;display:block">${daysLeft}d left</span>`;
  return `<span style="opacity:.45;font-size:.68rem;display:block">${daysLeft}d left</span>`;
}

function renderFeeTable(filter='all'){
  const tbody=document.getElementById('feeTableBody');
  if(!tbody)return;
  const roll=(AUTH.student && AUTH.student.roll)||'';
  const studentFees=FEES[roll]||[];
  const rows=filter==='all'?studentFees:studentFees.filter(f=>f.status===filter);
  tbody.innerHTML=rows.map(f=>{
    const rNo=f.status==='paid'?genReceiptNo(roll,f.q,f.type,f.amt):'—';
    const days=feeDaysLeft(f.due);
    const isOverdue=f.status==='pending'&&days!==null&&days<0;
    const stBadge=f.status==='paid'
      ?`<span class="fee-status-paid"><i class="fas fa-check-circle"></i> Paid</span>`
      :f.status==='pending'
      ?`<span class="fee-status-pending${isOverdue?' fee-overdue':''}"><i class="fas fa-exclamation-circle"></i> ${isOverdue?'Overdue':'Pending'}</span>`
      :`<span class="fee-status-upcoming"><i class="fas fa-clock"></i> Upcoming</span>`;
    const rCell=f.status==='paid'?`<span class="fee-receipt-no">${rNo}</span>`:`<span style="opacity:.3">—</span>`;
    const dueTd=`<td>${f.due}${f.status!=='paid'?dueDateBadge(days,f.status):''}</td>`;
    const act=f.status==='paid'
      ?`<button class="sp-btn-outline" style="padding:5px 11px;font-size:.74rem" onclick="downloadReceiptFor('${f.q}','${f.type}',${f.amt},'${f.paid}','${rNo}')"><i class="fas fa-receipt"></i> Receipt</button>`
      :f.status==='pending'
      ?`<button class="sp-btn-primary${isOverdue?' btn-urgent':''}" style="padding:5px 13px;font-size:.74rem" onclick="showToast('Payment gateway required for live use.','info')"><i class="fas fa-rupee-sign"></i> Pay${isOverdue?' Now':''}</button>`
      :`<span style="opacity:.3">—</span>`;
    return `<tr class="row-${f.status}${isOverdue?' row-overdue':''}"><td>${f.q}</td><td>${f.type}</td><td>₹${f.amt.toLocaleString('en-IN')}</td>${dueTd}<td>${f.paid}</td><td>${rCell}</td><td>${stBadge}</td><td>${act}</td></tr>`;
  }).join('');
  updateFeeStats(roll);
}
function updateFeeStats(roll){
  const studentFees=FEES[roll]||[];
  const totalPaid  =studentFees.filter(f=>f.status==='paid')   .reduce((s,f)=>s+f.amt,0);
  const totalPend  =studentFees.filter(f=>f.status==='pending').reduce((s,f)=>s+f.amt,0);
  const nextDue    =studentFees.find(f=>f.status==='pending'||f.status==='upcoming');
  const pendFees   =studentFees.filter(f=>f.status==='pending');
  const el=id=>document.getElementById(id);
  const st=AUTH.student;
  // Fee stat cards
  if(el('feeStatPaid'))    el('feeStatPaid').textContent    ='₹'+totalPaid.toLocaleString('en-IN');
  if(el('feeStatPending')) el('feeStatPending').textContent =totalPend>0?'₹'+totalPend.toLocaleString('en-IN'):'₹0';
  if(el('feeStatDue'))     el('feeStatDue').textContent     =nextDue?nextDue.due:'—';
  if(el('feeStatSession')) el('feeStatSession').textContent =(st && st.session)||'2024-25';
  if(el('feeScheduleLabel')) el('feeScheduleLabel').textContent=((st && st.session)||'2024-25')+((st && st.class)?' · '+st.class:'');
  // Fallback to CSS selectors if IDs missing
  const qPaid=el('feeStatPaid')||document.querySelector('.fee-stat.teal h3');
  const qPend=el('feeStatPending')||document.querySelector('.fee-stat.rose h3');
  const qDue =el('feeStatDue')||document.querySelector('.fee-stat.amber h3');
  if(qPaid&&!el('feeStatPaid'))    qPaid.textContent   ='₹'+totalPaid.toLocaleString('en-IN');
  if(qPend&&!el('feeStatPending')) qPend.textContent   =totalPend>0?'₹'+totalPend.toLocaleString('en-IN'):'₹0';
  if(qDue&&!el('feeStatDue'))      qDue.textContent    =nextDue?nextDue.due:'—';
  // Pay card
  const dueList=el('feeDueList');
  if(dueList) dueList.innerHTML=pendFees.length
    ?pendFees.map(f=>`<div class="fee-due-row"><span>${f.q} – ${f.type}</span><strong>₹${f.amt.toLocaleString('en-IN')}</strong></div>`).join('')
    :'<div class="fee-due-row"><span style="opacity:.5">No pending dues</span><strong>₹0</strong></div>';
  if(el('feeTotalDue')) el('feeTotalDue').textContent=totalPend>0?'₹'+totalPend.toLocaleString('en-IN'):'₹0';
  const payBtn=el('payNowBtn');
  if(payBtn) payBtn.innerHTML=totalPend>0?`<i class="fas fa-lock"></i> Pay ₹${totalPend.toLocaleString('en-IN')} Securely`:'<i class="fas fa-check-circle"></i> No Dues Pending';
  // Quick stats
  const myResults=Object.values(RESULTS).filter(r=>r.roll===roll).sort((a,b)=>b.pct-a.pct);
  if(el('qs-exam')){ el('qs-exam').textContent=myResults.length?myResults[0].pct.toFixed(1)+'%':'—'; el('qs-exam').className=myResults.length&&myResults[0].pct>=75?'teal':'rose'; }
  if(el('qs-rank')) el('qs-rank').textContent=myResults.length?myResults[0].rank||'—':'—';
  const {overall,present,absent,late,workingDays}=getAttSummary(roll);
  if(el('qs-att')){ el('qs-att').textContent=overall+'%'; el('qs-att').className=overall>=75?'teal':'rose'; }
  if(el('qs-fees')){ el('qs-fees').textContent=totalPend>0?'₹'+totalPend.toLocaleString('en-IN'):'₹0'; el('qs-fees').className=totalPend>0?'rose':'teal'; }
  const pendAssign=(ASSIGNS[roll]||[]).filter(a=>!a.done).length;
  if(el('qs-assign')){ el('qs-assign').textContent=pendAssign; el('qs-assign').className=pendAssign>0?'amber':'teal'; }
  if(el('attOverallPct')) el('attOverallPct').textContent=overall+'%';
  if(el('attPresent'))    el('attPresent').textContent=present;
  if(el('attAbsent'))     el('attAbsent').textContent=absent;
  if(el('attLate'))       el('attLate').textContent=late;
  if(el('attWorkingDays')) el('attWorkingDays').textContent=workingDays;
  // Notice badge
  const badge=el('noticeBadge');
  if(badge&&st){ const allN=getStudentNotices(st); const uc=allN.filter(n=>n.u).length; badge.style.display=uc>0?'inline-flex':'none'; badge.textContent=uc+' Urgent'; }
}
window.downloadFeeStatement=function(){
  const st=AUTH.student;
  if(!st)return;
  const studentFees=FEES[st.roll]||[];
  const rows=studentFees.map(f=>`<tr><td>${f.q}</td><td>${f.type}</td><td>₹${f.amt.toLocaleString('en-IN')}</td><td>${f.due}</td><td>${f.paid}</td><td style="font-weight:600;color:${f.status==='paid'?'#1a9e6b':f.status==='pending'?'#c0392b':'#e67e22'}">${f.status.toUpperCase()}</td></tr>`).join('');
  const totalPaid=studentFees.filter(f=>f.status==='paid').reduce((s,f)=>s+f.amt,0);
  const totalPending=studentFees.filter(f=>f.status==='pending').reduce((s,f)=>s+f.amt,0);
  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Fee Statement – ${st.name}</title><style>body{font-family:Arial,sans-serif;max-width:800px;margin:40px auto;color:#111}.hdr{text-align:center;border-bottom:2px solid #333;padding-bottom:14px;margin-bottom:22px}.hdr h1{font-size:20px;margin:0 0 4px}.info{display:grid;grid-template-columns:1fr 1fr;gap:8px;background:#f9f9f9;padding:12px;border-radius:6px;margin-bottom:20px}.info div{font-size:13px}.info strong{min-width:110px;display:inline-block}table{width:100%;border-collapse:collapse;font-size:13px}th{background:#1a1a2e;color:#fff;padding:9px 11px;text-align:left}td{padding:8px 11px;border-bottom:1px solid #eee}.summary{display:flex;gap:20px;margin-top:18px}.sum-card{flex:1;padding:12px;border-radius:6px;text-align:center}.sum-card span{display:block;font-size:11px;color:#666;text-transform:uppercase;margin-bottom:4px}.sum-card strong{font-size:18px}.paid-card{background:#e8faf3;border:1px solid #1a9e6b}.paid-card strong{color:#1a9e6b}.pend-card{background:#fde8e8;border:1px solid #c0392b}.pend-card strong{color:#c0392b}.footer{margin-top:24px;text-align:center;font-size:12px;color:#888}</style></head><body><div class="hdr"><h1>Ram Krishna Paramhans Inter College</h1><p>Fee Statement — Academic Year 2025–26</p></div><div class="info"><div><strong>Student Name:</strong> ${st.name}</div><div><strong>Roll Number:</strong> ${st.roll}</div><div><strong>Class:</strong> ${st.class} – ${st.stream}</div><div><strong>Generated On:</strong> ${new Date().toLocaleDateString('en-IN',{dateStyle:'long'})}</div></div><table><thead><tr><th>Quarter</th><th>Fee Type</th><th>Amount</th><th>Due Date</th><th>Paid On</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table><div class="summary"><div class="sum-card paid-card"><span>Total Paid</span><strong>₹${totalPaid.toLocaleString('en-IN')}</strong></div><div class="sum-card pend-card"><span>Pending Dues</span><strong>₹${totalPending.toLocaleString('en-IN')}</strong></div></div><div class="footer">Ram Krishna Paramhans Inter College · Nagal, Saharanpur</div></body></html>`;
  triggerDownload(`Fee_Statement_${st.roll}.html`,html);
  showToast('Fee statement downloaded!','success');
};
window.downloadReceiptFor=function(q,type,amt,paidOn,rNo){
  if(!AUTH.loggedIn){showToast('Please log in first','error');return}
  const st=AUTH.student;
  const receiptNo=rNo||genReceiptNo(st.roll,q,type,amt);
  const printDate=new Date().toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'});
  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Receipt – ${receiptNo}</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Arial,sans-serif;background:#f5f5f5;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px}.receipt{background:#fff;max-width:520px;width:100%;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.12)}.rec-header{background:linear-gradient(135deg,#0f3460,#1a1a2e);color:#fff;padding:24px;text-align:center}.rec-header h1{font-size:16px;font-weight:700;letter-spacing:.05em;margin-bottom:3px}.rec-header p{font-size:11px;opacity:.7;line-height:1.5}.rec-body{padding:20px 24px}.rec-no-box{background:#f0f7ff;border:1px dashed #b3d4f5;border-radius:8px;padding:10px 16px;display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;font-size:12px}.rec-no-box strong{font-family:'Courier New',monospace;font-size:13px;color:#0f3460;letter-spacing:.05em}.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:18px}.info-item label{font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#888;display:block;margin-bottom:2px}.info-item span{font-size:13px;font-weight:600;color:#222}.amount-box{background:linear-gradient(135deg,#1a9e6b,#117a55);color:#fff;border-radius:10px;padding:20px;text-align:center;margin-bottom:18px}.amount-box .label{font-size:11px;opacity:.8;margin-bottom:6px;text-transform:uppercase;letter-spacing:.08em}.amount-box .value{font-size:32px;font-weight:800}.amount-box .words{font-size:11px;opacity:.75;margin-top:4px}.stamp-row{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:16px}.stamp{border:2px solid #1a9e6b;color:#1a9e6b;padding:6px 18px;border-radius:6px;font-size:13px;font-weight:700;transform:rotate(-5deg);display:inline-block}.signature{text-align:right;font-size:11px;color:#888}.signature .line{border-top:1px solid #ccc;width:120px;margin:8px 0 3px auto}.footer{background:#f8f8f8;border-top:1px solid #eee;padding:12px 24px;text-align:center;font-size:10px;color:#aaa}@media print{body{background:#fff;padding:0}.receipt{box-shadow:none;border-radius:0;max-width:100%}}</style></head>
<body><div class="receipt">
<div class="rec-header"><h1>RAM KRISHNA PARAMHANS INTER COLLEGE</h1><p>Bajaj Bagh, Nangal, Saharanpur, UP 247551 · Phone: +91 95571 45962<br>Affiliated to UP Board</p></div>
<div class="rec-body">
<div class="rec-no-box"><span>Receipt No: <strong>${receiptNo}</strong></span><span>Date: ${paidOn||printDate}</span></div>
<div class="info-grid">
<div class="info-item"><label>Student Name</label><span>${st.name}</span></div>
<div class="info-item"><label>Roll Number</label><span>${st.roll}</span></div>
<div class="info-item"><label>Class</label><span>${st.class}${st.stream?' – '+st.stream:''}</span></div>
<div class="info-item"><label>Section</label><span>${st.section||'A'}</span></div>
<div class="info-item"><label>Fee Quarter</label><span>${q}</span></div>
<div class="info-item"><label>Fee Type</label><span>${type}</span></div>
<div class="info-item"><label>Session</label><span>${st.session||'2024-25'}</span></div>
<div class="info-item"><label>Payment Date</label><span>${paidOn||'—'}</span></div>
</div>
<div class="amount-box"><div class="label">Amount Received</div><div class="value">₹${Number(amt).toLocaleString('en-IN')}</div><div class="words">(Rupees ${numberToWords(amt)} Only)</div></div>
<div class="stamp-row"><div class="stamp">✓ PAID</div><div class="signature"><div class="line"></div><div>Authorised Signatory</div><div style="font-size:10px;margin-top:2px">RKPH Inter College</div></div></div>
</div>
<div class="footer">Computer-generated receipt · Valid without signature · Generated on ${printDate}</div>
</div></body></html>`;
  triggerDownload('Receipt_'+receiptNo+'.html',html);
  showToast('Receipt downloaded!','success');
};
window.downloadReceipt=window.downloadReceiptFor; // backward compat

window.downloadAllReceipts=function(){
  if(!AUTH.loggedIn){showToast('Please log in first','error');return}
  const st=AUTH.student;
  const paid=(FEES[st.roll]||[]).filter(f=>f.status==='paid');
  if(!paid.length){showToast('No paid fee records found.','info');return}
  const printDate=new Date().toLocaleDateString('en-IN',{dateStyle:'long'});
  const rows=paid.map(f=>{const rNo=genReceiptNo(st.roll,f.q,f.type,f.amt);return`<tr><td><span style="font-family:monospace;font-size:12px;color:#0f3460">${rNo}</span></td><td>${f.q}</td><td>${f.type}</td><td style="text-align:right">₹${f.amt.toLocaleString('en-IN')}</td><td>${f.paid}</td><td style="color:#1a9e6b;font-weight:600">PAID</td></tr>`;}).join('');
  const total=paid.reduce((s,f)=>s+f.amt,0);
  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>All Receipts – ${st.name}</title><style>body{font-family:Arial,sans-serif;max-width:720px;margin:30px auto;color:#111}.hdr{text-align:center;border-bottom:2px solid #1a1a2e;padding-bottom:14px;margin-bottom:20px}table{width:100%;border-collapse:collapse;font-size:13px}th{background:#1a1a2e;color:#fff;padding:9px 12px;text-align:left}td{padding:9px 12px;border-bottom:1px solid #eee}tr:nth-child(even) td{background:#f8f8f8}.total{text-align:right;font-size:15px;font-weight:700;margin-top:12px}.footer{margin-top:20px;text-align:center;font-size:11px;color:#aaa}</style></head><body><div class="hdr"><h1>Ram Krishna Paramhans Inter College</h1><p>All Receipts · ${st.name} · Roll: ${st.roll} · ${st.class} · Session: ${st.session||'2024-25'}</p></div><table><thead><tr><th>Receipt No.</th><th>Quarter</th><th>Fee Type</th><th style="text-align:right">Amount</th><th>Paid On</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table><div class="total">Total Paid: ₹${total.toLocaleString('en-IN')}</div><div class="footer">Generated on ${printDate} · RKPH Inter College Student Portal</div></body></html>`;
  triggerDownload('All_Receipts_'+st.roll+'.html',html);
  showToast(paid.length+' receipts downloaded!','success');
};;

/* ═══════════════════════════════════
   ATTENDANCE
═══════════════════════════════════ */
window.changeMonth=function(d){
  calMonth+=d;
  if(calMonth<0){calMonth=11;calYear--}
  if(calMonth>11){calMonth=0;calYear++}
  renderCalendar();
};
/* ─── Attendance helpers ─── */
function getAttSummary(roll){
  const rollData=ATTENDANCE[roll]||{};
  let present=0,absent=0,late=0,total=0;
  Object.values(rollData).forEach(mdata=>{
    if(typeof mdata!=='object')return;
    Object.values(mdata).forEach(s=>{
      total++;
      if(s==='present')present++;
      else if(s==='absent')absent++;
      else if(s==='late')late++;
    });
  });
  const overall=total>0?Math.round((present+late*0.5)/total*100):0;
  return{present,absent,late,total,overall,workingDays:present+absent+late};
}

function renderCalendar(){
  const MN=['January','February','March','April','May','June','July','August','September','October','November','December'];
  const DAYS=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  document.getElementById('calMonthTitle').textContent=`${MN[calMonth]} ${calYear}`;
  const fd=new Date(calYear,calMonth,1).getDay();
  const dim=new Date(calYear,calMonth+1,0).getDate();
  const now=new Date();
  const isNow=now.getFullYear()===calYear&&now.getMonth()===calMonth;
  const roll=(AUTH.student && AUTH.student.roll)||'';
  const mk=`${calYear}-${calMonth}`;
  const monthData=(ATTENDANCE[roll]||{})[mk]||{};
  // month stats
  let mp=0,ma=0,ml=0;
  Object.values(monthData).forEach(s=>{ if(s==='present')mp++; else if(s==='absent')ma++; else if(s==='late')ml++; });
  let html='';
  for(let i=0;i<fd;i++) html+='<div class="cal-cell empty"></div>';
  for(let d=1;d<=dim;d++){
    const s=monthData[String(d)]||monthData[d]||'';
    const dayName=DAYS[new Date(calYear,calMonth,d).getDay()];
    const isSun=new Date(calYear,calMonth,d).getDay()===0;
    const title=s?`${dayName} ${d} — ${s.charAt(0).toUpperCase()+s.slice(1)}`:(isSun?`${dayName} — Sunday`:`${dayName} ${d} — Not marked`);
    html+=`<div class="cal-cell ${s?'cal-'+s:''} ${isNow&&d===now.getDate()?'cal-today':''}" title="${title}" style="${isSun&&!s?'opacity:.3':''}">${d}</div>`;
  }
  document.getElementById('calBody').innerHTML=html;
  // Update month bar if elements exist
  const ge=id=>document.getElementById(id);
  const mTotal=mp+ma+ml;
  const mPct=mTotal>0?Math.round((mp+ml*0.5)/mTotal*100):0;
  const pCol=mPct>=75?'var(--teal)':mPct>=50?'var(--amber)':'var(--rose)';
  if(ge('attMonthBarLabel')) ge('attMonthBarLabel').textContent=`${MN[calMonth]} ${calYear}`;
  if(ge('attMonthBarPct')){ ge('attMonthBarPct').textContent=mTotal>0?mPct+'%':'No data'; ge('attMonthBarPct').style.color=pCol; }
  if(ge('attMonthBarFill')){ ge('attMonthBarFill').style.width=mTotal>0?(mp/Math.max(dim,1)*100)+'%':'0%'; ge('attMonthBarFill').style.background=pCol; }
  if(ge('attMonthBarAbsent')) ge('attMonthBarAbsent').style.width=mTotal>0?(ma/Math.max(dim,1)*100)+'%':'0%';
  if(ge('attMonthPresent')) ge('attMonthPresent').textContent=mp;
  if(ge('attMonthAbsent'))  ge('attMonthAbsent').textContent=ma;
  if(ge('attMonthLate'))    ge('attMonthLate').textContent=ml;
}
function renderSubjBars(){
  const roll=(AUTH.student && AUTH.student.roll)||'';
  const {present,absent,late,total,overall,workingDays}=getAttSummary(roll);
  const el=document.getElementById('subjAttendList');
  if(!el)return;
  const working=present+absent+late;

  if(working===0){
    el.innerHTML='<p style="opacity:.45;font-size:.85rem">No attendance records yet. Records appear once the admin marks daily attendance.</p>';
  } else {
    el.innerHTML=[['Present',present,'var(--teal)'],['Absent',absent,'var(--rose)'],['Late / Half-day',late,'var(--amber)']].map(([lbl,val,col])=>{
      const p=working>0?Math.round(val/working*100):0;
      return `<div class="subj-row"><div class="subj-name">${lbl}</div><div class="subj-bar-bg"><div class="subj-bar" style="width:${p}%;background:${col}"></div></div><div class="subj-pct" style="color:${col}">${p}%</div><div class="subj-days">${val}d</div></div>`;
    }).join('');
  }

  // Stat elements
  const ge=id=>document.getElementById(id);
  if(ge('attOverallPct')) ge('attOverallPct').textContent=overall+'%';
  if(ge('attPresent'))    ge('attPresent').textContent=present;
  if(ge('attAbsent'))     ge('attAbsent').textContent=absent;
  if(ge('attLate'))       ge('attLate').textContent=late;
  if(ge('attWorkingDays')) ge('attWorkingDays').textContent=workingDays;

  // Donut
  const circle=document.querySelector('.att-donut circle:nth-child(2)');
  if(circle){
    const r=42,circ=2*Math.PI*r;
    circle.setAttribute('stroke-dashoffset',(circ*(1-overall/100)).toFixed(1));
    circle.setAttribute('stroke',overall>=75?'var(--teal)':overall>=50?'var(--amber)':'var(--rose)');
  }
  const minNote=ge('attMinNote')||document.querySelector('.att-min-note');
  if(minNote) minNote.style.color=overall<75?'var(--rose)':'var(--muted)';

  // Warning banner with days-needed calculator
  const banner=ge('attWarningBanner');
  const warnText=ge('attWarningText');
  if(banner&&working>0){
    if(overall<75){
      banner.style.display='flex';
      // How many consecutive present days to reach 75%?
      let needed=0;
      let sim=present+late*0.5;
      let simTotal=working;
      while(simTotal<500&&(simTotal===0||sim/simTotal<0.75)){ sim++; simTotal++; needed++; }
      if(warnText) warnText.textContent=`⚠ Attendance ${overall}% — below 75% minimum. You need to attend ${needed} more consecutive day${needed!==1?'s':''} to meet the requirement.`;
    } else {
      banner.style.display='none';
    }
  }

  // Days-can-miss calculator (shown when above 75%)
  const safeCard=ge('attSafeCard');
  if(safeCard&&working>0){
    if(overall>=75){
      // How many days can be missed while staying ≥75%?
      let canMiss=0;
      let sim=present+late*0.5;
      let simTotal=working;
      while(simTotal<500&&simTotal>0&&(sim/(simTotal+1))>=0.75){ simTotal++; canMiss++; }
      safeCard.style.display='flex';
      safeCard.innerHTML=`<i class="fas fa-shield-alt"></i> You can miss up to <strong style="margin:0 4px">${canMiss} more day${canMiss!==1?'s':''}</strong> and still maintain 75% attendance.`;
      safeCard.className='att-needed-card safe';
    } else {
      safeCard.style.display='none';
    }
  }

  // Month history
  if(typeof renderMonthHistory==='function') renderMonthHistory(roll);
}

function renderMonthHistory(roll){
  const el=document.getElementById('attMonthHistory');
  if(!el)return;
  const rollData=ATTENDANCE[roll]||{};
  const MN=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const rows=Object.entries(rollData).sort(([a],[b])=>a.localeCompare(b)).map(([mk,mdata])=>{
    const [yr,moStr]=mk.split('-'); const mo=parseInt(moStr);
    const mp=Object.values(mdata).filter(v=>v==='present').length;
    const ma=Object.values(mdata).filter(v=>v==='absent').length;
    const ml=Object.values(mdata).filter(v=>v==='late').length;
    const mh=Object.values(mdata).filter(v=>v==='holiday').length;
    const mt=mp+ma+ml;
    const pct=mt>0?Math.round((mp+ml*0.5)/mt*100):0;
    const col=pct>=75?'var(--teal)':pct>=50?'var(--amber)':'var(--rose)';
    const monthLabel=`${MN[mo]||mo} ${yr}`;
    return `<div class="att-mh-row" title="${mp} present · ${ma} absent · ${ml} late · ${mh} holiday">
      <span class="att-mh-month">${monthLabel}</span>
      <div class="att-mh-bar-track"><div class="att-mh-bar-fill" style="width:${pct}%;background:${col}"></div></div>
      <span class="att-mh-pct" style="color:${col}">${mt>0?pct+'%':'—'}</span>
    </div>`;
  });
  el.innerHTML=rows.length?rows.join(''):'<p style="opacity:.4;font-size:.8rem">No monthly data yet.</p>';
}

window.downloadAttendance=function(){
  if(!AUTH.loggedIn){showToast('Please log in first','error');return}
  const st=AUTH.student;
  const {present,absent,late,workingDays,overall}=getAttSummary(st.roll);
  if(workingDays===0){showToast('No attendance data available','info');return}
  const rollData=ATTENDANCE[st.roll]||{};
  const MN=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const monthRows=Object.entries(rollData).sort(([a],[b])=>a.localeCompare(b)).map(([mk,mdata])=>{
    const [yr,moStr]=mk.split('-'); const mo=parseInt(moStr);
    const mp=Object.values(mdata).filter(v=>v==='present').length;
    const ma=Object.values(mdata).filter(v=>v==='absent').length;
    const ml=Object.values(mdata).filter(v=>v==='late').length;
    const mh=Object.values(mdata).filter(v=>v==='holiday').length;
    const mt=mp+ma+ml;
    const pct=mt>0?Math.round((mp+ml*0.5)/mt*100):0;
    const col=pct>=75?'#1a9e6b':pct>=50?'#e67e22':'#c0392b';
    return `<tr><td>${MN[mo]||mo} ${yr}</td><td style="text-align:center">${mp}</td><td style="text-align:center;color:#c0392b">${ma}</td><td style="text-align:center;color:#e67e22">${ml}</td><td style="text-align:center;color:#888">${mh}</td><td style="text-align:center">${mt}</td><td style="text-align:center;font-weight:700;color:${col}">${mt>0?pct+'%':'—'}</td></tr>`;
  }).join('');
  const printDate=new Date().toLocaleDateString('en-IN',{dateStyle:'long'});
  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Attendance – ${st.name}</title>
<style>body{font-family:Arial,sans-serif;max-width:760px;margin:40px auto;color:#111}
.hdr{text-align:center;border-bottom:2px solid #1a1a2e;padding-bottom:14px;margin-bottom:22px}
.hdr h1{font-size:20px;margin:0 0 4px}.hdr p{margin:0;color:#555;font-size:13px}
.summary{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:22px}
.sb{padding:12px;background:#f5f5f5;border-radius:6px;text-align:center}
.sb span{display:block;font-size:11px;color:#666;text-transform:uppercase;margin-bottom:4px}
.sb strong{font-size:22px;font-weight:700}
.note{background:${overall>=75?'#e8faf3':'#fde8e8'};border:1px solid ${overall>=75?'#1a9e6b':'#c0392b'};border-radius:6px;padding:10px 14px;font-size:13px;color:${overall>=75?'#1a9e6b':'#c0392b'};margin-bottom:20px;font-weight:500}
table{width:100%;border-collapse:collapse;font-size:13px}
th{background:#1a1a2e;color:#fff;padding:9px 12px;text-align:left}
td{padding:9px 12px;border-bottom:1px solid #eee}
tr:nth-child(even) td{background:#f8f8f8}
.footer{margin-top:24px;text-align:center;font-size:12px;color:#888}</style></head>
<body>
<div class="hdr"><h1>Ram Krishna Paramhans Inter College</h1>
<p>Attendance Report · ${st.name} · Roll: ${st.roll} · ${st.class}${st.stream?' – '+st.stream:''} · Session ${st.session||'2025-26'}</p></div>
<div class="summary">
  <div class="sb"><span>Overall</span><strong style="color:${overall>=75?'#1a9e6b':'#c0392b'}">${overall}%</strong></div>
  <div class="sb"><span>Present</span><strong style="color:#1a9e6b">${present}</strong></div>
  <div class="sb"><span>Absent</span><strong style="color:#c0392b">${absent}</strong></div>
  <div class="sb"><span>Late</span><strong style="color:#e67e22">${late}</strong></div>
</div>
<div class="note">${overall>=75?`✓ Attendance ${overall}% — meets the 75% minimum requirement.`:`⚠ Attendance ${overall}% — below the 75% minimum. Immediate improvement required.`}</div>
<table><thead><tr><th>Month</th><th style="text-align:center">Present</th><th style="text-align:center">Absent</th><th style="text-align:center">Late</th><th style="text-align:center">Holiday</th><th style="text-align:center">Working Days</th><th style="text-align:center">%</th></tr></thead>
<tbody>${monthRows||'<tr><td colspan="7" style="text-align:center;opacity:.5">No monthly data available</td></tr>'}</tbody></table>
<div class="footer">Generated on ${printDate} · Ram Krishna Paramhans Inter College Student Portal</div>
</body></html>`;
  triggerDownload(`Attendance_${st.roll}_${st.session||'2025-26'}.html`,html);
  showToast('Attendance report downloaded!','success');
};

/* ═══════════════════════════════════
   PORTAL / PROFILE
═══════════════════════════════════ */

/* ─── Per-student Academic History ─── */

function getStudentNotices(st){
  // global notices + class-specific + private notices for this student
  const global  = (NOTICES.global||[]);
  const classSt = (NOTICES.class||{})[st.class]||[];
  const priv    = (NOTICES.private||{})[st.roll]||[];
  return {global, classSt, priv};
}

function getStudentAttendanceSummary(roll){
  const rollData = ATTENDANCE[roll]||{};
  let present=0, absent=0, late=0, total=0;
  Object.values(rollData).forEach(mdata=>{
    if(typeof mdata!=='object') return;
    Object.values(mdata).forEach(s=>{
      total++; if(s==='present')present++; else if(s==='absent')absent++; else if(s==='late')late++;
    });
  });
  const overall = total>0 ? Math.round((present+late*0.5)/total*100) : 0;
  return {present, absent, late, total, overall};
}

function populatePortal(st){
  document.getElementById('ppcName').textContent   = st.name;
  document.getElementById('ppcRoll').textContent   = 'Roll No: '+st.roll;
  document.getElementById('ppcTags').innerHTML     = `<span>${st.class}</span><span>${st.stream||'General'}</span><span>Section ${st.section}</span>${st.session?'<span style="opacity:.7">'+st.session+'</span>':''}`;
  document.getElementById('ppcDob').textContent    = st.dob||'—';
  document.getElementById('ppcPhone').textContent  = st.phone||'—';
  document.getElementById('ppcEmail').textContent  = st.email||'—';
  document.getElementById('ppcAddr').textContent   = st.address||'—';
  document.getElementById('ppcFather').textContent = 'Father: '+(st.father||'—');
  document.getElementById('ppcFPhone').textContent = st.fatherPhone||'—';

  // Notices: global + class + private combined
  const {global, classSt, priv} = getStudentNotices(st);
  const allNotices = [
    ...priv.map(n=>({...n, isPrivate:true})),
    ...classSt.map(n=>({...n, isClass:true})),
    ...global
  ];
  document.getElementById('noticeList').innerHTML = allNotices.length
    ? allNotices.map(note=>`
    <div class="notice-item ${note.u?'urgent':''}" ${note.isPrivate?'style="border-color:rgba(245,200,66,0.3)"':''}>
      <div class="ni-dot" style="background:${note.isPrivate?'var(--amber)':note.u?'var(--rose)':'var(--teal)'}"></div>
      <div class="ni-body"><strong>${note.t}</strong><span>${note.d||''} ${note.isPrivate?'<span style=\"color:var(--amber);font-size:.7rem\">🔒 Private</span>':note.isClass?'<span style=\"font-size:.7rem;opacity:.6\">· '+st.class+'</span>':''}</span></div>
      <span class="ni-tag">${note.tag||''}</span>
    </div>`).join('')
    : '<p style="opacity:.45;font-size:.85rem">No notices at the moment.</p>';

  // Assignments
  const myAssigns=(ASSIGNS[st.roll]||[]).filter(a=>!a.session||a.session===(AUTH.student && AUTH.student.currentSession)||true);
  document.getElementById('assignList').innerHTML = myAssigns.length
    ? myAssigns.map(a=>`
    <div class="assign-item">
      <span class="ai-sub">${a.sub}</span>
      <span class="ai-title">${a.t}</span>
      <span class="ai-due"><i class="fas fa-calendar-alt" style="opacity:.5"></i> ${a.due}</span>
      <span class="ai-status ${a.done?'done':''}">
        <i class="fas fa-${a.done?'check-circle':'clock'}"></i> ${a.done?'Submitted':'Pending'}
      </span>
    </div>`).join('')
    : '<p style="opacity:.45;font-size:.85rem;padding:.4rem 0">No assignments at the moment.</p>';

  renderSubjBars();
  updateAttendanceStats(st.roll);

  renderAcademicTimeline(st.roll);
}

/* ─── Academic Journey Timeline ─── */
function renderAcademicTimeline(roll){
  const card=document.getElementById('portalHistoryCard');
  const tl=document.getElementById('academicTimeline');
  const chip=document.getElementById('historyYearsChip');
  const hist=HISTORY[roll]||[];
  if(!card||!tl)return;
  if(hist.length<=1){card.style.display='none';return;}
  card.style.display='block';
  const passed=hist.filter(h=>h.status==='Passed').length;
  if(chip) chip.textContent=passed+' Year'+(passed!==1?'s':'')+' Completed';
  tl.innerHTML=hist.map((h,i)=>{
    const isLast=i===hist.length-1;
    const isPassed=h.status==='Passed';
    const isIP=h.status==='In Progress';
    const dotCol=isPassed?'var(--teal)':isIP?'var(--amber)':'var(--muted)';
    const gradeCol=h.pct>=75?'var(--teal)':h.pct>=50?'var(--amber)':'var(--rose)';
    return `<div class="atl-item${isLast?' atl-current':''}">
      <div class="atl-left">
        <div class="atl-dot" style="background:${dotCol}"><i class="fas fa-${isPassed?'check':isIP?'circle-notch fa-spin':'arrow-right'}" style="font-size:.55rem;color:#fff"></i></div>
        ${!isLast?'<div class="atl-line"></div>':''}
      </div>
      <div class="atl-body">
        <div class="atl-head"><span class="atl-cls">${h.class}</span><span class="atl-session">${h.session}</span><span class="atl-status" style="color:${dotCol}">${h.status}</span></div>
        <div class="atl-sub">${h.stream||'General'}</div>
        ${isPassed?`<div class="atl-grade" style="color:${gradeCol}">Grade ${h.grade} · ${h.pct}%</div>`:''}
        ${isIP?'<div class="atl-grade" style="color:var(--amber)"><i class="fas fa-book-open" style="font-size:.75rem"></i> Currently enrolled</div>':''}
      </div>
    </div>`;
  }).join('');
}

function updateAttendanceStats(roll){
  const {present, absent, late, overall} = getAttSummary(roll);
  const ge = id => document.getElementById(id);
  if(ge('attOverallPct'))  ge('attOverallPct').textContent  = overall+'%';
  if(ge('attPresent'))     ge('attPresent').textContent     = present;
  if(ge('attAbsent'))      ge('attAbsent').textContent      = absent;
  if(ge('attLate'))        ge('attLate').textContent        = late;
  if(ge('attWorkingDays')) ge('attWorkingDays').textContent = present+absent+late;
  // donut
  const circle = document.querySelector('.att-donut circle:nth-child(2)');
  if(circle){
    const r=42, circ=2*Math.PI*r;
    circle.setAttribute('stroke-dashoffset', (circ*(1-overall/100)).toFixed(1));
    circle.setAttribute('stroke', overall>=75?'var(--teal)':overall>=50?'var(--amber)':'var(--rose)');
  }
  const minNote = document.querySelector('.att-min-note');
  if(minNote) minNote.style.color = overall<75?'var(--rose)':'var(--muted)';
  // warning banner
  const banner = ge('attWarningBanner');
  if(banner && (present+absent+late)>0){
    banner.style.display = overall<75 ? 'flex' : 'none';
  }
}
window.downloadIDCard=function(){
  if(!AUTH.loggedIn){showToast('Please log in first','error');return}
  const st=AUTH.student;
  const today=new Date().toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'});
  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>ID Card – ${st.name}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;background:#e8ecf0;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px}
.card-wrap{display:flex;gap:16px;flex-wrap:wrap;justify-content:center}
.card{width:320px;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,.18)}
.front{background:linear-gradient(145deg,#0f3460,#1a1a2e);color:#fff}
.back{background:#fff;color:#111}
.card-top{background:linear-gradient(135deg,#16213e,#0f3460);padding:14px 18px;display:flex;align-items:center;gap:10px;border-bottom:2px solid #4dc3c3}
.card-top h1{font-size:11px;font-weight:700;letter-spacing:.04em;line-height:1.4;text-transform:uppercase}
.logo-circle{width:38px;height:38px;background:#4dc3c3;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:15px;font-weight:900;color:#0f3460}
.card-body{padding:16px 18px}
.photo-row{display:flex;gap:14px;align-items:flex-start;margin-bottom:14px}
.photo{width:70px;height:82px;background:rgba(255,255,255,.12);border:2px solid rgba(255,255,255,.2);border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:28px;color:rgba(255,255,255,.5)}
.info-rows{flex:1}
.info-row{margin-bottom:7px}
.info-row .lbl{font-size:9px;text-transform:uppercase;letter-spacing:.06em;opacity:.6;margin-bottom:2px}
.info-row .val{font-size:12px;font-weight:600}
.id-badge{background:rgba(77,195,195,.15);border:1px solid rgba(77,195,195,.3);border-radius:6px;padding:6px 12px;text-align:center;margin:10px 0;font-family:'Courier New',monospace;font-size:14px;font-weight:700;color:#4dc3c3;letter-spacing:.1em}
.validity{font-size:10px;opacity:.5;text-align:center;margin-top:8px}
.barcode{height:32px;background:repeating-linear-gradient(90deg,rgba(255,255,255,.8) 0,rgba(255,255,255,.8) 2px,transparent 2px,transparent 5px);border-radius:2px;margin:10px 0}
/* Back */
.back-top{background:linear-gradient(135deg,#0f3460,#1a1a2e);color:#fff;padding:12px 18px;font-size:10px;text-align:center}
.back-top h2{font-size:12px;font-weight:700;margin-bottom:2px}
.rules{padding:14px 18px}
.rules h3{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#333;border-bottom:1px solid #eee;padding-bottom:6px;margin-bottom:10px}
.rules li{font-size:10px;color:#555;margin-bottom:5px;padding-left:12px;position:relative;line-height:1.5}
.rules li:before{content:'•';position:absolute;left:0;color:#0f3460}
.sig-row{display:flex;justify-content:space-between;align-items:flex-end;padding:12px 18px;border-top:1px solid #eee;margin-top:8px}
.sig-box{text-align:center}
.sig-line{border-top:1px solid #aaa;width:90px;margin:6px auto 3px}
.sig-label{font-size:9px;color:#888;text-transform:uppercase;letter-spacing:.04em}
.qr-box{width:48px;height:48px;background:repeating-conic-gradient(#000 0% 25%,#fff 0% 50%) 0 0 / 4px 4px;border:2px solid #333}
@media print{body{background:#fff;padding:0}.card{box-shadow:none}}
</style></head>
<body>
<div class="card-wrap">
  <!-- FRONT -->
  <div class="card front">
    <div class="card-top">
      <div class="logo-circle">R</div>
      <h1>Ram Krishna Paramhans<br>Inter College</h1>
    </div>
    <div class="card-body">
      <div class="photo-row">
        <div class="photo">👤</div>
        <div class="info-rows">
          <div class="info-row"><div class="lbl">Full Name</div><div class="val">${st.name}</div></div>
          <div class="info-row"><div class="lbl">Class</div><div class="val">${st.class}${st.stream?' – '+st.stream:''}</div></div>
          <div class="info-row"><div class="lbl">Section</div><div class="val">${st.section||'A'}</div></div>
          <div class="info-row"><div class="lbl">Session</div><div class="val">${st.session||'2025-26'}</div></div>
        </div>
      </div>
      <div class="id-badge">${st.roll}</div>
      <div class="barcode"></div>
      <div class="validity">Valid for Session ${st.session||'2025-26'}</div>
    </div>
  </div>
  <!-- BACK -->
  <div class="card back">
    <div class="back-top">
      <h2>Ram Krishna Paramhans Inter College</h2>
      <div>Nagal, Saharanpur · UP · Phone: +91 95571 45962</div>
    </div>
    <div class="rules">
      <h3>Important Instructions</h3>
      <ul>
        <li>This card must be carried to school every day.</li>
        <li>Report loss to the office immediately.</li>
        <li>Card must be produced on demand by staff.</li>
        <li>Valid only for the current academic session.</li>
        <li>Not transferable. Misuse is punishable.</li>
      </ul>
    </div>
    <div class="sig-row">
      <div class="sig-box">
        <div class="qr-box"></div>
        <div class="sig-label" style="margin-top:4px">Scan to Verify</div>
      </div>
      <div class="sig-box">
        <div class="sig-line"></div>
        <div class="sig-label">Principal</div>
        <div class="sig-label">RKPH Inter College</div>
      </div>
    </div>
  </div>
</div>
</body></html>`;
  triggerDownload(`IDCard_${st.roll}.html`,html);
  showToast('ID Card downloaded!','success');
};

window.downloadStudyMaterial=function(){
  if(!AUTH.loggedIn){showToast('Please log in first','error');return}
  const st=AUTH.student;
  const cls=st.class||'Class 11';
  const clsNum=parseInt((cls.match(/\d+/)||['11'])[0]);
  // Generate subject list based on class
  let subjects=[];
  if(clsNum<=5) subjects=['Hindi','English','Mathematics','EVS','Drawing'];
  else if(clsNum<=8) subjects=['Hindi','English','Mathematics','Science','Social Science','Sanskrit'];
  else if(clsNum<=10) subjects=['Hindi','English','Mathematics','Science','Social Science','Sanskrit'];
  else if(st.stream&&st.stream.includes('PCM')) subjects=['Physics','Chemistry','Mathematics','English','Hindi'];
  else if(st.stream&&st.stream.includes('PCB')) subjects=['Physics','Chemistry','Biology','English','Hindi'];
  else subjects=['Hindi','English','History','Geography','Political Science'];
  const today=new Date().toLocaleDateString('en-IN',{dateStyle:'long'});
  const rows=subjects.map((sub,i)=>`<tr><td>${i+1}</td><td>${sub}</td><td>Chapter 1-${Math.floor(Math.random()*5)+6}</td><td>PDF · ${(Math.random()*3+1).toFixed(1)} MB</td><td><span style="background:#e8faf3;color:#1a9e6b;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700">Available</span></td></tr>`).join('');
  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Study Material – ${cls}</title>
<style>body{font-family:Arial,sans-serif;max-width:760px;margin:40px auto;color:#111}.hdr{text-align:center;border-bottom:2px solid #0f3460;padding-bottom:14px;margin-bottom:22px}.hdr h1{font-size:20px;margin:0 0 4px}.note{background:#fff8e1;border:1px solid #f5c842;border-radius:6px;padding:12px 16px;font-size:13px;margin-bottom:20px;color:#7d5a00}table{width:100%;border-collapse:collapse;font-size:13px}th{background:#0f3460;color:#fff;padding:10px 12px;text-align:left}td{padding:9px 12px;border-bottom:1px solid #eee}.footer{margin-top:24px;text-align:center;font-size:12px;color:#888}</style></head>
<body><div class="hdr"><h1>Ram Krishna Paramhans Inter College</h1><p>Study Material Index — ${cls} | Session ${st.session||'2025-26'}</p></div>
<div class="note">📚 Study materials are available in the school library and will be distributed in class. Contact your subject teacher for digital copies.</div>
<table><thead><tr><th>#</th><th>Subject</th><th>Chapters Covered</th><th>File Size</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>
<div class="footer">Generated on ${today} · RKPH Inter College · Contact office for actual downloads</div>
</body></html>`;
  triggerDownload(`StudyMaterial_${cls.replace(' ','')}_${st.roll}.html`,html);
  showToast('Study material list downloaded!','success');
};

window.downloadPreviousPapers=function(){
  if(!AUTH.loggedIn){showToast('Please log in first','error');return}
  const st=AUTH.student;
  const cls=st.class||'Class 11';
  const clsNum=parseInt((cls.match(/\d+/)||['11'])[0]);
  let subjects=[];
  if(clsNum<=5) subjects=['Hindi','English','Mathematics','EVS'];
  else if(clsNum<=10) subjects=['Hindi','English','Mathematics','Science','Social Science'];
  else if(st.stream&&st.stream.includes('PCM')) subjects=['Physics','Chemistry','Mathematics','English','Hindi'];
  else if(st.stream&&st.stream.includes('PCB')) subjects=['Physics','Chemistry','Biology','English','Hindi'];
  else subjects=['Hindi','English','History','Geography','Political Science'];
  const years=['2024-25','2023-24','2022-23','2021-22','2020-21'];
  const today=new Date().toLocaleDateString('en-IN',{dateStyle:'long'});
  let rows='';
  years.forEach(yr=>{
    subjects.forEach(sub=>{
      rows+=`<tr><td>${yr}</td><td>${sub}</td><td>Half Yearly + Annual</td><td>${(Math.random()*1.5+0.5).toFixed(1)} MB</td><td><span style="background:#e8f4fd;color:#0f3460;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700">In Library</span></td></tr>`;
    });
  });
  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Previous Papers – ${cls}</title>
<style>body{font-family:Arial,sans-serif;max-width:800px;margin:40px auto;color:#111}.hdr{text-align:center;border-bottom:2px solid #0f3460;padding-bottom:14px;margin-bottom:22px}.hdr h1{font-size:20px;margin:0 0 4px}.note{background:#e8f4fd;border:1px solid #0f3460;border-radius:6px;padding:12px 16px;font-size:13px;margin-bottom:20px;color:#0f3460}table{width:100%;border-collapse:collapse;font-size:13px}th{background:#0f3460;color:#fff;padding:10px 12px;text-align:left}td{padding:9px 12px;border-bottom:1px solid #eee}tr:nth-child(even) td{background:#f8f9fc}.footer{margin-top:24px;text-align:center;font-size:12px;color:#888}</style></head>
<body><div class="hdr"><h1>Ram Krishna Paramhans Inter College</h1><p>Previous Year Question Papers — ${cls} | Session ${st.session||'2025-26'}</p></div>
<div class="note">📝 Question papers are available in the school library. Students may collect printed copies from the office between 10 AM – 1 PM on working days.</div>
<table><thead><tr><th>Session</th><th>Subject</th><th>Exam Type</th><th>File Size</th><th>Availability</th></tr></thead><tbody>${rows}</tbody></table>
<div class="footer">Generated on ${today} · RKPH Inter College · Visit school library for physical copies</div>
</body></html>`;
  triggerDownload(`PreviousPapers_${cls.replace(' ','')}_${st.roll}.html`,html);
  showToast('Previous papers list downloaded!','success');
};

/* ═══════════════════════════════════
   CERTIFICATES
═══════════════════════════════════ */
const CERTS = [
  {n:'Character Certificate', i:'fas fa-user-shield', issued:'10 Jan 2026', avail:true,  c:'var(--teal)'},
  {n:'Bonafide Certificate',  i:'fas fa-id-badge',   issued:'10 Jan 2026', avail:true,  c:'var(--amber)'},
  {n:'Transfer Certificate',  i:'fas fa-exchange-alt',issued:'Not issued',  avail:false, c:'var(--rose)'},
  {n:'Mark Sheet 2024-25',    i:'fas fa-file-alt',   issued:'20 Jun 2025', avail:true,  c:'rgba(200,220,255,.85)'},
  {n:'Sports Certificate',    i:'fas fa-running',    issued:'30 Nov 2025', avail:true,  c:'var(--teal)'},
  {n:'Migration Certificate', i:'fas fa-file-export',issued:'Not issued',  avail:false, c:'var(--amber)'},
];
function populateCertificates(){
  const grid=document.getElementById('certGrid');
  if(!grid)return;
  grid.innerHTML=CERTS.map(c=>`
    <div class="g-card cert-card">
      <div class="cert-icon" style="color:${c.c}"><i class="${c.i}"></i></div>
      <h4>${c.n}</h4><p>${c.issued}</p>
      ${c.avail
        ?`<button class="sp-btn-primary full-w" onclick="downloadCert('${c.n}')"><i class="fas fa-download"></i> Download</button>`
        :`<button class="sp-btn-outline full-w" onclick="showToast('Request submitted. Ready in 2-3 days.','info')"><i class="fas fa-paper-plane"></i> Request</button>`
      }
    </div>`).join('');
}
window.downloadCert=function(name){
  if(!AUTH.loggedIn){showToast('Please log in first','error');return}
  const st=AUTH.student;
  const today=new Date().toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'});
  const cert=CERTS.find(c=>c.n===name);
  if(!cert||!cert.avail){showToast('Certificate not available. Contact office.','error');return}

  /* ── shared header / footer for all certs ── */
  const letterHead=`<div class="hdr">
    <h1>Ram Krishna Paramhans Inter College</h1>
    <p>Nagal, Saharanpur, Uttar Pradesh – 247551</p>
    <p>Affiliated to UP Board | Phone: +91 95571 45962</p>
    <div class="hdr-line"></div>
    <h2>${name.toUpperCase()}</h2>
  </div>`;
  const baseStyle=`body{font-family:'Times New Roman',serif;max-width:720px;margin:40px auto;padding:40px;border:3px double #0f3460;color:#111}
  .hdr{text-align:center;margin-bottom:28px}.hdr h1{font-size:22px;font-weight:700;margin-bottom:4px}.hdr p{font-size:13px;margin:2px 0;color:#444}
  .hdr-line{border-bottom:2px solid #0f3460;margin:12px 0 8px}.hdr h2{font-size:16px;letter-spacing:.08em;text-decoration:underline;text-underline-offset:4px}
  .body{font-size:14px;line-height:2;text-align:justify}
  .body p{margin-bottom:12px}
  .highlight{font-weight:700}
  .sig{display:flex;justify-content:space-between;align-items:flex-end;margin-top:48px}
  .sig-block{text-align:center}
  .sig-line{border-top:1px solid #333;width:160px;margin:6px auto 3px}
  .sig-label{font-size:12px}
  .cert-no{font-size:12px;color:#666;margin-bottom:24px}
  .stamp{display:inline-block;border:3px solid #0f3460;color:#0f3460;padding:8px 24px;border-radius:50%;font-size:13px;font-weight:700;transform:rotate(-10deg);margin-top:16px;letter-spacing:.05em}
  @media print{body{margin:0;border:none}}`;

  let bodyContent='';

  if(name==='Character Certificate'){
    bodyContent=`<p>This is to certify that <span class="highlight">${st.name}</span>, son/daughter of <span class="highlight">${st.father||'—'}</span>, was/is a student of this institution during the academic session <span class="highlight">${st.session||'2025-26'}</span> in <span class="highlight">${st.class}${st.stream?' – '+st.stream:''}</span>.</p>
<p>During the period of his/her study in this institution, his/her <span class="highlight">character and conduct have been found to be GOOD</span>. He/she has not been involved in any act of indiscipline and has always maintained good behaviour with fellow students and faculty members.</p>
<p>This certificate is being issued on the request of the student for the purpose as stated.</p>`;
  } else if(name==='Bonafide Certificate'){
    bodyContent=`<p>This is to certify that <span class="highlight">${st.name}</span>, Roll No. <span class="highlight">${st.roll}</span>, is a <span class="highlight">bonafide student</span> of this institution.</p>
<p>He/She is currently studying in <span class="highlight">${st.class}${st.stream?' – '+st.stream:''}</span> during the academic session <span class="highlight">${st.session||'2025-26'}</span>.</p>
<p>His/Her date of birth as per school records is <span class="highlight">${st.dob||'—'}</span>.</p>
<p>This certificate is issued for the purpose of scholarship / bank account / government form submission as requested by the student / guardian.</p>`;
  } else if(name==='Mark Sheet 2024-25'){
    // Use RESULTS data if available
    const resultKey=Object.keys(RESULTS).find(k=>k.startsWith(st.roll+'|')&&k.includes('Annual'));
    const res=resultKey?RESULTS[resultKey]:null;
    const rows=res?res.subjects.map(s=>`<tr><td>${s.n}</td><td style="text-align:center">${s.mm}</td><td style="text-align:center">${s.obt}</td><td style="text-align:center;font-weight:700">${s.g}</td></tr>`).join(''):'<tr><td colspan="4" style="text-align:center;color:#888">Results not yet declared for this session</td></tr>';
    const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${name} – ${st.name}</title>
<style>${baseStyle}table{width:100%;border-collapse:collapse;font-size:13px;margin:16px 0}th{background:#0f3460;color:#fff;padding:9px 12px;text-align:left}td{padding:8px 12px;border-bottom:1px solid #ddd}.summary{display:flex;gap:16px;margin-top:16px}.s-cell{flex:1;background:#f5f5f5;border:1px solid #ddd;border-radius:6px;padding:10px;text-align:center}.s-cell span{display:block;font-size:11px;color:#666;text-transform:uppercase;margin-bottom:3px}.s-cell strong{font-size:16px}</style></head>
<body>${letterHead}<div class="cert-no">Cert No: RKPH/${new Date().getFullYear()}/${st.roll}/MS01 &nbsp;|&nbsp; Date: ${today}</div>
<div class="body"><p>This is to certify that <span class="highlight">${st.name}</span>, Roll No. <span class="highlight">${st.roll}</span>, appeared in the <span class="highlight">Annual Examination 2024-25</span> in <span class="highlight">${st.class}${st.stream?' – '+st.stream:''}</span>.</p>
${res?`<p>Result Summary:</p>`:''}
</div>
<table><thead><tr><th>Subject</th><th style="text-align:center">Max Marks</th><th style="text-align:center">Marks Obtained</th><th style="text-align:center">Grade</th></tr></thead><tbody>${rows}</tbody></table>
${res?`<div class="summary"><div class="s-cell"><span>Total</span><strong>${res.total}/${res.mm}</strong></div><div class="s-cell"><span>Percentage</span><strong>${res.pct?res.pct.toFixed(1)+'%':'—'}</strong></div><div class="s-cell"><span>Grade</span><strong>${res.grade||'—'}</strong></div><div class="s-cell"><span>Result</span><strong style="color:${(res.pct||0)>=33?'#1a9e6b':'#c0392b'}">${(res.pct||0)>=33?'PASS':'FAIL'}</strong></div></div>`:''}
<div class="sig"><div class="sig-block"><div class="sig-line"></div><div class="sig-label">Class Teacher</div></div><div><div class="stamp">SCHOOL SEAL</div></div><div class="sig-block"><div class="sig-line"></div><div class="sig-label">Principal</div><div class="sig-label">RKPH Inter College</div></div></div>
</body></html>`;
    triggerDownload(`MarkSheet_2024-25_${st.roll}.html`,html);
    showToast('Mark Sheet downloaded!','success'); return;
  } else if(name==='Sports Certificate'){
    bodyContent=`<p>This is to certify that <span class="highlight">${st.name}</span>, Roll No. <span class="highlight">${st.roll}</span>, a student of <span class="highlight">${st.class}${st.stream?' – '+st.stream:''}</span>, has actively participated in the <span class="highlight">Inter-School Sports Events</span> organised by Ram Krishna Paramhans Inter College during the session <span class="highlight">2025-26</span>.</p>
<p>He/She has shown <span class="highlight">outstanding sportsmanship, dedication, and team spirit</span> throughout the competitions. His/Her participation has brought credit to the institution.</p>
<p>This certificate is awarded in recognition of his/her sports achievements and participation.</p>`;
  }

  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${name} – ${st.name}</title>
<style>${baseStyle}</style></head>
<body>${letterHead}
<div class="cert-no">Cert No: RKPH/${new Date().getFullYear()}/${st.roll}/${name.substring(0,2).toUpperCase()}01 &nbsp;|&nbsp; Date: ${today}</div>
<div class="body">${bodyContent}<p>This certificate is issued on <span class="highlight">${today}</span>.</p></div>
<div class="sig">
  <div class="sig-block"><div class="sig-line"></div><div class="sig-label">Class Teacher</div></div>
  <div style="text-align:center"><div class="stamp">SCHOOL SEAL</div></div>
  <div class="sig-block"><div class="sig-line"></div><div class="sig-label">Principal</div><div class="sig-label">RKPH Inter College</div></div>
</div>
</body></html>`;
  triggerDownload(`${name.replace(/ /g,'_')}_${st.roll}.html`,html);
  showToast(`${name} downloaded!`,'success');
};
window.submitCertRequest=function(){
  const purpose=(document.getElementById('certPurpose') ? document.getElementById('certPurpose').value : '')||'';
  if(!purpose.trim()){showToast('Please enter purpose of certificate','error');return}
  showToast('Certificate request submitted. Ready in 2–3 working days.','success');
};

/* ═══════════════════════════════════
   TOAST
═══════════════════════════════════ */
window.showToast=function(msg,type='info'){
  const C={success:'var(--teal)',error:'var(--rose)',info:'var(--amber)'};
  const I={success:'check-circle',error:'times-circle',info:'info-circle'};
  const el=document.getElementById('spToast');
  if(!el)return;
  clearTimeout(_tt);
  el.style.borderColor=C[type];
  el.innerHTML=`<i class="fas fa-${I[type]}" style="color:${C[type]};flex-shrink:0"></i><span>${msg}</span>`;
  el.style.display='flex'; el.style.opacity='1'; el.style.transform='translateY(0)';
  _tt=setTimeout(()=>{
    el.style.opacity='0'; el.style.transform='translateY(10px)';
    setTimeout(()=>el.style.display='none',380);
  },3500);
};

/* ═══════════════════════════════════
   UTILS
═══════════════════════════════════ */
function shake(el){
  el.style.animation='none'; void el.offsetHeight;
  el.style.animation='shakeCard .4s ease';
}
function injectShakeCSS(){
  const s=document.createElement('style');
  s.textContent=`@keyframes shakeCard{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-5px)}80%{transform:translateX(5px)}}`;
  document.head.appendChild(s);
}
function triggerDownload(name,content){
  const blob=new Blob([content],{type:'text/html'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url; a.download=name;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}
window.selectPay=function(btn,method){
  document.querySelectorAll('.pmt').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  const area=document.getElementById('payInputArea');
  if(method==='upi') area.innerHTML=`<input type="text" class="sp-input" placeholder="UPI ID (e.g. name@upi)">`;
  else if(method==='card') area.innerHTML=`<input type="text" class="sp-input" placeholder="Card Number" style="margin-bottom:7px"><div style="display:grid;grid-template-columns:1fr 1fr;gap:7px"><input type="text" class="sp-input" placeholder="MM / YY"><input type="text" class="sp-input" placeholder="CVV"></div>`;
  else area.innerHTML=`<input type="text" class="sp-input" placeholder="Account Number" style="margin-bottom:7px"><input type="text" class="sp-input" placeholder="IFSC Code">`;
};



async function loadFees(roll) {
  const { data, error } = await supabase
    .from('fees')
    .select('*')
    .eq('roll', roll);

  if (error) {
    console.error("Fees error:", error);
    return;
  }

  let html = "<h3>Fees Details</h3>";

  if (data.length === 0) {
    html += "<p>No fees data found</p>";
  }

  data.forEach(f => {
    html += `
      <div style="padding:10px;border:1px solid #ccc;margin:5px">
        <strong>Amount:</strong> ₹${f.amount}<br>
        <strong>Status:</strong> ${f.status}<br>
        <strong>Date:</strong> ${f.date}
      </div>
    `;
  });

  document.getElementById('fees').innerHTML = html;
}


async function loadAttendance(roll) {
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('roll', roll);

  if (error) {
    console.error("Attendance error:", error);
    return;
  }

  let html = "<h3>Attendance</h3>";

  if (data.length === 0) {
    html += "<p>No attendance data found</p>";
  }

  data.forEach(a => {
    html += `
      <div style="padding:10px;border:1px solid #ccc;margin:5px">
        <strong>Date:</strong> ${a.date}<br>
        <strong>Status:</strong> ${a.status}
      </div>
    `;
  });

  document.getElementById('attendance').innerHTML = html;
}


