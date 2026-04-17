// ─── Config ────────────────────────────────────────────────────────────────
const API = 'http://localhost:3001/api';

// ─── State ─────────────────────────────────────────────────────────────────
let state = {
  jobs: [],
  candidates: [],
  stats: {},
  editingJobId: null,
  currentPage: 'dashboard'
};

// ─── Navigation ────────────────────────────────────────────────────────────
function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(`page-${page}`).classList.add('active');
  document.querySelector(`[data-page="${page}"]`).classList.add('active');

  const titles = { dashboard: 'Dashboard', jobs: 'Job Listings', apply: 'Submit Application', candidates: 'Candidates' };
  document.getElementById('pageTitle').textContent = titles[page];
  state.currentPage = page;

  if (page === 'dashboard') loadDashboard();
  if (page === 'jobs') loadJobs();
  if (page === 'apply') loadJobOptions();
  if (page === 'candidates') loadCandidates();
}

// ─── API Helpers ────────────────────────────────────────────────────────────
async function apiFetch(endpoint, opts = {}) {
  const res = await fetch(`${API}${endpoint}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ─── Dashboard ─────────────────────────────────────────────────────────────
async function loadDashboard() {
  try {
    const [stats, candidates] = await Promise.all([
      apiFetch('/stats'),
      apiFetch('/candidates')
    ]);
    state.stats = stats;
    state.candidates = candidates;

    document.getElementById('stat-jobs').querySelector('.stat-num').textContent = stats.totalJobs;
    document.getElementById('stat-total').querySelector('.stat-num').textContent = stats.totalCandidates;
    document.getElementById('stat-short').querySelector('.stat-num').textContent = stats.shortlisted;
    document.getElementById('stat-review').querySelector('.stat-num').textContent = stats.underReview;
    document.getElementById('stat-reject').querySelector('.stat-num').textContent = stats.rejected;
    document.getElementById('stat-score').querySelector('.stat-num').textContent = stats.avgScore || '—';

    // Chart
    const maxCount = Math.max(...stats.byJob.map(j => j.count), 1);
    document.getElementById('jobChart').innerHTML = stats.byJob.map(j => `
      <div class="chart-bar-row">
        <div class="chart-bar-label" title="${j.job}">${j.job}</div>
        <div class="chart-bar-track">
          <div class="chart-bar-fill" style="width:${(j.count / maxCount) * 100}%"></div>
        </div>
        <div class="chart-bar-count">${j.count}</div>
      </div>
    `).join('') || '<div class="empty-state"><div class="empty-icon">◧</div><div class="empty-text">No data yet</div></div>';

    // Recent candidates
    const recent = [...candidates].sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt)).slice(0, 6);
    document.getElementById('recentList').innerHTML = recent.length
      ? recent.map(c => `
        <div class="recent-item" onclick="openCandidateModal(${c.id})">
          <div class="recent-avatar">${initials(c.name)}</div>
          <div class="recent-info">
            <div class="recent-name">${esc(c.name)}</div>
            <div class="recent-role">${esc(c.jobTitle)}</div>
          </div>
          <div class="recent-score" style="color:${scoreColor(c.score)}">${c.score}</div>
          <span class="badge ${badgeClass(c.status)}">${c.status}</span>
        </div>
      `).join('')
      : '<div class="empty-state"><div class="empty-icon">◫</div><div class="empty-text">No applicants yet</div></div>';
  } catch (e) {
    console.error('Dashboard error:', e);
    showToast('Could not connect to server. Make sure backend is running on port 3001.', 'error');
  }
}

// ─── Jobs ──────────────────────────────────────────────────────────────────
async function loadJobs() {
  state.jobs = await apiFetch('/jobs');
  renderJobs();
}

function renderJobs() {
  document.getElementById('jobsList').innerHTML = state.jobs.map(j => `
    <div class="job-card">
      <div class="job-card-dept">${esc(j.department)}</div>
      <div class="job-card-title">${esc(j.title)}</div>
      <div class="job-card-meta">
        <span class="job-meta-item">📅 ${j.experience}+ yrs</span>
        <span class="job-meta-item">🎓 ${j.education}</span>
      </div>
      <div class="job-skills">
        ${j.skills.slice(0, 4).map(s => `<span class="skill-tag">${esc(s)}</span>`).join('')}
        ${j.skills.length > 4 ? `<span class="skill-tag">+${j.skills.length - 4}</span>` : ''}
      </div>
      <div class="job-actions">
        <button class="btn btn-ghost btn-sm" onclick="editJob(${j.id})">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deleteJob(${j.id})">Delete</button>
      </div>
    </div>
  `).join('') || '<div class="empty-state" style="padding:40px"><div class="empty-icon">◧</div><div class="empty-text">No jobs yet. Add one!</div></div>';
}

function openJobModal(id) {
  state.editingJobId = id || null;
  document.getElementById('jobModalTitle').textContent = id ? 'Edit Job' : 'Add New Job';
  if (!id) {
    ['jTitle','jDept','jSkills','jDesc'].forEach(f => document.getElementById(f).value = '');
    document.getElementById('jExp').value = 2;
    document.getElementById('jEdu').value = 'Bachelor';
  }
  document.getElementById('jobModal').classList.add('open');
}

function closeJobModal() { document.getElementById('jobModal').classList.remove('open'); }

function editJob(id) {
  const job = state.jobs.find(j => j.id === id);
  if (!job) return;
  document.getElementById('jTitle').value = job.title;
  document.getElementById('jDept').value = job.department;
  document.getElementById('jExp').value = job.experience;
  document.getElementById('jEdu').value = job.education;
  document.getElementById('jSkills').value = job.skills.join(', ');
  document.getElementById('jDesc').value = job.description;
  openJobModal(id);
}

async function saveJob() {
  const payload = {
    title: document.getElementById('jTitle').value.trim(),
    department: document.getElementById('jDept').value.trim() || 'General',
    experience: parseInt(document.getElementById('jExp').value) || 0,
    education: document.getElementById('jEdu').value,
    skills: document.getElementById('jSkills').value.split(',').map(s => s.trim()).filter(Boolean),
    description: document.getElementById('jDesc').value.trim()
  };
  if (!payload.title) return showToast('Job title is required', 'error');
  if (!payload.skills.length) return showToast('At least one skill is required', 'error');

  if (state.editingJobId) {
    await apiFetch(`/jobs/${state.editingJobId}`, { method: 'PUT', body: JSON.stringify(payload) });
    showToast('Job updated successfully');
  } else {
    await apiFetch('/jobs', { method: 'POST', body: JSON.stringify(payload) });
    showToast('Job created successfully');
  }
  closeJobModal();
  loadJobs();
}

async function deleteJob(id) {
  if (!confirm('Delete this job? This cannot be undone.')) return;
  await apiFetch(`/jobs/${id}`, { method: 'DELETE' });
  showToast('Job deleted');
  loadJobs();
}

// ─── Apply ─────────────────────────────────────────────────────────────────
async function loadJobOptions() {
  state.jobs = await apiFetch('/jobs');
  const sel = document.getElementById('aJobId');
  sel.innerHTML = state.jobs.map(j => `<option value="${j.id}">${esc(j.title)}</option>`).join('');
}

function handleFileSelect(input) {
  const file = input.files[0];
  if (file) {
    const drop = document.getElementById('fileDrop');
    drop.innerHTML = `
      <div class="file-drop-icon">✓</div>
      <div class="file-drop-text">${esc(file.name)}</div>
      <div class="file-drop-hint">${(file.size / 1024).toFixed(1)} KB</div>
    `;
    drop.style.borderColor = 'var(--green)';
  }
}

async function submitApplication() {
  const fd = new FormData();
  const fields = {
    jobId: 'aJobId', name: 'aName', email: 'aEmail', phone: 'aPhone',
    experience: 'aExp', education: 'aEdu', skills: 'aSkills',
    certifications: 'aCerts', summary: 'aSummary'
  };
  for (const [key, id] of Object.entries(fields)) {
    fd.append(key, document.getElementById(id).value);
  }
  const file = document.getElementById('aFile').files[0];
  if (file) fd.append('resume', file);

  if (!fd.get('name') || !fd.get('email') || !fd.get('skills')) {
    return showToast('Please fill in all required fields', 'error');
  }

  try {
    const btn = document.querySelector('#page-apply .btn-full');
    btn.textContent = 'Screening...'; btn.disabled = true;

    const result = await fetch(`${API}/candidates`, { method: 'POST', body: fd });
    const candidate = await result.json();

    btn.textContent = 'Submit & Screen Now →'; btn.disabled = false;

    // Show result
    const panel = document.getElementById('resultPanel');
    panel.style.display = 'block';
    panel.scrollIntoView({ behavior: 'smooth' });

    // Animate score ring
    const circumference = 314;
    const offset = circumference - (candidate.score / 100) * circumference;
    document.getElementById('resultScore').textContent = candidate.score;
    document.getElementById('ringFill').style.stroke = scoreColor(candidate.score);
    setTimeout(() => {
      document.getElementById('ringFill').style.strokeDashoffset = offset;
    }, 100);

    const statusEl = document.getElementById('resultStatus');
    statusEl.textContent = candidate.status;
    statusEl.style.color = candidate.status === 'Shortlisted' ? 'var(--green)' :
      candidate.status === 'Under Review' ? 'var(--yellow)' : 'var(--red)';

    const bd = candidate.breakdown;
    document.getElementById('resultBreakdown').innerHTML = `
      <div class="breakdown-item">
        <div class="breakdown-score">${bd.skills.score}</div>
        <div class="breakdown-max">/ ${bd.skills.max}</div>
        <div class="breakdown-label">Skills</div>
      </div>
      <div class="breakdown-item">
        <div class="breakdown-score">${bd.experience.score}</div>
        <div class="breakdown-max">/ ${bd.experience.max}</div>
        <div class="breakdown-label">Experience</div>
      </div>
      <div class="breakdown-item">
        <div class="breakdown-score">${bd.education.score}</div>
        <div class="breakdown-max">/ ${bd.education.max}</div>
        <div class="breakdown-label">Education</div>
      </div>
      <div class="breakdown-item">
        <div class="breakdown-score">${bd.bonus.score}</div>
        <div class="breakdown-max">/ ${bd.bonus.max}</div>
        <div class="breakdown-label">Bonus</div>
      </div>
    `;

    document.getElementById('resultFeedback').innerHTML = candidate.feedback
      .map(f => `<div class="feedback-item">${f}</div>`).join('');

    showToast('Application submitted and screened!');
  } catch (e) {
    showToast('Submission failed. Is the backend running?', 'error');
    document.querySelector('#page-apply .btn-full').textContent = 'Submit & Screen Now →';
    document.querySelector('#page-apply .btn-full').disabled = false;
  }
}

// ─── Candidates ────────────────────────────────────────────────────────────
async function loadCandidates() {
  const [candidates, jobs] = await Promise.all([
    apiFetch('/candidates'),
    apiFetch('/jobs')
  ]);
  state.candidates = candidates;
  state.jobs = jobs;

  const jobFilter = document.getElementById('jobFilter');
  jobFilter.innerHTML = `<option value="">All Jobs</option>` +
    jobs.map(j => `<option value="${j.id}">${esc(j.title)}</option>`).join('');

  renderCandidates(candidates);
}

function filterCandidates() {
  const search = document.getElementById('searchInput').value.toLowerCase();
  const status = document.getElementById('statusFilter').value;
  const jobId = document.getElementById('jobFilter').value;

  const filtered = state.candidates.filter(c => {
    const matchSearch = !search ||
      c.name.toLowerCase().includes(search) ||
      c.email.toLowerCase().includes(search) ||
      c.skills.some(s => s.toLowerCase().includes(search));
    const matchStatus = !status || c.status === status;
    const matchJob = !jobId || c.jobId === parseInt(jobId);
    return matchSearch && matchStatus && matchJob;
  });
  renderCandidates(filtered);
}

function renderCandidates(list) {
  if (!list.length) {
    document.getElementById('candidatesTable').innerHTML =
      '<div class="empty-state"><div class="empty-icon">◫</div><div class="empty-text">No candidates found</div></div>';
    return;
  }
  document.getElementById('candidatesTable').innerHTML = `
    <table class="candidates-table">
      <thead>
        <tr>
          <th>Candidate</th>
          <th>Position</th>
          <th>Skills</th>
          <th>Experience</th>
          <th>Score</th>
          <th>Status</th>
          <th>Applied</th>
        </tr>
      </thead>
      <tbody>
        ${list.sort((a, b) => b.score - a.score).map(c => `
          <tr onclick="openCandidateModal(${c.id})">
            <td>
              <div style="display:flex;align-items:center;gap:10px">
                <div class="recent-avatar" style="width:32px;height:32px;font-size:12px">${initials(c.name)}</div>
                <div>
                  <div style="font-weight:500">${esc(c.name)}</div>
                  <div style="font-size:12px;color:var(--muted)">${esc(c.email)}</div>
                </div>
              </div>
            </td>
            <td style="color:var(--muted);font-size:13px">${esc(c.jobTitle)}</td>
            <td>
              <div style="display:flex;flex-wrap:wrap;gap:4px">
                ${c.skills.slice(0, 3).map(s => `<span class="skill-tag">${esc(s)}</span>`).join('')}
                ${c.skills.length > 3 ? `<span class="skill-tag">+${c.skills.length - 3}</span>` : ''}
              </div>
            </td>
            <td style="color:var(--muted)">${c.experience} yr${c.experience !== 1 ? 's' : ''}</td>
            <td>
              <div class="score-bar">
                <div class="score-mini" style="color:${scoreColor(c.score)}">${c.score}</div>
                <div class="score-track">
                  <div class="score-fill" style="width:${c.score}%"></div>
                </div>
              </div>
            </td>
            <td><span class="badge ${badgeClass(c.status)}">${c.status}</span></td>
            <td style="color:var(--muted);font-size:12px">${formatDate(c.appliedAt)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

async function openCandidateModal(id) {
  const c = state.candidates.find(c => c.id === id);
  if (!c) return;

  document.getElementById('candModalName').textContent = c.name;
  const bd = c.breakdown || {};

  document.getElementById('candModalBody').innerHTML = `
    <div class="cand-detail-header">
      <div class="cand-detail-avatar">${initials(c.name)}</div>
      <div>
        <div class="cand-detail-name">${esc(c.name)}</div>
        <div class="cand-detail-meta">${esc(c.email)} · ${esc(c.phone || 'No phone')} · Applied for ${esc(c.jobTitle)}</div>
        <div style="margin-top:8px"><span class="badge ${badgeClass(c.status)}">${c.status}</span></div>
      </div>
    </div>

    <div class="score-section">
      <div style="display:flex;align-items:flex-end;gap:8px;margin-bottom:8px">
        <div class="score-big">${c.score}</div>
        <div style="color:var(--muted);padding-bottom:10px">/ 100 overall score</div>
      </div>
      <div class="score-breakdown-grid">
        <div class="breakdown-item"><div class="breakdown-score">${bd.skills?.score || 0}</div><div class="breakdown-max">/${bd.skills?.max || 40}</div><div class="breakdown-label">Skills</div></div>
        <div class="breakdown-item"><div class="breakdown-score">${bd.experience?.score || 0}</div><div class="breakdown-max">/${bd.experience?.max || 30}</div><div class="breakdown-label">Experience</div></div>
        <div class="breakdown-item"><div class="breakdown-score">${bd.education?.score || 0}</div><div class="breakdown-max">/${bd.education?.max || 20}</div><div class="breakdown-label">Education</div></div>
        <div class="breakdown-item"><div class="breakdown-score">${bd.bonus?.score || 0}</div><div class="breakdown-max">/${bd.bonus?.max || 10}</div><div class="breakdown-label">Bonus</div></div>
      </div>
      ${c.feedback ? `<div style="margin-top:14px;display:flex;flex-direction:column;gap:6px">${c.feedback.map(f => `<div class="feedback-item">${f}</div>`).join('')}</div>` : ''}
    </div>

    <div class="cand-detail-grid">
      <div class="cand-detail-item"><label>Experience</label><div class="val">${c.experience} years</div></div>
      <div class="cand-detail-item"><label>Education</label><div class="val">${esc(c.education)}</div></div>
      <div class="cand-detail-item"><label>Matched Skills</label><div class="val">${c.matchedSkills?.length || 0} matched</div></div>
      <div class="cand-detail-item"><label>Applied</label><div class="val">${formatDate(c.appliedAt)}</div></div>
    </div>

    <div style="margin-bottom:16px">
      <label style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);font-weight:600">All Skills</label>
      <div class="job-skills" style="margin-top:8px">
        ${c.skills.map(s => `<span class="skill-tag">${esc(s)}</span>`).join('')}
      </div>
    </div>

    ${c.certifications?.length ? `
      <div style="margin-bottom:16px">
        <label style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);font-weight:600">Certifications</label>
        <div class="job-skills" style="margin-top:8px">
          ${c.certifications.map(cert => `<span class="skill-tag" style="border-color:rgba(200,169,126,.3);color:var(--accent)">${esc(cert)}</span>`).join('')}
        </div>
      </div>
    ` : ''}

    ${c.summary ? `
      <div style="margin-bottom:20px">
        <label style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);font-weight:600">Summary</label>
        <p style="margin-top:8px;font-size:13px;color:var(--muted);line-height:1.6">${esc(c.summary)}</p>
      </div>
    ` : ''}

    <div style="display:flex;gap:10px;flex-wrap:wrap">
      <button class="btn btn-primary btn-sm" onclick="updateStatus(${c.id},'Shortlisted')">✓ Shortlist</button>
      <button class="btn btn-ghost btn-sm" onclick="updateStatus(${c.id},'Under Review')">⊙ Under Review</button>
      <button class="btn btn-danger btn-sm" onclick="updateStatus(${c.id},'Rejected')">✕ Reject</button>
      <button class="btn btn-danger btn-sm" style="margin-left:auto" onclick="deleteCandidate(${c.id})">Delete</button>
    </div>
  `;

  document.getElementById('candidateModal').classList.add('open');
}

function closeCandidateModal() {
  document.getElementById('candidateModal').classList.remove('open');
}

async function updateStatus(id, status) {
  await apiFetch(`/candidates/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) });
  showToast(`Status updated to: ${status}`);
  closeCandidateModal();
  loadCandidates();
}

async function deleteCandidate(id) {
  if (!confirm('Delete this candidate? This cannot be undone.')) return;
  await apiFetch(`/candidates/${id}`, { method: 'DELETE' });
  showToast('Candidate deleted');
  closeCandidateModal();
  loadCandidates();
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function initials(name) {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}
function esc(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}
function scoreColor(score) {
  if (score >= 80) return 'var(--green)';
  if (score >= 55) return 'var(--yellow)';
  return 'var(--red)';
}
function badgeClass(status) {
  if (status === 'Shortlisted') return 'badge-shortlisted';
  if (status === 'Under Review') return 'badge-review';
  return 'badge-rejected';
}
function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.borderColor = type === 'error' ? 'rgba(224,96,96,.3)' : 'rgba(82,201,139,.3)';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3500);
}

// ─── Close modals on overlay click ─────────────────────────────────────────
document.getElementById('jobModal').addEventListener('click', function(e) {
  if (e.target === this) closeJobModal();
});
document.getElementById('candidateModal').addEventListener('click', function(e) {
  if (e.target === this) closeCandidateModal();
});

// ─── Boot ───────────────────────────────────────────────────────────────────
loadDashboard();
