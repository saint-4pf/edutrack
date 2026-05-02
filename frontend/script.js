// ═══════════════════════════════════════════════
// EduTrack — script.js
// All frontend logic, API calls & page behaviour
// ═══════════════════════════════════════════════

const API = 'https://web-production-19f39.up.railway.app/api';

// ── STATE ─────────────────────────────────────
let allStudents  = [];
let allSubjects  = [];
let allScores    = [];
let currentUser  = null;
let adminAuthed  = false;
let currentReportStudentId = null;

// Score entry state
let selectedScoreStudent = null;
let selectedScoreSubject = null;

// ── STUDENT PROFILE CACHE ─────────────────────
let studentProfileCache = {};

// Edit IDs
let editStudentId = null;
let editSubjectId = null;

// ═══════════════════════════════════════════════
// AUTH GUARD
// ═══════════════════════════════════════════════
(function checkAuth() {
  const token = localStorage.getItem('edutrack_token');
  const user  = localStorage.getItem('edutrack_user');
  if (!token || !user) { window.location.href = 'auth.html'; return; }
  currentUser = JSON.parse(user);
})();

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('edutrack_token')}`
  };
}

function logout() {
  if (!confirm('Are you sure you want to logout?')) return;
  localStorage.removeItem('edutrack_token');
  localStorage.removeItem('edutrack_user');
  window.location.href = 'auth.html';
}

// ═══════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════
const PAGE_TITLES = {
  dashboard:'Dashboard', students:'Students', subjects:'Subjects',
  scores:'Enter Scores', mastersheet:'Mastersheet',
  reports:'Reports', term:'Term Settings', admin:'Admin Panel'
};

function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const page = document.getElementById(`page-${name}`);
  if (page) page.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => {
    if (n.getAttribute('onclick')?.includes(`'${name}'`)) n.classList.add('active');
  });
  document.getElementById('topbar-title').textContent = PAGE_TITLES[name] || name;
  document.getElementById('sidebar').classList.remove('open');
  if (name === 'dashboard')   initDashboard();
  if (name === 'students')    initStudents();
  if (name === 'subjects')    initSubjects();
  if (name === 'scores')      initScores();
  if (name === 'mastersheet') initMastersheet();
  if (name === 'reports')     initReports();
  if (name === 'term')        initTermSettings();
  if (name === 'admin')       initAdmin();
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// ═══════════════════════════════════════════════
// TERM SETTINGS (localStorage)
// ═══════════════════════════════════════════════
function getTermSettings() {
  return JSON.parse(localStorage.getItem('edutrack_term') || '{}');
}

async function initTermSettings() {
  const ts = getTermSettings();
  setValue('ts-session',     ts.session    || '');
  setValue('ts-term',        ts.term       || '1st Term');
  setValue('ts-roll',        ts.roll       || '');
  setValue('ts-school-days', ts.schoolDays || '');
  setValue('ts-closes',      ts.closes     || '');
  setValue('ts-resumes',     ts.resumes    || '');

  // Fetch locked school info from server
  try {
    const res  = await fetch(`${API.replace('/api', '')}/api/school-info`);
    const info = await res.json();
    setValue('ts-school-name', info.schoolName || '');
    setValue('ts-address',     info.address    || '');
    setValue('ts-pobox',       info.pobox      || '');
    setValue('ts-phones',      info.phones     || '');

    // Lock the fields — teachers cannot edit them
    ['ts-school-name','ts-address','ts-pobox','ts-phones'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.readOnly = true;
        el.style.opacity = '0.6';
        el.style.cursor  = 'not-allowed';
        el.title = 'Managed by system administrator';
      }
    });
  } catch(e) {
    console.error('Could not load school info:', e);
  }
}

async function saveTermSettings() {
  // Fetch locked school info
  let schoolInfo = {};
  try {
    const res  = await fetch(`${API.replace('/api', '')}/api/school-info`);
    schoolInfo = await res.json();
  } catch(e) {}

  const ts = {
    schoolName: schoolInfo.schoolName || getValue('ts-school-name') || 'My School',
    address:    schoolInfo.address    || getValue('ts-address'),
    pobox:      schoolInfo.pobox      || getValue('ts-pobox'),
    phones:     schoolInfo.phones     || getValue('ts-phones'),
    session:    getValue('ts-session')     || '2024/2025',
    term:       getValue('ts-term')        || '1st Term',
    roll:       getValue('ts-roll'),
    schoolDays: getValue('ts-school-days'),
    closes:     getValue('ts-closes'),
    resumes:    getValue('ts-resumes'),
  };
  localStorage.setItem('edutrack_term', JSON.stringify(ts));
  updateTermChip(ts);
  showMsg('ts-msg', '✅ Term settings saved!', 'success');
}
function updateTermChip(ts) {
  if (!ts) ts = getTermSettings();
  const chip = document.getElementById('term-chip');
  if (chip && ts.term && ts.session) chip.textContent = `${ts.term} • ${ts.session}`;
}

// ═══════════════════════════════════════════════
// GRADING
// ═══════════════════════════════════════════════
function getGradeInfo(score) {
  if (score >= 90) return { grade: 'A+', remark: 'Excellent',               cls: 's-a' };
  if (score >= 80) return { grade: 'A',  remark: 'Highly Proficient',       cls: 's-a' };
  if (score >= 70) return { grade: 'B',  remark: 'Proficient',              cls: 's-b' };
  if (score >= 60) return { grade: 'C',  remark: 'Approaching Proficiency', cls: 's-c' };
  if (score >= 50) return { grade: 'C-', remark: 'Average',                 cls: 's-c' };
  if (score >= 40) return { grade: 'D',  remark: 'Needs Assistance',        cls: 's-d' };
  if (score >= 30) return { grade: 'E',  remark: 'Below Average',           cls: 's-e' };
  if (score >= 20) return { grade: 'F',  remark: 'Poor',                    cls: 's-f' };
  if (score >= 10) return { grade: 'F-', remark: 'Very Poor',               cls: 's-f' };
  return           { grade: 'F--', remark: 'Fail',                          cls: 's-f' };
}

// Auto-generate remarks (mirrors pdfController logic)
function generateTeacherRemark(average, rank) {
  if (average >= 90) return `${rank === 1 ? 'Top of the class! ' : ''}An outstanding performance. Keep up the excellent work!`;
  if (average >= 80) return `${rank <= 3 ? 'Among the best in class. ' : ''}A commendable performance. Keep pushing for excellence!`;
  if (average >= 70) return 'A good performance this term. With more effort, even better results are achievable.';
  if (average >= 60) return 'A fair performance. There is room for improvement. More dedication is encouraged.';
  if (average >= 50) return 'An average performance. The student needs to work harder and be more focused.';
  if (average >= 40) return 'A below average performance. Serious effort and commitment are needed next term.';
  return 'A poor performance this term. The student requires urgent attention and support to improve.';
}

function generateHeadRemark(average, rank) {
  if (average >= 90 && rank === 1) return 'An exemplary student. A pride of the school. Well done!';
  if (average >= 90) return 'Excellent academic achievement. The school is proud of you. Keep it up!';
  if (average >= 80 && rank <= 3) return 'A brilliant performance. You are among the best. Keep striving!';
  if (average >= 80) return 'Very good performance. Your hard work is paying off. Keep it up!';
  if (average >= 70) return 'Good performance. Continue to work hard and you will achieve even more.';
  if (average >= 60) return 'A satisfactory performance. More effort is needed to reach your full potential.';
  if (average >= 50) return 'You can do better. Stay focused, work harder, and seek help where needed.';
  return 'The student must improve significantly. Parents are advised to provide support at home.';
}

// ═══════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════
async function initDashboard() {
  updateTermChip();
    // Sync locked school info into term settings
try {
  const res  = await fetch(`${API.replace('/api', '')}/api/school-info`);
  const info = await res.json();
  const ts   = getTermSettings();
  ts.schoolName = info.schoolName || ts.schoolName;
  ts.address    = info.address    || ts.address;
  ts.pobox      = info.pobox      || ts.pobox;
  ts.phones     = info.phones     || ts.phones;
  localStorage.setItem('edutrack_term', JSON.stringify(ts));
} catch(e) {}

  const h = new Date().getHours();
  const greeting = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  const name = currentUser ? currentUser.firstName || 'Teacher' : 'Teacher';
  setHTML('dash-greeting', `${greeting}, ${name} 👋`);
  setHTML('sb-name',   `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim() || 'Teacher');
  setHTML('sb-class',  currentUser?.className || '—');
  setHTML('sb-avatar', (currentUser?.firstName?.[0] || 'T').toUpperCase());
  const ts = getTermSettings();
  setHTML('d-term', ts.term || '—');


  try {
    const [sRes, subjRes] = await Promise.all([
      fetch(`${API}/students`, { headers: authHeaders() }),
      fetch(`${API}/subjects`, { headers: authHeaders() })
    ]);
    allStudents = (await sRes.json()).data    || [];
    allSubjects = (await subjRes.json()).data || [];
    setHTML('d-students', allStudents.length);
    setHTML('d-subjects', allSubjects.length);
  } catch(e) {}
  try {
    allScores = ((await (await fetch(`${API}/scores`, { headers: authHeaders() })).json()).data) || [];
    setHTML('d-scores', allScores.length);
  } catch(e) {}
}

// ═══════════════════════════════════════════════
// STUDENTS
// ═══════════════════════════════════════════════
async function initStudents() { await fetchStudents(); }

async function fetchStudents() {
  try {
    const data = await (await fetch(`${API}/students`, { headers: authHeaders() })).json();
    allStudents = data.data || [];
    renderStudents(allStudents);
    setHTML('s-count', allStudents.length);
  } catch(e) { showMsg('s-msg', 'Failed to load students.', 'error'); }
}

function renderStudents(list) {
  const tbody = document.getElementById('s-tbody');
  if (!list.length) { tbody.innerHTML = `<tr><td colspan="6" class="empty">No students yet.</td></tr>`; return; }
  tbody.innerHTML = list.map((s, i) => `
    <tr>
      <td>${i+1}</td><td>${s.name}</td>
      <td style="color:var(--muted)">${s.studentId}</td>
      <td>${s.className}</td>
      <td style="color:var(--muted);font-size:12px">${fmtDate(s.createdAt)}</td>
      <td>
        <button class="tbl-edit" onclick="editStudent('${s._id}','${esc(s.name)}','${esc(s.studentId)}','${esc(s.className)}')">✏️ Edit</button>
        <button class="tbl-delete" onclick="deleteStudent('${s._id}')">🗑️</button>
      </td>
    </tr>`).join('');
}

function filterStudents() {
  const q = getValue('s-search').toLowerCase();
  renderStudents(allStudents.filter(s =>
    s.name.toLowerCase().includes(q) ||
    s.studentId.toLowerCase().includes(q) ||
    s.className.toLowerCase().includes(q)
  ));
}

async function handleStudentSubmit() {
  const name = getValue('s-name'), studentId = getValue('s-sid'), className = getValue('s-class');
  if (!name || !studentId || !className) { showMsg('s-msg', 'Please fill in all fields.', 'error'); return; }
  try {
    const url = editStudentId ? `${API}/students/${editStudentId}` : `${API}/students`;
    const res = await fetch(url, { method: editStudentId ? 'PUT' : 'POST', headers: authHeaders(), body: JSON.stringify({ name, studentId, className }) });
    const data = await res.json();
    if (data.success) { showMsg('s-msg', data.message, 'success'); clearStudentForm(); fetchStudents(); }
    else showMsg('s-msg', data.message, 'error');
  } catch(e) { showMsg('s-msg', 'Request failed.', 'error'); }
}

function editStudent(id, name, sid, className) {
  editStudentId = id;
  setValue('s-name', name); setValue('s-sid', sid); setValue('s-class', className);
  setHTML('stu-form-title', 'Update Student'); setHTML('stu-submit-btn', 'Update Student');
  show('stu-cancel-btn'); window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function deleteStudent(id) {
  if (!confirm('Delete this student? All their scores will also be removed.')) return;
  try {
    const data = await (await fetch(`${API}/students/${id}`, { method: 'DELETE', headers: authHeaders() })).json();
    if (data.success) { showMsg('s-msg', data.message, 'success'); fetchStudents(); }
    else showMsg('s-msg', data.message, 'error');
  } catch(e) { showMsg('s-msg', 'Delete failed.', 'error'); }
}

function cancelStudentEdit() { clearStudentForm(); }
function clearStudentForm() {
  editStudentId = null;
  setValue('s-name',''); setValue('s-sid',''); setValue('s-class','');
  setHTML('stu-form-title','Add New Student'); setHTML('stu-submit-btn','Add Student');
  hide('stu-cancel-btn');
}

// ═══════════════════════════════════════════════
// SUBJECTS
// ═══════════════════════════════════════════════
async function initSubjects() { await fetchSubjects(); }

async function fetchSubjects() {
  try {
    const data = await (await fetch(`${API}/subjects`, { headers: authHeaders() })).json();
    allSubjects = data.data || [];
    renderSubjects(allSubjects); setHTML('subj-count', allSubjects.length);
  } catch(e) { showMsg('subj-msg', 'Failed to load subjects.', 'error'); }
}

function renderSubjects(list) {
  const tbody = document.getElementById('subj-tbody');
  if (!list.length) { tbody.innerHTML = `<tr><td colspan="5" class="empty">No subjects yet.</td></tr>`; return; }
  tbody.innerHTML = list.map((s, i) => `
    <tr>
      <td>${i+1}</td><td>${s.name}</td>
      <td style="color:var(--muted)">${s.code || '—'}</td>
      <td style="color:var(--muted);font-size:12px">${fmtDate(s.createdAt)}</td>
      <td>
        <button class="tbl-edit" onclick="editSubject('${s._id}','${esc(s.name)}','${esc(s.code||'')}')">✏️ Edit</button>
        <button class="tbl-delete" onclick="deleteSubject('${s._id}')">🗑️</button>
      </td>
    </tr>`).join('');
}

async function handleSubjectSubmit() {
  const name = getValue('subj-name'), code = getValue('subj-code');
  if (!name) { showMsg('subj-msg', 'Please enter a subject name.', 'error'); return; }
  try {
    const url = editSubjectId ? `${API}/subjects/${editSubjectId}` : `${API}/subjects`;
    const res = await fetch(url, { method: editSubjectId ? 'PUT' : 'POST', headers: authHeaders(), body: JSON.stringify({ name, code }) });
    const data = await res.json();
    if (data.success) { showMsg('subj-msg', data.message, 'success'); clearSubjectForm(); fetchSubjects(); }
    else showMsg('subj-msg', data.message, 'error');
  } catch(e) { showMsg('subj-msg', 'Request failed.', 'error'); }
}

function editSubject(id, name, code) {
  editSubjectId = id;
  setValue('subj-name', name); setValue('subj-code', code);
  setHTML('subj-form-title', 'Update Subject'); setHTML('subj-submit-btn', 'Update Subject');
  show('subj-cancel-btn'); window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function deleteSubject(id) {
  if (!confirm('Delete this subject?')) return;
  try {
    const data = await (await fetch(`${API}/subjects/${id}`, { method: 'DELETE', headers: authHeaders() })).json();
    if (data.success) { showMsg('subj-msg', data.message, 'success'); fetchSubjects(); }
    else showMsg('subj-msg', data.message, 'error');
  } catch(e) { showMsg('subj-msg', 'Delete failed.', 'error'); }
}

function cancelSubjectEdit() { clearSubjectForm(); }
function clearSubjectForm() {
  editSubjectId = null;
  setValue('subj-name',''); setValue('subj-code','');
  setHTML('subj-form-title','Add New Subject'); setHTML('subj-submit-btn','Add Subject');
  hide('subj-cancel-btn');
}

// ═══════════════════════════════════════════════
// ENTER SCORES
// ═══════════════════════════════════════════════
async function initScores() {
  await fetchStudents();
  await fetchSubjects();
  await fetchScores();
  selectedScoreStudent = null;
  selectedScoreSubject = null;
  hide('sc-student-select'); hide('sc-subject-select');
  hide('sc-student-chosen'); hide('sc-subject-chosen');
  hide('attendance-step');
  hide('profile-saved-banner');
  hide('score-entry-panel');
}

async function fetchScores() {
  try {
    const data = await (await fetch(`${API}/scores`, { headers: authHeaders() })).json();
    allScores  = data.data || [];
    // Seed profile cache from existing score records
    allScores.forEach(sc => {
      if (!studentProfileCache[sc.studentId]) {
        studentProfileCache[sc.studentId] = {
          daysPresent: sc.daysPresent ?? 0,
          conduct:     sc.conduct     || '',
          interest:    sc.interest    || '',
          saved:       true
        };
      }
    });
    renderScoreTable(allScores);
    setHTML('sc-count', allScores.length);
  } catch(e) {}
}

// ── Student search
function filterScoreStudents() {
  const q   = getValue('sc-student-search').toLowerCase();
  const sel = document.getElementById('sc-student-select');
  if (!q) { hide(sel); return; }
  const matches = allStudents.filter(s =>
    s.name.toLowerCase().includes(q) || s.studentId.toLowerCase().includes(q)
  );
  if (!matches.length) { hide(sel); return; }
  sel.innerHTML = matches.map(s =>
    `<option value="${s._id}">${s.name} (${s.studentId}) — ${s.className}</option>`
  ).join('');
  show(sel);
}

function onScoreStudentPick() {
  const sel = document.getElementById('sc-student-select');
  const id  = sel.value;
  if (!id) return;
  selectedScoreStudent = allStudents.find(s => s._id === id);
  if (!selectedScoreStudent) return;
  const chip = document.getElementById('sc-student-chosen');
  chip.innerHTML = `<span>👤 ${selectedScoreStudent.name} (${selectedScoreStudent.studentId})</span>
    <button onclick="clearScoreStudent()" style="background:none;border:none;color:var(--accent);cursor:pointer;font-size:16px">×</button>`;
  show(chip); hide(sel); setValue('sc-student-search', '');
  selectedScoreSubject = null;
  hide('sc-subject-chosen');
  hide('attendance-step');
  hide('profile-saved-banner');
  hide('score-entry-panel');
  setValue('sc-subject-search', '');
}

function clearScoreStudent() {
  selectedScoreStudent = null;
  hide('sc-student-chosen');
  hide('attendance-step');
  hide('profile-saved-banner');
  hide('score-entry-panel');
}

// ── Subject search
function filterScoreSubjects() {
  const q   = getValue('sc-subject-search').toLowerCase();
  const sel = document.getElementById('sc-subject-select');
  if (!q) { hide(sel); return; }
  const matches = allSubjects.filter(s => s.name.toLowerCase().includes(q));
  if (!matches.length) { hide(sel); return; }
  sel.innerHTML = matches.map(s =>
    `<option value="${s._id}">${s.name}${s.code ? ` (${s.code})` : ''}</option>`
  ).join('');
  show(sel);
}

function onScoreSubjectPick() {
  const sel = document.getElementById('sc-subject-select');
  const id  = sel.value;
  if (!id) return;
  selectedScoreSubject = allSubjects.find(s => s._id === id);
  if (!selectedScoreSubject) return;
  const chip = document.getElementById('sc-subject-chosen');
  const existingScore = allScores.find(sc =>
    sc.studentId === selectedScoreStudent?._id &&
    sc.subjectId === selectedScoreSubject._id
  );
  chip.innerHTML = `
    <span>📚 ${selectedScoreSubject.name}</span>
    ${existingScore ? `<span style="margin-left:8px;background:#10B981;color:white;padding:2px 8px;border-radius:10px;font-size:11px">✅ Score entered</span>` : ''}
    <button onclick="clearScoreSubject()" style="background:none;border:none;color:var(--accent);cursor:pointer;font-size:16px;margin-left:6px">×</button>`;
  show(chip); hide(sel); setValue('sc-subject-search', '');
}

function clearScoreSubject() {
  selectedScoreSubject = null;
  hide('sc-subject-chosen');
  hide('score-entry-panel');
}

// ── Load score entry
async function loadScoreEntry() {
  if (!selectedScoreStudent) { alert('Please search and select a student first.'); return; }
  if (!selectedScoreSubject) { alert('Please search and select a subject first.'); return; }
  const profile = studentProfileCache[selectedScoreStudent._id];
  if (profile && profile.saved) {
    renderProfileSavedBanner();
    loadSubjectScorePanel();
  } else {
    showProfileForm();
  }
}

function showProfileForm() {
  const ts = getTermSettings();
  setHTML('sc-days-total-label', `out of ${ts.schoolDays || '—'} days`);
  setValue('sc-days-present', '');
  setValue('sc-conduct',      '');
  setValue('sc-interest',     '');
  hide('score-entry-panel');
  hide('profile-saved-banner');
  show('attendance-step');
  document.getElementById('attendance-step').scrollIntoView({ behavior: 'smooth' });
}

function renderProfileSavedBanner() {
  const profile = studentProfileCache[selectedScoreStudent._id];
  const banner  = document.getElementById('profile-saved-banner');
  if (banner) {
    banner.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
        <div style="font-size:13px">
          ✅ <b>Profile saved</b> —
          Attendance: <b>${profile.daysPresent}</b> days &nbsp;|&nbsp;
          Conduct: <b>${profile.conduct || '—'}</b> &nbsp;|&nbsp;
          Interest: <b>${profile.interest || '—'}</b>
        </div>
        <button class="btn-g" style="font-size:12px;padding:4px 12px"
          onclick="editStudentProfile()">✏️ Edit Profile</button>
      </div>`;
    show('profile-saved-banner');
  }
  hide('attendance-step');
}

function editStudentProfile() {
  const studentId = selectedScoreStudent?._id;
  if (!studentId) return;
  const profile = studentProfileCache[studentId];
  const ts      = getTermSettings();
  setHTML('sc-days-total-label', `out of ${ts.schoolDays || '—'} days`);
  setValue('sc-days-present', profile?.daysPresent || '');
  setValue('sc-conduct',      profile?.conduct     || '');
  setValue('sc-interest',     profile?.interest    || '');
  hide('profile-saved-banner');
  show('attendance-step');
  document.getElementById('attendance-step').scrollIntoView({ behavior: 'smooth' });
}

// ── Save profile — KEY FIX: also update all existing scores in DB
async function saveAttendanceAndContinue() {
  const daysPresent = Number(getValue('sc-days-present'));
  const conduct     = getValue('sc-conduct');
  const interest    = getValue('sc-interest');
  const ts          = getTermSettings();

  if (isNaN(daysPresent) || daysPresent < 0) {
    showMsg('att-msg', 'Please enter a valid number of days.', 'error'); return;
  }
  if (ts.schoolDays && daysPresent > Number(ts.schoolDays)) {
    showMsg('att-msg', `Days present cannot exceed ${ts.schoolDays}.`, 'error'); return;
  }

  // Save to cache immediately
  studentProfileCache[selectedScoreStudent._id] = { daysPresent, conduct, interest, saved: true };

  // Update existing scores in DB with profile data
  const studentScores = allScores.filter(sc => sc.studentId === selectedScoreStudent._id);
  try {
    if (studentScores.length) {
      await Promise.all(studentScores.map(sc =>
        fetch(`${API}/scores/${sc._id}`, {
          method: 'PUT',
          headers: authHeaders(),
          body: JSON.stringify({ daysPresent, conduct, interest })
        })
      ));
      // Refresh scores so cache stays in sync
      await fetchScores();
    }
    showMsg('att-msg', '✅ Profile saved!', 'success');
  } catch(e) {
    showMsg('att-msg', 'Failed to save profile.', 'error'); return;
  }

  renderProfileSavedBanner();
  loadSubjectScorePanel();
}

function loadSubjectScorePanel() {
  if (!selectedScoreStudent || !selectedScoreSubject) return;
  const existing = allScores.find(sc =>
    sc.studentId === selectedScoreStudent._id &&
    sc.subjectId === selectedScoreSubject._id
  );
  setHTML('score-panel-title', `${selectedScoreStudent.name} — ${selectedScoreSubject.name}`);
  setValue('sc-sba',      existing ? existing.sbaScore : '');
  setValue('sc-exam-raw', existing ? existing.examRaw  : '');
  if (existing) calcScoreTotal();
  else {
    setHTML('sc-total', '0');
    setHTML('sc-grade-display', '—');
    setHTML('sc-remark-display', '—');
  }
  show('score-entry-panel');
  document.getElementById('score-entry-panel').scrollIntoView({ behavior: 'smooth' });
}

function calcScoreTotal() {
  const sba           = Math.min(Number(getValue('sc-sba'))      || 0, 50);
  const examRaw       = Math.min(Number(getValue('sc-exam-raw')) || 0, 100);
  const examConverted = Math.round(examRaw / 2);
  const total         = sba + examConverted;
  setHTML('sc-total', total);
  const info    = getGradeInfo(total);
  const gradeEl = document.getElementById('sc-grade-display');
  gradeEl.textContent = info.grade;
  gradeEl.style.color = '';
  setHTML('sc-remark-display', info.remark);
}

async function saveScore() {
  if (!selectedScoreStudent || !selectedScoreSubject) {
    showMsg('sc-msg', 'No student or subject selected.', 'error'); return;
  }
  const profile = studentProfileCache[selectedScoreStudent._id];
  if (!profile || !profile.saved) {
    showMsg('sc-msg', 'Please save student profile first.', 'error'); return;
  }
  const sba     = Number(getValue('sc-sba'))      || 0;
  const examRaw = Number(getValue('sc-exam-raw')) || 0;
  if (sba > 50)      { showMsg('sc-msg', 'SBA cannot exceed 50.',   'error'); return; }
  if (examRaw > 100) { showMsg('sc-msg', 'Exam cannot exceed 100.', 'error'); return; }
  const examConverted = Math.round(examRaw / 2);
  const total         = sba + examConverted;

  const body = {
    studentId:   selectedScoreStudent._id,
    studentName: selectedScoreStudent.name,
    className:   selectedScoreStudent.className,
    subjectId:   selectedScoreSubject._id,
    subjectName: selectedScoreSubject.name,
    sbaScore:    sba,
    examRaw,
    examScore:   examConverted,
    total,
    daysPresent: profile.daysPresent,
    conduct:     profile.conduct,
    interest:    profile.interest
  };

  try {
    const existing = allScores.find(sc =>
      sc.studentId === selectedScoreStudent._id &&
      sc.subjectId === selectedScoreSubject._id
    );
    const url    = existing ? `${API}/scores/${existing._id}` : `${API}/scores`;
    const method = existing ? 'PUT' : 'POST';
    const res    = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(body) });
    const data   = await res.json();
    if (data.success) {
      showMsg('sc-msg', `✅ Saved! (SBA: ${sba} + Exam: ${examConverted} = ${total}/100)`, 'success');
      await fetchScores();
      onScoreSubjectPick();
    } else {
      showMsg('sc-msg', data.message, 'error');
    }
  } catch(e) { showMsg('sc-msg', 'Save failed.', 'error'); }
}

function renderScoreTable(list) {
  const tbody = document.getElementById('sc-tbody');
  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="10" class="empty">No scores entered yet.</td></tr>`; return;
  }
  tbody.innerHTML = list.map((sc, i) => {
    const info = getGradeInfo(sc.total);
    return `
      <tr>
        <td>${i+1}</td><td>${sc.studentName}</td><td>${sc.subjectName}</td>
        <td>${sc.sbaScore}</td><td>${sc.examRaw}</td><td>${sc.examScore}</td>
        <td><b>${sc.total}</b></td>
        <td><span class="gb ${info.cls}">${info.grade}</span></td>
        <td style="font-size:11.5px;color:var(--muted)">${info.remark}</td>
        <td>
          <button class="tbl-edit" onclick="editScoreEntry('${sc._id}','${sc.studentId}','${sc.subjectId}')">✏️</button>
          <button class="tbl-delete" onclick="deleteScore('${sc._id}')">🗑️</button>
        </td>
      </tr>`;
  }).join('');
}

function filterScoreTable() {
  const q = getValue('sc-table-search').toLowerCase();
  renderScoreTable(allScores.filter(sc =>
    sc.studentName.toLowerCase().includes(q) ||
    sc.subjectName.toLowerCase().includes(q)
  ));
}

function editScoreEntry(scoreId, studentId, subjectId) {
  selectedScoreStudent = allStudents.find(s => s._id === studentId);
  selectedScoreSubject = allSubjects.find(s => s._id === subjectId);
  if (!selectedScoreStudent || !selectedScoreSubject) return;
  const sc = allScores.find(s => s._id === scoreId);
  const sChip = document.getElementById('sc-student-chosen');
  sChip.innerHTML = `<span>👤 ${selectedScoreStudent.name} (${selectedScoreStudent.studentId})</span>`;
  show(sChip);
  const subChip = document.getElementById('sc-subject-chosen');
  subChip.innerHTML = `<span>📚 ${selectedScoreSubject.name}</span>
    <span style="margin-left:8px;background:#10B981;color:white;padding:2px 8px;border-radius:10px;font-size:11px">✅ Score entered</span>`;
  show(subChip);
  studentProfileCache[studentId] = {
    daysPresent: sc.daysPresent ?? 0,
    conduct:     sc.conduct     || '',
    interest:    sc.interest    || '',
    saved:       true
  };
  renderProfileSavedBanner();
  setValue('sc-sba',      sc.sbaScore);
  setValue('sc-exam-raw', sc.examRaw);
  calcScoreTotal();
  setHTML('score-panel-title', `${selectedScoreStudent.name} — ${selectedScoreSubject.name}`);
  show('score-entry-panel');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function deleteScore(id) {
  if (!confirm('Delete this score record?')) return;
  try {
    const data = await (await fetch(`${API}/scores/${id}`, { method: 'DELETE', headers: authHeaders() })).json();
    if (data.success) { await fetchScores(); }
    else alert(data.message);
  } catch(e) { alert('Delete failed.'); }
}

// ═══════════════════════════════════════════════
// MASTERSHEET
// ═══════════════════════════════════════════════
async function initMastersheet() {
  await fetchStudents(); await fetchScores();
  populateClassSelect('ms-class');
}

async function loadMastersheet() {
  const className = getValue('ms-class');
  if (!className) return;
  const classStudents = allStudents.filter(s => s.className === className);
  if (!classStudents.length) { alert('No students in this class.'); return; }
  const classScores = allScores.filter(s => s.className === className);
  const subjects    = [...new Set(classScores.map(s => s.subjectName))].sort();
  const totals = {};
  classStudents.forEach(s => { totals[s._id] = 0; });
  classScores.forEach(sc => { if (totals[sc.studentId] !== undefined) totals[sc.studentId] += sc.total; });
  const rows = classStudents.map(s => {
    const subScores = subjects.map(sub => {
      const found = classScores.find(sc => sc.studentId === s._id && sc.subjectName === sub);
      return found ? found.total : '—';
    });
    return { student: s, subScores, total: totals[s._id] || 0 };
  }).sort((a, b) => b.total - a.total).map((r, i) => ({ ...r, rank: i + 1 }));
  setHTML('ms-title', `Mastersheet — ${className} (${classStudents.length} students)`);
  show('ms-content');
  document.getElementById('ms-tbl-wrap').innerHTML = `
    <table>
      <thead><tr>
        <th>Rank</th><th>Student Name</th><th>Student ID</th>
        ${subjects.map(s => `<th>${s}</th>`).join('')}
        <th>Total</th><th>Average</th>
      </tr></thead>
      <tbody>
        ${rows.map(r => {
          const nums = r.subScores.filter(v => v !== '—').map(Number);
          const avg  = nums.length ? (nums.reduce((a,b)=>a+b,0)/nums.length).toFixed(1) : '—';
          const rc   = r.rank===1?'rank-1':r.rank===2?'rank-2':r.rank===3?'rank-3':'';
          const bc   = r.rank===1?'r1':r.rank===2?'r2':r.rank===3?'r3':'rn';
          return `<tr class="${rc}">
            <td><span class="rbadge ${bc}">${r.rank}</span></td>
            <td>${r.student.name}</td>
            <td style="color:var(--muted);font-size:12px">${r.student.studentId}</td>
            ${r.subScores.map(sc => `<td>${sc}</td>`).join('')}
            <td><b style="color:var(--accent)">${r.total}</b></td>
            <td style="color:var(--muted)">${avg}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>`;
}

// ═══════════════════════════════════════════════
// REPORTS
// ═══════════════════════════════════════════════
async function initReports() {
  await fetchStudents(); await fetchScores();
  populateReportSelect();
}

async function downloadReportAsPDF() {
  if (!currentReportStudentId) { alert('Please load a student report first.'); return; }
  const ts = getTermSettings();
  try {
    const res = await fetch(`${API}/pdf/report`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        studentId:  currentReportStudentId,
        term:       ts.term       || '',
        session:    ts.session    || '',
        noOnRoll:   ts.roll       || '',
        termCloses: ts.closes     || '',
        nextTerm:   ts.resumes    || '',
        totalDays:  ts.schoolDays || ''
      })
    });
    if (!res.ok) { const err = await res.json(); alert(err.message || 'Failed to generate PDF.'); return; }
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `report-${currentReportStudentId}.pdf`; a.click();
    URL.revokeObjectURL(url);
  } catch(e) { alert('PDF generation failed. Check server.'); }
}

function populateReportSelect() {
  const sel = document.getElementById('rp-select');
  sel.innerHTML = `<option value="">-- Select Student --</option>` +
    allStudents.map(s => `<option value="${s._id}">${s.name} (${s.studentId}) — ${s.className}</option>`).join('');
}

function filterReportStudents() {
  const q         = getValue('rp-search').toLowerCase();
  const container = document.getElementById('rp-search-results');
  if (!q) { container.innerHTML = ''; return; }
  const matches = allStudents.filter(s =>
    s.name.toLowerCase().includes(q) || s.studentId.toLowerCase().includes(q)
  );
  if (!matches.length) { container.innerHTML = `<p style="font-size:13px;color:var(--muted)">No students found.</p>`; return; }
  container.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:8px">` +
    matches.map(s => `
      <button class="quick-card" onclick="loadReportCard('${s._id}')">
        ${s.name} <span style="color:var(--muted);font-size:11px">${s.className}</span>
      </button>`).join('') + `</div>`;
}

async function loadReportCard(studentId) {
  const student = allStudents.find(s => s._id === studentId);
  if (!student) return;
  currentReportStudentId = studentId;

  const ts            = getTermSettings();
  const studentScores = allScores.filter(sc => sc.studentId === studentId).sort((a,b) => a.subjectName.localeCompare(b.subjectName));
  const logo          = getLogoSrc();
  const crestWrap     = document.getElementById('rc-crest-wrap');

  if (logo && crestWrap) {
    crestWrap.innerHTML = `<img src="${logo}" style="width:88px;height:88px;border-radius:8px;object-fit:cover;"/>`;
  } else if (crestWrap) {
    crestWrap.innerHTML = `<span id="rc-crest-initial">${(ts.schoolName || 'E')[0].toUpperCase()}</span>`;
  }

  const classStudents = allStudents.filter(s => s.className === student.className);
  const classTotals   = classStudents.map(s => ({
    id: s._id,
    total: allScores.filter(sc => sc.studentId === s._id).reduce((sum, sc) => sum + sc.total, 0)
  })).sort((a, b) => b.total - a.total);
  const rankIndex  = classTotals.findIndex(r => r.id === studentId);
  const rank       = rankIndex >= 0 ? rankIndex + 1 : 0;
  const rankText   = rank > 0 ? `${rank} of ${classStudents.length}` : '—';

  const grandTotal = studentScores.reduce((sum, sc) => sum + sc.total, 0);
  const avg        = studentScores.length ? (grandTotal / studentScores.length).toFixed(1) : '0';
  const days       = studentScores.length ? studentScores[0].daysPresent : null;
  const conduct    = studentScores.length ? (studentScores[0].conduct  || '—') : '—';
  const interest   = studentScores.length ? (studentScores[0].interest || '—') : '—';
  const attendance = ts.schoolDays ? `${days ?? '—'} out of ${ts.schoolDays} days` : '—';

  // Auto-generate remarks
  const avgNum         = parseFloat(avg);
  const teacherRemark  = generateTeacherRemark(avgNum, rank);
  const headRemark     = generateHeadRemark(avgNum, rank);

  // Fill header
  setHTML('rc-school-name',     (ts.schoolName || 'My School').toUpperCase());
  setHTML('rc-school-address',  ts.address || '');
  setHTML('rc-school-contacts', ts.phones ? `Tel: ${ts.phones}` : '');
  setHTML('rc-school-pobox',    ts.pobox  || '');

  // Fill bio
  setHTML('rc-name',        student.name);
  setHTML('rc-class',       student.className);
  setHTML('rc-roll',        ts.roll    || '—');
  setHTML('rc-term',        ts.term    || '—');
  setHTML('rc-attendance',  attendance);
  setHTML('rc-closes',      ts.closes  ? fmtDateFull(ts.closes)  : '—');
  setHTML('rc-resumes',     ts.resumes ? fmtDateFull(ts.resumes) : '—');
  setHTML('rc-rank',        rankText);
  setHTML('rc-grand-total', grandTotal);
  setHTML('rc-average',     avg);

  // Fill conduct, interest, remarks in HTML preview
  setHTML('rc-conduct',        conduct);
  setHTML('rc-interest',       interest);
  setHTML('rc-teacher-remark', teacherRemark);
  setHTML('rc-head-remark',    headRemark);

  // Scores table
  const tbody = document.getElementById('rc-tbody');
  tbody.innerHTML = !studentScores.length
    ? `<tr><td colspan="6" style="text-align:center;padding:20px;color:#999">No scores recorded yet.</td></tr>`
    : studentScores.map(sc => {
        const info = getGradeInfo(sc.total);
        return `<tr>
          <td>${sc.subjectName}</td><td>${sc.sbaScore}</td><td>${sc.examScore}</td>
          <td><b>${sc.total}</b></td><td>${info.grade}</td><td>${info.remark}</td>
        </tr>`;
      }).join('');

  show('rp-preview');
  document.getElementById('rp-preview').scrollIntoView({ behavior: 'smooth' });
}

// ═══════════════════════════════════════════════
// ADMIN
// ═══════════════════════════════════════════════
function initAdmin() {
  if (adminAuthed) { hide('admin-gate'); show('admin-panel'); loadAdminData(); }
  else             { show('admin-gate'); hide('admin-panel'); }
}

async function authenticateAdmin() {
  const email = getValue('adm-email'), password = getValue('adm-password');
  if (!email || !password) { showMsg('adm-auth-msg','Please enter credentials.','error'); return; }
  try {
    const data = await (await fetch(`${API}/auth/admin-login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })).json();
    if (data.success && data.isAdmin) {
      adminAuthed = true; hide('admin-gate'); show('admin-panel'); loadAdminData();
    } else { showMsg('adm-auth-msg', data.message || 'Access denied.', 'error'); }
  } catch(e) { showMsg('adm-auth-msg', 'Server error.', 'error'); }
}

async function loadAdminData() {
  try {
    const [sRes, scRes, tRes] = await Promise.all([
      fetch(`${API}/students`,      { headers: authHeaders() }),
      fetch(`${API}/scores`,        { headers: authHeaders() }),
      fetch(`${API}/auth/teachers`, { headers: authHeaders() }),
    ]);
    const students = (await sRes.json()).data  || [];
    const scores   = (await scRes.json()).data || [];
    const teachers = (await tRes.json()).data  || [];
    setHTML('adm-s',    students.length);
    setHTML('adm-t',    teachers.length);
    setHTML('adm-subj', [...new Set(scores.map(s => s.subjectName))].length);
    setHTML('adm-sc',   scores.length);
    const tbody = document.getElementById('adm-teachers-tbody');
    tbody.innerHTML = teachers.map((t, i) => `
      <tr>
        <td>${i+1}</td><td>${t.firstName} ${t.lastName}</td>
        <td style="color:var(--muted)">${t.email}</td><td>${t.className}</td>
        <td><span class="gb ${t.role==='admin'?'s-a':'s-b'}">${t.role||'teacher'}</span></td>
        <td style="color:var(--muted);font-size:12px">${fmtDate(t.createdAt)}</td>
        <td>${t.role!=='admin'
          ? `<button class="tbl-delete" onclick="adminDeleteTeacher('${t._id}')">🗑️ Remove</button>`
          : '<span style="color:var(--muted);font-size:12px">Admin</span>'}</td>
      </tr>`).join('') || `<tr><td colspan="7" class="empty">No teachers found.</td></tr>`;
  } catch(e) { console.error('Admin load error:', e); }
}

async function adminDeleteTeacher(id) {
  if (!confirm('Remove this teacher?')) return;
  try {
    const data = await (await fetch(`${API}/auth/users/${id}`, { method: 'DELETE', headers: authHeaders() })).json();
    if (data.success) loadAdminData(); else alert(data.message);
  } catch(e) { alert('Delete failed.'); }
}

async function adminClearScores() {
  if (!confirm('⚠️ Delete ALL scores permanently?')) return;
  if (!confirm('Last confirmation: Clear ALL scores?')) return;
  try {
    const data = await (await fetch(`${API}/scores/all`, { method: 'DELETE', headers: authHeaders() })).json();
    if (data.success) { alert('✅ All scores cleared.'); loadAdminData(); } else alert(data.message);
  } catch(e) { alert('Failed.'); }
}

async function adminClearStudents() {
  if (!confirm('⚠️ Delete ALL students permanently?')) return;
  if (!confirm('Last confirmation: Delete ALL students?')) return;
  try {
    const data = await (await fetch(`${API}/students/all`, { method: 'DELETE', headers: authHeaders() })).json();
    if (data.success) { alert('✅ All students cleared.'); loadAdminData(); } else alert(data.message);
  } catch(e) { alert('Failed.'); }
}

// ── LOGO MANAGEMENT ───────────────────────────
function handleLogoFile(file) {
  if (!file) return;
  if (!file.type.startsWith('image/')) { showMsg('logo-msg','Please upload an image file.','error'); return; }
  if (file.size > 500 * 1024)          { showMsg('logo-msg','File too large. Max 500KB.','error');  return; }
  const reader = new FileReader();
  reader.onload = (e) => {
    localStorage.setItem('edutrack_logo', e.target.result);
    renderLogoPreview(e.target.result);
    showMsg('logo-msg','✅ Logo saved!','success');
  };
  reader.readAsDataURL(file);
}

function renderLogoPreview(src) {
  const wrap = document.getElementById('logo-preview-wrap');
  if (!wrap) return;
  wrap.innerHTML = src
    ? `<div style="position:relative;display:inline-block">
        <img src="${src}" style="width:90px;height:90px;border-radius:8px;
          object-fit:cover;border:3px solid var(--accent);box-shadow:0 0 20px var(--accent-g)"/>
        <button onclick="removeLogo()" style="position:absolute;top:-6px;right:-6px;
          width:22px;height:22px;border-radius:50%;background:var(--red);
          border:none;color:white;font-size:14px;cursor:pointer;font-weight:700">×</button>
      </div>
      <p style="font-size:11px;color:var(--muted);margin-top:6px">Logo uploaded ✓</p>`
    : `<div style="width:90px;height:90px;border-radius:50%;border:2px dashed var(--border);
        display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:28px">🏫</div>
       <p style="font-size:11px;color:var(--muted);margin-top:6px">No logo yet</p>`;
}

function removeLogo() {
  if (!confirm('Remove the school logo?')) return;
  localStorage.removeItem('edutrack_logo'); renderLogoPreview(null);
}
function getLogoSrc() { return localStorage.getItem('edutrack_logo') || null; }

// ═══════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════
function populateClassSelect(id) {
  const sel = document.getElementById(id);
  if (!sel) return;
  const classes = [...new Set(allStudents.map(s => s.className))].sort();
  const cur = sel.value;
  sel.innerHTML = `<option value="">-- Choose a Class --</option>` +
    classes.map(c => `<option value="${c}" ${c===cur?'selected':''}>${c}</option>`).join('');
}

function getValue(id)      { return (document.getElementById(id)?.value || '').trim(); }
function setValue(id, val) { const el = document.getElementById(id); if (el) el.value = val; }
function setHTML(id, html) { const el = document.getElementById(id); if (el) el.innerHTML = html; }
function show(el)          { const e = typeof el==='string'?document.getElementById(el):el; if(e) e.style.display='block'; }
function hide(el)          { const e = typeof el==='string'?document.getElementById(el):el; if(e) e.style.display='none'; }
function esc(s)            { return String(s).replace(/'/g,"\\'").replace(/"/g,'&quot;'); }
function fmtDate(d)        { return d ? new Date(d).toLocaleDateString() : '—'; }
function fmtDateFull(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' });
}
function showMsg(id, text, type) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text; el.className = `msg ${type}`;
  if (text) setTimeout(() => { el.textContent=''; el.className='msg'; }, 5000);
}

// ═══════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  updateTermChip();
  initDashboard();
});