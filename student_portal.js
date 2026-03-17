/* =====================================================
   RKPH Student Portal — student_portal.js
   Auth rules:
     PUBLIC  : #results, #timetable (search by name OR roll, no login)
     PRIVATE : #fees, #attendance, #portal, #certificates (login required)
   ===================================================== */
'use strict';

/* ─── Auth state ─── */
let AUTH = { loggedIn: false, student: null };

/* ─── Student DB ─── */
const STUDENTS = {
  'RKPH2024001': {
    pass:'student123', name:'Rahul Kumar Sharma', shortName:'Rahul Kumar',
    roll:'RKPH2024001', class:'Class 11', stream:'Science', section:'A',
    dob:'15 August 2008', phone:'+91 98765 43210', email:'rahul.sharma@rkph.edu',
    address:'Nagal, Saharanpur, UP', father:'Suresh Kumar', fatherPhone:'+91 99887 76655'
  }
};

/* ─── Result DB  (accessible publicly by name/roll) ─── */
const RESULTS = {
  'RKPH2024001|11|Annual 2024': {
    roll:'RKPH2024001', name:'Rahul Kumar Sharma', cls:'Class 11', stream:'Science',
    subjects:[
      {n:'Physics',     mm:100, obt:85, g:'A'},
      {n:'Chemistry',   mm:100, obt:79, g:'B+'},
      {n:'Mathematics', mm:100, obt:92, g:'A+'},
      {n:'Biology',     mm:100, obt:81, g:'A'},
      {n:'English',     mm:100, obt:88, g:'A'},
      {n:'Hindi',       mm:100, obt:69, g:'B'},
    ], total:494, mm:600, pct:82.4, grade:'A', rank:'7 / 56', remarks:'Excellent'
  },
  'RKPH2024001|11|Half Yearly 2024': {
    roll:'RKPH2024001', name:'Rahul Kumar Sharma', cls:'Class 11', stream:'Science',
    subjects:[
      {n:'Physics',     mm:100, obt:72, g:'B+'},
      {n:'Chemistry',   mm:100, obt:68, g:'B'},
      {n:'Mathematics', mm:100, obt:88, g:'A'},
      {n:'Biology',     mm:100, obt:74, g:'B+'},
      {n:'English',     mm:100, obt:80, g:'A'},
      {n:'Hindi',       mm:100, obt:62, g:'C+'},
    ], total:444, mm:600, pct:74.0, grade:'B+', rank:'14 / 56', remarks:'Good'
  },
  'RKPH2024001|10|Annual 2024': {
    roll:'RKPH2024001', name:'Rahul Kumar Sharma', cls:'Class 10', stream:'General',
    subjects:[
      {n:'Mathematics', mm:100, obt:95, g:'A+'},
      {n:'Science',     mm:100, obt:88, g:'A'},
      {n:'Social Sc.',  mm:100, obt:82, g:'A'},
      {n:'English',     mm:100, obt:90, g:'A+'},
      {n:'Hindi',       mm:100, obt:76, g:'B+'},
      {n:'Sanskrit',    mm:100, obt:71, g:'B+'},
    ], total:502, mm:600, pct:83.7, grade:'A', rank:'4 / 62', remarks:'Distinction'
  }
};

/* ─── Fee data ─── */
const FEES = [
  {q:'Q1 (Apr–Jun)', type:'Tuition Fee',    amt:3000, due:'05 Apr 2024', paid:'02 Apr 2024', status:'paid'},
  {q:'Q1 (Apr–Jun)', type:'Development Fee',amt:1500, due:'05 Apr 2024', paid:'02 Apr 2024', status:'paid'},
  {q:'Q1 (Apr–Jun)', type:'Sports Fee',     amt:500,  due:'05 Apr 2024', paid:'02 Apr 2024', status:'paid'},
  {q:'Q2 (Jul–Sep)', type:'Tuition Fee',    amt:3000, due:'05 Jul 2024', paid:'04 Jul 2024', status:'paid'},
  {q:'Q2 (Jul–Sep)', type:'Development Fee',amt:1500, due:'05 Jul 2024', paid:'04 Jul 2024', status:'paid'},
  {q:'Q2 (Jul–Sep)', type:'Exam Fee',       amt:500,  due:'05 Jul 2024', paid:'10 Aug 2024', status:'paid'},
  {q:'Q3 (Oct–Dec)', type:'Tuition Fee',    amt:3000, due:'05 Oct 2024', paid:'—',           status:'pending'},
  {q:'Q3 (Oct–Dec)', type:'Development Fee',amt:1500, due:'05 Oct 2024', paid:'—',           status:'pending'},
  {q:'Q4 (Jan–Mar)', type:'Tuition Fee',    amt:3000, due:'05 Jan 2025', paid:'—',           status:'upcoming'},
  {q:'Q4 (Jan–Mar)', type:'Development Fee',amt:1500, due:'05 Jan 2025', paid:'—',           status:'upcoming'},
];

/* ─── Calendar state ─── */
let calYear=2025, calMonth=2;
const ATT_MAP = (() => {
  const m={}, absent=[5,12,19,26], late=[3,10,17,24], holiday=[2,9,16,23,30];
  for(let d=1;d<=31;d++){
    const k=`2025-2-${d}`;
    if(holiday.includes(d))     m[k]='holiday';
    else if(absent.includes(d)) m[k]='absent';
    else if(late.includes(d))   m[k]='late';
    else if(d<=17)              m[k]='present';
  }
  return m;
})();

/* ─── Timetable data ─── */
const TT = {
  periods:['7:30–8:15','8:15–9:00','9:00–9:45','BREAK','10:00–10:45','10:45–11:30','11:30–12:15','LUNCH','1:00–1:45','1:45–2:30'],
  days:{
    Monday:   ['Physics','Chemistry','Mathematics',null,'Biology','English','Physics Lab',null,'Hindi','Free Period'],
    Tuesday:  ['Mathematics','Physics','Chemistry',null,'English','Hindi','Biology Lab',null,'Mathematics','Chemistry'],
    Wednesday:['Biology','Mathematics','English',null,'Physics','Chemistry','Hindi',null,'Computer Lab','Sports'],
    Thursday: ['Chemistry','Biology','Hindi',null,'Mathematics','Physics','English',null,'Biology','Mathematics'],
    Friday:   ['English','Hindi','Physics',null,'Chemistry','Mathematics','Biology',null,'Sports','Free Period'],
    Saturday: ['Mathematics','Chemistry','Physics',null,'Hindi','English','Biology',null,null,null],
  },
  teachers:{'Physics':'Mr. R. Singh','Chemistry':'Mrs. P. Gupta','Mathematics':'Mr. A. Kumar',
    'Biology':'Mrs. S. Verma','English':'Mr. D. Sharma','Hindi':'Mrs. K. Mishra'},
  exam:[
    {date:'10 Mar 2025',day:'Monday',   sub:'Physics',     time:'9:00 AM – 12:00 PM',venue:'Hall A'},
    {date:'12 Mar 2025',day:'Wednesday',sub:'Chemistry',   time:'9:00 AM – 12:00 PM',venue:'Hall A'},
    {date:'14 Mar 2025',day:'Friday',   sub:'Mathematics', time:'9:00 AM – 12:00 PM',venue:'Hall B'},
    {date:'17 Mar 2025',day:'Monday',   sub:'Biology',     time:'9:00 AM – 12:00 PM',venue:'Hall A'},
    {date:'19 Mar 2025',day:'Wednesday',sub:'English',     time:'9:00 AM – 12:00 PM',venue:'Hall B'},
    {date:'21 Mar 2025',day:'Friday',   sub:'Hindi',       time:'9:00 AM – 12:00 PM',venue:'Hall A'},
  ]
};

const SUB_COL={
  Physics:'rgba(79,195,195,.17)',Chemistry:'rgba(232,107,138,.17)',
  Mathematics:'rgba(245,200,66,.17)',Biology:'rgba(120,200,120,.17)',
  English:'rgba(180,150,255,.17)',Hindi:'rgba(255,180,100,.17)',
  Sports:'rgba(255,255,255,.08)','Computer Lab':'rgba(100,180,255,.17)',
  'Physics Lab':'rgba(79,195,195,.12)','Biology Lab':'rgba(120,200,120,.12)',
  'Free Period':'rgba(255,255,255,.04)',
};
const sc=s=>s?(SUB_COL[s]||'rgba(255,255,255,.08)'):'rgba(255,255,255,.02)';

/* ═══════════════════════════════════
   BOOT
═══════════════════════════════════ */
document.addEventListener('DOMContentLoaded',()=>{
  initHeader();
  lockAuthSections();        // hide private sections initially
  initResults();             // public
  initTimetable();           // public
  renderFeeTable('all');     // pre-render (section hidden anyway)
  renderCalendar();
  renderSubjBars();
  injectShakeCSS();
  // Handle hash deep-links
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

  // Active link observer
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
  // Hide sections
  document.querySelectorAll('.sp-protected').forEach(s=>{s.style.display='none';s.classList.remove('revealed')});
  // Dim nav auth links
  document.querySelectorAll('.sp-nav-auth').forEach(l=>l.classList.add('nav-locked'));
}

function unlockAuthSections(){
  document.querySelectorAll('.sp-protected').forEach(s=>{
    s.style.display='block';
    void s.offsetHeight;
    s.classList.add('revealed');
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

window.doLogin=function(){
  const roll=document.getElementById('loginRoll').value.trim().toUpperCase();
  const pass=document.getElementById('loginPass').value.trim();
  if(!roll||!pass){showToast('Enter Roll Number and Password','error');return}
  const st=STUDENTS[roll];
  if(!st||st.pass!==pass){
    shake(document.querySelector('.login-card'));
    showToast('Invalid Roll Number or Password','error'); return;
  }
  AUTH={loggedIn:true,student:st};
  // Show dashboard
  document.getElementById('loginFormWrap').style.display='none';
  document.getElementById('loginDashboard').style.display='block';
  document.getElementById('dashName').textContent=st.name;
  document.getElementById('dashMeta').textContent=`${st.class} – ${st.stream} · Roll: ${st.roll}`;
  // Header badge
  document.getElementById('spUserBadge').style.display='flex';
  document.getElementById('spUserName').textContent=st.shortName;
  // Remember me
  if(document.getElementById('rememberMe').checked) sessionStorage.setItem('sp_roll',roll);
  // Reveal private sections + populate
  unlockAuthSections();
  populatePortal(st);
  populateCertificates();
  renderFeeTable('all');
  showToast(`Welcome, ${st.name}!`,'success');
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
  {cls:'11',exam:'Annual 2024',    label:'Annual 2024',      sub:'Class 11 Science',icon:'fas fa-trophy',  col:'var(--amber)'},
  {cls:'11',exam:'Half Yearly 2024',label:'Half Yearly 2024',sub:'Class 11 Science',icon:'fas fa-file-alt',col:'var(--teal)'},
  {cls:'10',exam:'Annual 2024',    label:'Annual 2023-24',   sub:'Class 10',         icon:'fas fa-star',   col:'var(--rose)'},
];

let _currentResult=null; // store last rendered result for downloads

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

window.searchResult=function(){
  const query=(document.getElementById('resQuery').value||'').trim();
  const cls  =document.getElementById('resClass').value||'';
  const exam =document.getElementById('resExam').value||'';
  if(!query){showToast('Enter a name or roll number','error');return}

  // Find matching result
  const matches=Object.entries(RESULTS).filter(([key,data])=>{
    const rollOk=key.startsWith(query.toUpperCase());
    const nameOk=data.name.toLowerCase().includes(query.toLowerCase());
    const clsOk =!cls||key.includes('|'+cls+'|');
    const examOk=!exam||key.endsWith('|'+exam);
    return (rollOk||nameOk)&&clsOk&&examOk;
  });
  if(!matches.length){showToast('No result found. Check name / roll number.','error');return}
  const [,data]=matches[0];
  const examLabel=matches[0][0].split('|')[2];
  renderResult(data,examLabel);
  document.getElementById('resultOutput').scrollIntoView({behavior:'smooth',block:'start'});
};

window.loadQuick=function(cls,exam){
  document.getElementById('resClass').value=cls;
  document.getElementById('resExam').value=exam;
  document.getElementById('resQuery').value='RKPH2024001';
  searchResult();
};

function renderResult(data,exam){
  _currentResult={data,exam};
  document.getElementById('resName').textContent=data.name;
  document.getElementById('resMeta').textContent=
    `${data.cls} – ${data.stream} · Roll: ${data.roll} · ${exam}`;
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
    ['Total Marks',`${data.total} / ${data.mm}`],
    ['Percentage', data.pct.toFixed(1)+'%'],
    ['Grade',      data.grade],
    ['Result',     pass?'PASS':'FAIL', pass?'var(--teal)':'var(--rose)'],
    ['Class Rank', data.rank],
    ['Remarks',    data.remarks],
  ];
  document.getElementById('resSummary').innerHTML=cells.map(([l,v,c])=>
    `<div class="rs-cell"><span>${l}</span><strong style="${c?'color:'+c:''}">${v}</strong></div>`
  ).join('');
  document.getElementById('resultOutput').style.display='block';
}

/* ─── Download marksheet as HTML file ─── */
window.downloadMarksheet=function(){
  if(!_currentResult){showToast('No result to download','error');return}
  const {data,exam}=_currentResult;
  const rows=data.subjects.map(s=>`
    <tr>
      <td>${s.n}</td>
      <td style="text-align:center">${s.mm}</td>
      <td style="text-align:center">${s.obt}</td>
      <td style="text-align:center">${Math.round(s.obt/s.mm*100)}%</td>
      <td style="text-align:center;font-weight:700">${s.g}</td>
    </tr>`).join('');
  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Marksheet – ${data.name}</title>
<style>
  body{font-family:Arial,sans-serif;max-width:760px;margin:40px auto;color:#111;background:#fff}
  .header{text-align:center;border-bottom:3px double #333;padding-bottom:16px;margin-bottom:24px}
  .header h1{font-size:22px;margin:0 0 4px}
  .header h2{font-size:16px;font-weight:normal;color:#555;margin:0}
  .info{display:grid;grid-template-columns:1fr 1fr;gap:8px;background:#f9f9f9;padding:14px;border-radius:6px;margin-bottom:24px}
  .info-row{font-size:14px}.info-row strong{display:inline-block;min-width:120px}
  table{width:100%;border-collapse:collapse;font-size:14px}
  th{background:#1a1a2e;color:#fff;padding:10px 12px;text-align:left}
  td{padding:9px 12px;border-bottom:1px solid #eee}
  tr:nth-child(even) td{background:#f5f5f5}
  .summary{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:#ddd;border:1px solid #ddd;margin-top:20px;border-radius:6px;overflow:hidden}
  .s-cell{background:#fff;padding:12px;text-align:center}
  .s-cell span{display:block;font-size:11px;color:#666;text-transform:uppercase;margin-bottom:4px}
  .s-cell strong{font-size:18px}
  .pass{color:#1a9e6b}.fail{color:#c0392b}
  .footer{margin-top:30px;text-align:center;font-size:12px;color:#888}
  @media print{body{margin:20px}}
</style></head><body>
<div class="header">
  <h1>Ram Krishna Paramhans Inter College</h1>
  <h2>Bajaj Bagh, Nangal (Nagal), Saharanpur, UP 247551</h2>
  <h2 style="margin-top:8px;font-size:18px;font-weight:bold;color:#111">MARK SHEET — ${exam}</h2>
</div>
<div class="info">
  <div class="info-row"><strong>Student Name:</strong> ${data.name}</div>
  <div class="info-row"><strong>Roll Number:</strong> ${data.roll}</div>
  <div class="info-row"><strong>Class:</strong> ${data.cls} – ${data.stream}</div>
  <div class="info-row"><strong>Examination:</strong> ${exam}</div>
  <div class="info-row"><strong>Class Rank:</strong> ${data.rank}</div>
  <div class="info-row"><strong>Remarks:</strong> ${data.remarks}</div>
</div>
<table>
  <thead><tr><th>Subject</th><th style="text-align:center">Max Marks</th><th style="text-align:center">Obtained</th><th style="text-align:center">Percentage</th><th style="text-align:center">Grade</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
<div class="summary">
  <div class="s-cell"><span>Total Marks</span><strong>${data.total} / ${data.mm}</strong></div>
  <div class="s-cell"><span>Percentage</span><strong>${data.pct.toFixed(1)}%</strong></div>
  <div class="s-cell"><span>Result</span><strong class="${data.pct>=33?'pass':'fail'}">${data.pct>=33?'PASS':'FAIL'}</strong></div>
</div>
<div class="footer">Generated on ${new Date().toLocaleDateString('en-IN',{dateStyle:'long'})} · RKPH Inter College Student Portal</div>
</body></html>`;
  triggerDownload(`Marksheet_${data.roll}_${exam.replace(/ /g,'_')}.html`, html);
  showToast('Marksheet downloaded!','success');
};

window.printMarksheet=function(){
  if(!_currentResult){showToast('Search a result first','error');return}
  window.print();
};

/* ─── Download timetable as HTML ─── */
window.downloadTimetable=function(){
  const cls=document.getElementById('ttClassSelect').value||'11';
  const days=Object.keys(TT.days);
  const periods=TT.periods;
  let rows='';
  periods.forEach((p,i)=>{
    if(p==='BREAK'||p==='LUNCH'){
      rows+=`<tr><td colspan="${days.length+1}" style="text-align:center;background:#f0f0f0;color:#888;font-size:12px;padding:5px">${p}</td></tr>`;
    } else {
      rows+=`<tr><td style="font-size:12px;color:#666;white-space:nowrap">${p}</td>`;
      days.forEach(d=>{const s=TT.days[d][i];rows+=`<td style="text-align:center;font-weight:${s?'600':'400'}">${s||'—'}</td>`;});
      rows+='</tr>';
    }
  });
  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Timetable – Class ${cls}</title>
<style>body{font-family:Arial,sans-serif;max-width:960px;margin:30px auto;color:#111}
.hdr{text-align:center;border-bottom:2px solid #333;padding-bottom:12px;margin-bottom:20px}
.hdr h1{margin:0 0 4px;font-size:20px}.hdr p{margin:0;color:#555;font-size:14px}
table{width:100%;border-collapse:collapse;font-size:13px}
th{background:#1a1a2e;color:#fff;padding:9px 10px;text-align:center}
td{padding:8px 10px;border:1px solid #ddd}
tr:nth-child(even) td{background:#f8f8f8}
.footer{margin-top:20px;text-align:center;font-size:12px;color:#999}</style></head>
<body><div class="hdr"><h1>Ram Krishna Paramhans Inter College</h1>
<p>Weekly Timetable — Class ${cls} | Academic Year 2024–25</p></div>
<table><thead><tr><th>Period / Time</th>${days.map(d=>`<th>${d}</th>`).join('')}</tr></thead>
<tbody>${rows}</tbody></table>
<div class="footer">Downloaded on ${new Date().toLocaleDateString('en-IN',{dateStyle:'long'})} · RKPH Inter College</div>
</body></html>`;
  triggerDownload(`Timetable_Class${cls}.html`, html);
  showToast('Timetable downloaded!','success');
};

/* ─── Download fee statement ─── */
window.downloadFeeStatement=function(){
  if(!AUTH.loggedIn){showToast('Please log in first','error');return}
  const st=AUTH.student;
  const rows=FEES.map(f=>`
    <tr class="${f.status}">
      <td>${f.q}</td><td>${f.type}</td><td>₹${f.amt.toLocaleString('en-IN')}</td>
      <td>${f.due}</td><td>${f.paid}</td>
      <td style="font-weight:600;color:${f.status==='paid'?'#1a9e6b':f.status==='pending'?'#c0392b':'#e67e22'}">${f.status.toUpperCase()}</td>
    </tr>`).join('');
  const totalPaid=FEES.filter(f=>f.status==='paid').reduce((s,f)=>s+f.amt,0);
  const totalPending=FEES.filter(f=>f.status==='pending').reduce((s,f)=>s+f.amt,0);
  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Fee Statement – ${st.name}</title>
<style>body{font-family:Arial,sans-serif;max-width:800px;margin:40px auto;color:#111}
.hdr{text-align:center;border-bottom:2px solid #333;padding-bottom:14px;margin-bottom:22px}
.hdr h1{font-size:20px;margin:0 0 4px}.hdr p{margin:0;color:#555;font-size:13px}
.info{display:grid;grid-template-columns:1fr 1fr;gap:8px;background:#f9f9f9;padding:12px;border-radius:6px;margin-bottom:20px}
.info div{font-size:13px}.info strong{min-width:110px;display:inline-block}
table{width:100%;border-collapse:collapse;font-size:13px}
th{background:#1a1a2e;color:#fff;padding:9px 11px;text-align:left}
td{padding:8px 11px;border-bottom:1px solid #eee}
tr:nth-child(even) td{background:#f5f5f5}
.summary{display:flex;gap:20px;margin-top:18px;flex-wrap:wrap}
.sum-card{flex:1;min-width:150px;padding:12px;border-radius:6px;text-align:center}
.sum-card span{display:block;font-size:11px;color:#666;text-transform:uppercase;margin-bottom:4px}
.sum-card strong{font-size:18px}
.paid-card{background:#e8faf3;border:1px solid #1a9e6b}.paid-card strong{color:#1a9e6b}
.pend-card{background:#fde8e8;border:1px solid #c0392b}.pend-card strong{color:#c0392b}
.footer{margin-top:24px;text-align:center;font-size:12px;color:#888}</style></head>
<body><div class="hdr"><h1>Ram Krishna Paramhans Inter College</h1>
<p>Fee Statement — Academic Year 2024–25</p></div>
<div class="info">
  <div><strong>Student Name:</strong> ${st.name}</div>
  <div><strong>Roll Number:</strong> ${st.roll}</div>
  <div><strong>Class:</strong> ${st.class} – ${st.stream}</div>
  <div><strong>Generated On:</strong> ${new Date().toLocaleDateString('en-IN',{dateStyle:'long'})}</div>
</div>
<table><thead><tr><th>Quarter</th><th>Fee Type</th><th>Amount</th><th>Due Date</th><th>Paid On</th><th>Status</th></tr></thead>
<tbody>${rows}</tbody></table>
<div class="summary">
  <div class="sum-card paid-card"><span>Total Paid</span><strong>₹${totalPaid.toLocaleString('en-IN')}</strong></div>
  <div class="sum-card pend-card"><span>Pending Dues</span><strong>₹${totalPending.toLocaleString('en-IN')}</strong></div>
</div>
<div class="footer">Ram Krishna Paramhans Inter College · Nagal, Saharanpur · +91 95571 45962</div>
</body></html>`;
  triggerDownload(`Fee_Statement_${st.roll}.html`, html);
  showToast('Fee statement downloaded!','success');
};

/* ─── Download attendance report ─── */
window.downloadAttendance=function(){
  if(!AUTH.loggedIn){showToast('Please log in first','error');return}
  const st=AUTH.student;
  const SUBJ=[
    {n:'Physics',present:52,total:60},{n:'Chemistry',present:55,total:60},
    {n:'Mathematics',present:58,total:60},{n:'Biology',present:49,total:60},
    {n:'English',present:57,total:60},{n:'Hindi',present:44,total:60},
  ];
  const rows=SUBJ.map(s=>{
    const p=Math.round(s.present/s.total*100);
    const col=p>=75?'#1a9e6b':p>=60?'#e67e22':'#c0392b';
    return `<tr><td>${s.n}</td><td style="text-align:center">${s.present}</td>
      <td style="text-align:center">${s.total-s.present}</td>
      <td style="text-align:center">${s.total}</td>
      <td style="text-align:center;font-weight:700;color:${col}">${p}%</td>
      <td style="text-align:center;color:${p>=75?'#1a9e6b':'#c0392b'};font-weight:600">${p>=75?'✓ OK':'⚠ Low'}</td></tr>`;
  }).join('');
  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Attendance Report – ${st.name}</title>
<style>body{font-family:Arial,sans-serif;max-width:760px;margin:40px auto;color:#111}
.hdr{text-align:center;border-bottom:2px solid #333;padding-bottom:14px;margin-bottom:22px}
.hdr h1{font-size:20px;margin:0 0 4px}.hdr p{margin:0;color:#555;font-size:13px}
.summary-bar{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:22px}
.sb{padding:12px;background:#f5f5f5;border-radius:6px;text-align:center}
.sb span{display:block;font-size:11px;color:#666;text-transform:uppercase;margin-bottom:4px}
.sb strong{font-size:20px;font-weight:700}
table{width:100%;border-collapse:collapse;font-size:13px}
th{background:#1a1a2e;color:#fff;padding:9px 12px;text-align:left}
td{padding:9px 12px;border-bottom:1px solid #eee}
tr:nth-child(even) td{background:#f8f8f8}
.footer{margin-top:24px;text-align:center;font-size:12px;color:#888}</style></head>
<body><div class="hdr"><h1>Ram Krishna Paramhans Inter College</h1>
<p>Attendance Report — ${st.name} · Roll: ${st.roll} · ${st.class} ${st.stream} · 2024–25</p></div>
<div class="summary-bar">
  <div class="sb"><span>Overall</span><strong style="color:#1a9e6b">87%</strong></div>
  <div class="sb"><span>Present</span><strong>156</strong></div>
  <div class="sb"><span>Absent</span><strong style="color:#c0392b">23</strong></div>
  <div class="sb"><span>Working Days</span><strong>187</strong></div>
</div>
<table><thead><tr><th>Subject</th><th style="text-align:center">Present</th><th style="text-align:center">Absent</th>
  <th style="text-align:center">Total</th><th style="text-align:center">%</th><th style="text-align:center">Status</th></tr></thead>
<tbody>${rows}</tbody></table>
<div class="footer">Generated on ${new Date().toLocaleDateString('en-IN',{dateStyle:'long'})} · RKPH Inter College Student Portal</div>
</body></html>`;
  triggerDownload(`Attendance_${st.roll}.html`, html);
  showToast('Attendance report downloaded!','success');
};

/* ─── Download ID card ─── */
window.downloadIDCard=function(){
  if(!AUTH.loggedIn){showToast('Please log in first','error');return}
  const st=AUTH.student;
  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>ID Card – ${st.name}</title>
<style>body{font-family:Arial,sans-serif;background:#f0f0f0;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
.card{width:360px;background:linear-gradient(135deg,#1a1a2e 0%,#0f3460 100%);border-radius:16px;padding:24px;color:#fff;box-shadow:0 16px 40px rgba(0,0,0,0.35)}
.card-header{display:flex;align-items:center;gap:12px;border-bottom:1px solid rgba(255,255,255,0.2);padding-bottom:14px;margin-bottom:18px}
.school-icon{width:44px;height:44px;background:rgba(255,255,255,0.15);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px}
.school-name h2{font-size:13px;margin:0 0 3px}.school-name p{font-size:11px;color:rgba(255,255,255,0.6);margin:0}
.avatar{width:72px;height:72px;background:rgba(255,255,255,0.12);border:2px solid rgba(255,255,255,0.25);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:32px;margin:0 auto 16px}
.name{text-align:center;font-size:18px;font-weight:700;margin-bottom:4px}
.roll{text-align:center;font-size:12px;color:rgba(255,255,255,0.65);margin-bottom:16px}
.details{display:grid;grid-template-columns:1fr 1fr;gap:10px;background:rgba(255,255,255,0.07);border-radius:10px;padding:14px}
.det-item span{display:block;font-size:10px;color:rgba(255,255,255,0.5);text-transform:uppercase;margin-bottom:2px}
.det-item strong{font-size:13px}
.card-footer{margin-top:16px;text-align:center;font-size:10px;color:rgba(255,255,255,0.4);border-top:1px solid rgba(255,255,255,0.12);padding-top:12px}
</style></head><body>
<div class="card">
  <div class="card-header">
    <div class="school-icon">🎓</div>
    <div class="school-name"><h2>RKPH Inter College</h2><p>Nagal, Saharanpur, UP</p></div>
  </div>
  <div class="avatar">👤</div>
  <div class="name">${st.name}</div>
  <div class="roll">Roll No: ${st.roll}</div>
  <div class="details">
    <div class="det-item"><span>Class</span><strong>${st.class}</strong></div>
    <div class="det-item"><span>Stream</span><strong>${st.stream}</strong></div>
    <div class="det-item"><span>Section</span><strong>${st.section}</strong></div>
    <div class="det-item"><span>Session</span><strong>2024–25</strong></div>
    <div class="det-item"><span>DOB</span><strong>${st.dob}</strong></div>
    <div class="det-item"><span>Phone</span><strong>${st.phone}</strong></div>
  </div>
  <div class="card-footer">Valid for Academic Year 2024–25 · Ram Krishna Paramhans Inter College</div>
</div></body></html>`;
  triggerDownload(`ID_Card_${st.roll}.html`, html);
  showToast('ID Card downloaded!','success');
};

/* ─── Download study material ─── */
window.downloadStudyMaterial=function(){
  if(!AUTH.loggedIn){showToast('Please log in first','error');return}
  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Study Material – Class 11 Science</title>
<style>body{font-family:Arial,sans-serif;max-width:760px;margin:40px auto;color:#111}
h1{font-size:20px;border-bottom:2px solid #1a1a2e;padding-bottom:10px}
h2{font-size:16px;color:#1a1a2e;margin-top:24px}
ul{line-height:1.8;font-size:14px}
.note{background:#fff9e6;border-left:4px solid #e67e22;padding:10px 14px;font-size:13px;border-radius:4px;margin-top:30px}</style></head>
<body><h1>📚 Study Material Index — Class 11 Science (2024–25)</h1>
<h2>Physics</h2><ul><li>Chapter 1 — Physical World & Measurement</li><li>Chapter 2 — Kinematics</li><li>Chapter 3 — Laws of Motion</li><li>Chapter 4 — Work, Energy & Power</li><li>Chapter 5 — Motion of System of Particles</li></ul>
<h2>Chemistry</h2><ul><li>Chapter 1 — Some Basic Concepts of Chemistry</li><li>Chapter 2 — Structure of Atom</li><li>Chapter 3 — Classification of Elements</li><li>Chapter 4 — Chemical Bonding</li><li>Chapter 5 — States of Matter</li></ul>
<h2>Mathematics</h2><ul><li>Chapter 1 — Sets</li><li>Chapter 2 — Relations & Functions</li><li>Chapter 3 — Trigonometric Functions</li><li>Chapter 4 — Complex Numbers</li><li>Chapter 5 — Linear Inequalities</li></ul>
<h2>Biology</h2><ul><li>Chapter 1 — The Living World</li><li>Chapter 2 — Biological Classification</li><li>Chapter 3 — Plant Kingdom</li><li>Chapter 4 — Animal Kingdom</li><li>Chapter 5 — Morphology of Flowering Plants</li></ul>
<div class="note">⚠️ This is an index file. Full PDF study material will be available once the file management system is integrated. Contact your teacher for printed copies.</div>
</body></html>`;
  triggerDownload('Study_Material_Class11_Science.html', html);
  showToast('Study material index downloaded!','success');
};

/* ─── Download previous papers ─── */
window.downloadPreviousPapers=function(){
  if(!AUTH.loggedIn){showToast('Please log in first','error');return}
  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Previous Papers – RKPH</title>
<style>body{font-family:Arial,sans-serif;max-width:760px;margin:40px auto;color:#111}
h1{font-size:20px;border-bottom:2px solid #1a1a2e;padding-bottom:10px}
table{width:100%;border-collapse:collapse;font-size:14px;margin-top:16px}
th{background:#1a1a2e;color:#fff;padding:9px 12px;text-align:left}
td{padding:8px 12px;border-bottom:1px solid #eee}
tr:nth-child(even) td{background:#f5f5f5}</style></head>
<body><h1>📋 Previous Year Question Papers — RKPH Inter College</h1>
<table><thead><tr><th>Year</th><th>Subject</th><th>Class</th><th>Exam Type</th><th>Availability</th></tr></thead>
<tbody>
<tr><td>2024</td><td>Mathematics</td><td>Class 11</td><td>Annual</td><td>✅ Available</td></tr>
<tr><td>2024</td><td>Physics</td><td>Class 11</td><td>Annual</td><td>✅ Available</td></tr>
<tr><td>2024</td><td>Chemistry</td><td>Class 11</td><td>Annual</td><td>✅ Available</td></tr>
<tr><td>2023</td><td>Mathematics</td><td>Class 10</td><td>Board</td><td>✅ Available</td></tr>
<tr><td>2023</td><td>Science</td><td>Class 10</td><td>Board</td><td>✅ Available</td></tr>
<tr><td>2022</td><td>All Subjects</td><td>Class 11 & 12</td><td>Annual</td><td>✅ Available</td></tr>
<tr><td>2021</td><td>All Subjects</td><td>Class 9–12</td><td>Annual</td><td>✅ Available</td></tr>
<tr><td>2020</td><td>All Subjects</td><td>Class 9–12</td><td>Annual</td><td>✅ Available</td></tr>
</tbody></table>
<p style="margin-top:20px;font-size:13px;color:#555">Contact the school office or your subject teacher to obtain physical copies of these papers.</p>
</body></html>`;
  triggerDownload('Previous_Papers_RKPH.html', html);
  showToast('Previous papers list downloaded!','success');
};

/* ─── Generic trigger-download helper ─── */
function triggerDownload(filename, html){
  const blob=new Blob([html],{type:'text/html'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url; a.download=filename; document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

/* ═══════════════════════════════════
   FEES
═══════════════════════════════════ */
window.filterFees=function(v){renderFeeTable(v)};
function renderFeeTable(filter){
  const tbody=document.getElementById('feeTableBody');
  if(!tbody)return;
  const rows=filter==='all'?FEES:FEES.filter(r=>r.status===filter);
  tbody.innerHTML=rows.map(r=>{
    const st=r.status==='paid'
      ?`<span class="fee-status-paid"><i class="fas fa-check-circle"></i> Paid</span>`
      :r.status==='pending'
      ?`<span class="fee-status-pending"><i class="fas fa-exclamation-circle"></i> Pending</span>`
      :`<span class="fee-status-upcoming"><i class="fas fa-clock"></i> Upcoming</span>`;
    const act=r.status==='paid'
      ?`<button class="sp-btn-outline" style="padding:5px 11px;font-size:.74rem"
          onclick="downloadReceiptFor('${r.q}','${r.type}',${r.amt},'${r.paid}')"><i class="fas fa-download"></i> Receipt</button>`
      :r.status==='pending'
      ?`<button class="sp-btn-primary" style="padding:5px 13px;font-size:.74rem"
          onclick="showToast('Payment gateway required for live use.','info')"><i class="fas fa-rupee-sign"></i> Pay</button>`
      :`<span style="opacity:.3;font-size:.8rem">—</span>`;
    return `<tr class="row-${r.status}">
      <td>${r.q}</td><td>${r.type}</td><td>₹${r.amt.toLocaleString('en-IN')}</td>
      <td>${r.due}</td><td>${r.paid}</td><td>${st}</td><td>${act}</td></tr>`;
  }).join('');
}

window.downloadReceiptFor=function(q,type,amt,paidOn){
  if(!AUTH.loggedIn){showToast('Please log in first','error');return}
  const st=AUTH.student;
  const receiptNo='RKPH'+Date.now().toString().slice(-8);
  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Receipt – ${receiptNo}</title>
<style>body{font-family:Arial,sans-serif;max-width:560px;margin:40px auto;color:#111}
.hdr{text-align:center;border-bottom:2px solid #1a1a2e;padding-bottom:14px;margin-bottom:20px}
.hdr h1{font-size:18px;margin:0 0 4px}.hdr p{margin:0;color:#555;font-size:12px}
.rec-no{text-align:center;background:#f0f0f0;padding:8px;border-radius:6px;font-size:13px;margin-bottom:18px}
.info{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:18px;font-size:13px}
.info div strong{min-width:110px;display:inline-block}
.amount-box{background:linear-gradient(135deg,#1a1a2e,#0f3460);color:#fff;border-radius:10px;padding:18px;text-align:center;margin-bottom:18px}
.amount-box span{display:block;font-size:12px;opacity:.7;margin-bottom:4px}
.amount-box strong{font-size:28px;font-weight:700}
.stamp{text-align:center;margin-top:24px;color:#1a9e6b;font-size:18px;font-weight:700;border:2px solid #1a9e6b;display:inline-block;padding:8px 24px;border-radius:6px;transform:rotate(-3deg);margin-left:38%}
.footer{margin-top:24px;text-align:center;font-size:11px;color:#999}</style></head>
<body><div class="hdr"><h1>Ram Krishna Paramhans Inter College</h1><p>Bajaj Bagh, Nangal, Saharanpur, UP 247551 · +91 95571 45962</p></div>
<div class="rec-no"><strong>Receipt No:</strong> ${receiptNo} &nbsp;|&nbsp; <strong>Date:</strong> ${paidOn}</div>
<div class="info">
  <div><strong>Student:</strong> ${st.name}</div>
  <div><strong>Roll No:</strong> ${st.roll}</div>
  <div><strong>Class:</strong> ${st.class} – ${st.stream}</div>
  <div><strong>Session:</strong> 2024–25</div>
  <div><strong>Quarter:</strong> ${q}</div>
  <div><strong>Fee Type:</strong> ${type}</div>
</div>
<div class="amount-box"><span>Amount Paid</span><strong>₹${amt.toLocaleString('en-IN')}</strong></div>
<div style="text-align:center"><div class="stamp">✓ PAID</div></div>
<div class="footer">This is a computer-generated receipt · RKPH Inter College</div>
</body></html>`;
  triggerDownload(`Receipt_${receiptNo}.html`, html);
  showToast('Receipt downloaded!','success');
};

window.selectPay=function(btn,method){
  document.querySelectorAll('.pmt').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  const area=document.getElementById('payInputArea');
  if(method==='upi') area.innerHTML=`<input type="text" class="sp-input" placeholder="UPI ID (e.g. name@upi)">`;
  else if(method==='card') area.innerHTML=`<input type="text" class="sp-input" placeholder="Card Number" style="margin-bottom:7px">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px">
      <input type="text" class="sp-input" placeholder="MM / YY"><input type="text" class="sp-input" placeholder="CVV"></div>`;
  else area.innerHTML=`<input type="text" class="sp-input" placeholder="Account Number" style="margin-bottom:7px">
    <input type="text" class="sp-input" placeholder="IFSC Code">`;
};

/* ═══════════════════════════════════
   ATTENDANCE
═══════════════════════════════════ */
window.changeMonth=function(d){
  calMonth+=d;
  if(calMonth<0){calMonth=11;calYear--}
  if(calMonth>11){calMonth=0;calYear++}
  renderCalendar();
};
function renderCalendar(){
  const MN=['January','February','March','April','May','June','July','August','September','October','November','December'];
  document.getElementById('calMonthTitle').textContent=`${MN[calMonth]} ${calYear}`;
  const fd=new Date(calYear,calMonth,1).getDay();
  const dim=new Date(calYear,calMonth+1,0).getDate();
  const now=new Date();
  const isNow=now.getFullYear()===calYear&&now.getMonth()===calMonth;
  let html='';
  for(let i=0;i<fd;i++) html+='<div class="cal-cell empty"></div>';
  for(let d=1;d<=dim;d++){
    const k=`${calYear}-${calMonth}-${d}`;
    const st=ATT_MAP[k]||'';
    html+=`<div class="cal-cell ${st?'cal-'+st:''} ${isNow&&d===now.getDate()?'cal-today':''}" title="${st||'No data'}">${d}</div>`;
  }
  document.getElementById('calBody').innerHTML=html;
}
function renderSubjBars(){
  const SUBJ=[
    {n:'Physics',present:52,total:60},{n:'Chemistry',present:55,total:60},
    {n:'Mathematics',present:58,total:60},{n:'Biology',present:49,total:60},
    {n:'English',present:57,total:60},{n:'Hindi',present:44,total:60},
  ];
  const el=document.getElementById('subjAttendList');
  if(!el)return;
  el.innerHTML=SUBJ.map(s=>{
    const p=Math.round(s.present/s.total*100);
    const c=p>=75?'var(--teal)':p>=60?'var(--amber)':'var(--rose)';
    return `<div class="subj-row">
      <div class="subj-name">${s.n}${p<75?'<span style="color:var(--rose);font-size:.67rem;margin-left:3px">⚠</span>':''}</div>
      <div class="subj-bar-bg"><div class="subj-bar" style="width:${p}%;background:${c}"></div></div>
      <div class="subj-pct" style="color:${c}">${p}%</div>
      <div class="subj-days">${s.present}/${s.total}</div>
    </div>`;
  }).join('');
}

/* ═══════════════════════════════════
   PORTAL / PROFILE
═══════════════════════════════════ */
const NOTICES=[
  {t:'Annual Examination Schedule Released',d:'15 Mar 2025',tag:'Exam',    u:true},
  {t:'Fee Submission Last Date: 15 April',  d:'10 Mar 2025',tag:'Finance', u:true},
  {t:'Sports Day — 22 March 2025',          d:'08 Mar 2025',tag:'Event',   u:false},
  {t:'Parent-Teacher Meeting: 28 March',    d:'05 Mar 2025',tag:'Meeting', u:false},
  {t:'Holiday on 25th March — Holi',        d:'02 Mar 2025',tag:'Holiday', u:false},
];
const ASSIGNS=[
  {sub:'Physics',    t:'Wave Optics – Practice Set 4', due:'20 Mar',done:false},
  {sub:'Chemistry',  t:'Organic Reactions Summary',    due:'18 Mar',done:true},
  {sub:'Mathematics',t:'Calculus Exercise 7',          due:'22 Mar',done:false},
  {sub:'English',    t:'Essay: My Aim in Life',        due:'25 Mar',done:false},
];

function populatePortal(st){
  document.getElementById('ppcName').textContent   = st.name;
  document.getElementById('ppcRoll').textContent   = 'Roll No: '+st.roll;
  document.getElementById('ppcTags').innerHTML     = `<span>${st.class}</span><span>${st.stream}</span><span>Section ${st.section}</span>`;
  document.getElementById('ppcDob').textContent    = st.dob;
  document.getElementById('ppcPhone').textContent  = st.phone;
  document.getElementById('ppcEmail').textContent  = st.email;
  document.getElementById('ppcAddr').textContent   = st.address;
  document.getElementById('ppcFather').textContent = 'Father: '+st.father;
  document.getElementById('ppcFPhone').textContent = st.fatherPhone;

  document.getElementById('noticeList').innerHTML=NOTICES.map(n=>`
    <div class="notice-item ${n.u?'urgent':''}">
      <div class="ni-dot" style="background:${n.u?'var(--rose)':'var(--teal)'}"></div>
      <div class="ni-body"><strong>${n.t}</strong><span>${n.d}</span></div>
      <span class="ni-tag">${n.tag}</span>
    </div>`).join('');

  document.getElementById('assignList').innerHTML=ASSIGNS.map(a=>`
    <div class="assign-item">
      <span class="ai-sub">${a.sub}</span>
      <span class="ai-title">${a.t}</span>
      <span class="ai-due"><i class="fas fa-calendar-alt" style="opacity:.5"></i> ${a.due}</span>
      <span class="ai-status ${a.done?'done':''}">
        <i class="fas fa-${a.done?'check-circle':'clock'}"></i> ${a.done?'Submitted':'Pending'}
      </span>
    </div>`).join('');
}

/* ═══════════════════════════════════
   CERTIFICATES
═══════════════════════════════════ */
const CERTS=[
  {n:'Character Certificate', i:'fas fa-user-shield',  issued:'10 Jan 2025', avail:true,  c:'var(--teal)'},
  {n:'Bonafide Certificate',  i:'fas fa-id-badge',     issued:'10 Jan 2025', avail:true,  c:'var(--amber)'},
  {n:'Transfer Certificate',  i:'fas fa-exchange-alt', issued:'Not issued',  avail:false, c:'var(--rose)'},
  {n:'Mark Sheet 2023-24',    i:'fas fa-file-alt',     issued:'20 Jun 2024', avail:true,  c:'rgba(200,220,255,.85)'},
  {n:'Sports Certificate',    i:'fas fa-running',      issued:'30 Nov 2024', avail:true,  c:'var(--teal)'},
  {n:'Migration Certificate', i:'fas fa-file-export',  issued:'Not issued',  avail:false, c:'var(--amber)'},
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
        :`<button class="sp-btn-outline full-w" onclick="showToast('Request for ${c.n} submitted. Ready in 2-3 days.','info')"><i class="fas fa-paper-plane"></i> Request</button>`
      }
    </div>`).join('');
}

window.downloadCert=function(name){
  if(!AUTH.loggedIn){showToast('Please log in first','error');return}
  const st=AUTH.student;
  const certNo='CERT'+Date.now().toString().slice(-8);
  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${name} – ${st.name}</title>
<style>body{font-family:"Times New Roman",serif;max-width:720px;margin:50px auto;color:#111;background:#fff}
.cert{border:8px double #1a1a2e;padding:40px;text-align:center;position:relative}
.school-name{font-size:22px;font-weight:bold;color:#1a1a2e;margin-bottom:4px}
.school-addr{font-size:13px;color:#555;margin-bottom:24px}
.cert-title{font-size:26px;font-weight:bold;text-decoration:underline;color:#1a1a2e;margin-bottom:28px;letter-spacing:2px}
.cert-body{font-size:15px;line-height:2;max-width:580px;margin:0 auto}
.cert-body strong{font-size:17px}
.cert-no{font-size:12px;color:#888;margin-top:24px}
.signature-row{display:flex;justify-content:space-between;margin-top:40px;font-size:13px}
.sig{text-align:center}.sig-line{border-top:1px solid #333;width:150px;margin:0 auto 6px;padding-top:6px}
.seal{width:70px;height:70px;border:2px solid #1a1a2e;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;text-align:center;color:#1a1a2e;font-weight:bold;position:absolute;bottom:50px;left:50%;transform:translateX(-50%)}</style></head>
<body><div class="cert">
<div class="school-name">Ram Krishna Paramhans Inter College</div>
<div class="school-addr">Bajaj Bagh, Nangal (Nagal), Saharanpur, Uttar Pradesh – 247551</div>
<div class="cert-title">${name.toUpperCase()}</div>
<div class="cert-body">
This is to certify that <strong>${st.name}</strong>, son/daughter of
<strong>${st.father}</strong>, bearing Roll No. <strong>${st.roll}</strong>,
is a bonafide student of this institution, currently studying in
<strong>${st.class}</strong> (${st.stream} Stream), Section <strong>${st.section}</strong>,
during the academic year 2024–25.
<br><br>
This certificate is issued on the request of the student for the purpose of record.
</div>
<div class="cert-no">Certificate No: ${certNo} &nbsp;|&nbsp; Date: ${new Date().toLocaleDateString('en-IN',{dateStyle:'long'})}</div>
<div class="signature-row">
  <div class="sig"><div class="sig-line">Class Teacher</div></div>
  <div class="sig"><div class="sig-line">Principal</div><div>RKPH Inter College</div></div>
</div>
<div class="seal">OFFICIAL SEAL</div>
</div></body></html>`;
  triggerDownload(`${name.replace(/ /g,'_')}_${st.roll}.html`, html);
  showToast(`${name} downloaded!`,'success');
};

window.submitCertRequest=function(){
  const type=document.getElementById('certType')?.value||'Certificate';
  const purpose=document.getElementById('certPurpose')?.value||'Not specified';
  if(!purpose.trim()){showToast('Please enter purpose of certificate','error');return}
  showToast(`Request for "${type}" submitted. Ready in 2–3 working days.`,'success');
  if(document.getElementById('certPurpose')) document.getElementById('certPurpose').value='';
  if(document.getElementById('certNotes'))   document.getElementById('certNotes').value='';
};

/* ═══════════════════════════════════
   TIMETABLE
═══════════════════════════════════ */
let curTTCls=11;
function initTimetable(){
  document.getElementById('todayDateStr').textContent=
    new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  renderWeeklyTT();
  renderExamTT();
  renderTodaySlots();
}

window.switchTT=function(btn,tab){
  document.querySelectorAll('.tt-tab').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('ttWeeklyWrap').style.display=tab==='weekly'?'block':'none';
  document.getElementById('ttExamWrap').style.display  =tab==='exam'  ?'block':'none';
};
window.changeTTClass=function(v){
  curTTCls=parseInt(v);
  renderWeeklyTT(); renderExamTT(); renderTodaySlots();
};

function renderWeeklyTT(){
  const days=Object.keys(TT.days);
  let html=`<thead><tr><th style="text-align:left;min-width:105px">Time</th>${days.map(d=>`<th>${d}</th>`).join('')}</tr></thead><tbody>`;
  TT.periods.forEach((p,i)=>{
    if(p==='BREAK'||p==='LUNCH'){
      html+=`<tr><td colspan="${days.length+1}" class="tt-break-td">— ${p} —</td></tr>`;
    } else {
      html+=`<tr><td class="tt-period-td">${p}</td>`;
      days.forEach(d=>{const s=TT.days[d][i];html+=`<td style="background:${sc(s)}">${s||'—'}</td>`;});
      html+=`</tr>`;
    }
  });
  document.getElementById('weeklyTable').innerHTML=html+'</tbody>';
}

function renderExamTT(){
  let html=`<thead><tr><th>Date</th><th>Day</th><th>Subject</th><th>Time</th><th>Venue</th></tr></thead><tbody>`;
  TT.exam.forEach(e=>{
    html+=`<tr><td><strong>${e.date}</strong></td><td>${e.day}</td>
      <td style="background:${sc(e.sub)};font-weight:600">${e.sub}</td>
      <td>${e.time}</td><td>${e.venue}</td></tr>`;
  });
  document.getElementById('examTable').innerHTML=html+'</tbody>';
}

function renderTodaySlots(){
  const DAYS=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const today=DAYS[new Date().getDay()];
  const sched=TT.days[today]||TT.days['Monday'];
  let html='';
  sched.forEach((sub,i)=>{
    if(!sub)return;
    const p=TT.periods[i];
    if(!p||p==='BREAK'||p==='LUNCH')return;
    const teacher=TT.teachers[sub]||'';
    html+=`<div class="tt-slot" style="border-left:3px solid ${sub==='Free Period'?'rgba(255,255,255,.15)':'var(--teal)'}">
      <span class="tt-slot-time">${p}</span>
      <span class="tt-slot-sub" style="background:${sc(sub)}">${sub}</span>
      ${teacher?`<span class="tt-slot-teacher">${teacher}</span>`:''}
    </div>`;
  });
  document.getElementById('todaySchedule').innerHTML=
    html||'<p style="opacity:.45;font-size:.87rem;padding:.5rem 0">No classes today — enjoy your day!</p>';
}

/* ═══════════════════════════════════
   TOAST
═══════════════════════════════════ */
let _tt=null;
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
