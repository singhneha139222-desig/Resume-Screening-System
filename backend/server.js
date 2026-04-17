const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Multer config for resume uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = './uploads';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only PDF, DOC, DOCX, TXT files allowed'));
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// ── In-memory database ─────────────────────────────────────────────────────
let jobs = [
  {
    id: 1,
    title: 'Senior Frontend Developer',
    department: 'Engineering',
    skills: ['React', 'JavaScript', 'TypeScript', 'CSS', 'Node.js'],
    experience: 4,
    education: 'Bachelor',
    description: 'Build modern web applications using React and TypeScript.',
    createdAt: new Date().toISOString()
  },
  {
    id: 2,
    title: 'Data Scientist',
    department: 'Analytics',
    skills: ['Python', 'Machine Learning', 'TensorFlow', 'SQL', 'Statistics'],
    experience: 3,
    education: 'Master',
    description: 'Develop ML models and analyze large datasets.',
    createdAt: new Date().toISOString()
  },
  {
    id: 3,
    title: 'Product Manager',
    department: 'Product',
    skills: ['Product Strategy', 'Agile', 'Scrum', 'Analytics', 'Communication'],
    experience: 5,
    education: 'Bachelor',
    description: 'Lead product roadmap and work cross-functionally.',
    createdAt: new Date().toISOString()
  }
];

let candidates = [];
let nextJobId = 4;
let nextCandidateId = 1;

// ── Screening Engine ───────────────────────────────────────────────────────
function screenResume(candidate, job) {
  let score = 0;
  const breakdown = {};
  const feedback = [];

  // 1. Skills match (40 points)
  const candidateSkills = candidate.skills.map(s => s.toLowerCase());
  const jobSkills = job.skills.map(s => s.toLowerCase());
  const matchedSkills = jobSkills.filter(s =>
    candidateSkills.some(cs => cs.includes(s) || s.includes(cs))
  );
  const skillScore = Math.round((matchedSkills.length / jobSkills.length) * 40);
  breakdown.skills = { score: skillScore, max: 40, matched: matchedSkills, required: jobSkills };
  score += skillScore;

  if (matchedSkills.length === jobSkills.length) feedback.push('✅ All required skills matched');
  else if (matchedSkills.length >= jobSkills.length * 0.7) feedback.push('✅ Most required skills matched');
  else feedback.push(`⚠️ Only ${matchedSkills.length}/${jobSkills.length} skills matched`);

  // 2. Experience match (30 points)
  const expDiff = candidate.experience - job.experience;
  let expScore = 0;
  if (expDiff >= 0) expScore = 30;
  else if (expDiff === -1) expScore = 20;
  else if (expDiff === -2) expScore = 10;
  breakdown.experience = { score: expScore, max: 30, candidate: candidate.experience, required: job.experience };
  score += expScore;

  if (expDiff >= 2) feedback.push(`✅ Exceeds experience by ${expDiff} years`);
  else if (expDiff >= 0) feedback.push('✅ Meets experience requirement');
  else feedback.push(`⚠️ ${Math.abs(expDiff)} year(s) short on experience`);

  // 3. Education match (20 points)
  const eduLevels = { 'High School': 1, 'Associate': 2, 'Bachelor': 3, 'Master': 4, 'PhD': 5 };
  const candEdu = eduLevels[candidate.education] || 0;
  const reqEdu = eduLevels[job.education] || 0;
  const eduScore = candEdu >= reqEdu ? 20 : candEdu === reqEdu - 1 ? 10 : 0;
  breakdown.education = { score: eduScore, max: 20, candidate: candidate.education, required: job.education };
  score += eduScore;

  if (candEdu >= reqEdu) feedback.push('✅ Education requirement met');
  else feedback.push('⚠️ Education below requirement');

  // 4. Bonus points (10 points)
  let bonus = 0;
  if (candidate.summary && candidate.summary.length > 50) bonus += 5;
  if (candidate.certifications && candidate.certifications.length > 0) bonus += 5;
  breakdown.bonus = { score: Math.min(bonus, 10), max: 10 };
  score += Math.min(bonus, 10);

  // Determine status
  let status;
  if (score >= 80) status = 'Shortlisted';
  else if (score >= 55) status = 'Under Review';
  else status = 'Rejected';

  return { score, status, breakdown, feedback, matchedSkills };
}

// ── API Routes ─────────────────────────────────────────────────────────────

// Jobs
app.get('/api/jobs', (req, res) => res.json(jobs));

app.post('/api/jobs', (req, res) => {
  const job = { id: nextJobId++, ...req.body, createdAt: new Date().toISOString() };
  jobs.push(job);
  res.status(201).json(job);
});

app.put('/api/jobs/:id', (req, res) => {
  const idx = jobs.findIndex(j => j.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Job not found' });
  jobs[idx] = { ...jobs[idx], ...req.body };
  res.json(jobs[idx]);
});

app.delete('/api/jobs/:id', (req, res) => {
  jobs = jobs.filter(j => j.id !== parseInt(req.params.id));
  res.json({ message: 'Job deleted' });
});

// Candidates
app.get('/api/candidates', (req, res) => {
  const { jobId, status, search } = req.query;
  let result = candidates;
  if (jobId) result = result.filter(c => c.jobId === parseInt(jobId));
  if (status) result = result.filter(c => c.status === status);
  if (search) {
    const s = search.toLowerCase();
    result = result.filter(c =>
      c.name.toLowerCase().includes(s) ||
      c.email.toLowerCase().includes(s) ||
      c.skills.some(sk => sk.toLowerCase().includes(s))
    );
  }
  res.json(result);
});

app.get('/api/candidates/:id', (req, res) => {
  const c = candidates.find(c => c.id === parseInt(req.params.id));
  if (!c) return res.status(404).json({ error: 'Candidate not found' });
  res.json(c);
});

app.post('/api/candidates', upload.single('resume'), (req, res) => {
  const data = req.body;
  const job = jobs.find(j => j.id === parseInt(data.jobId));
  if (!job) return res.status(404).json({ error: 'Job not found' });

  const candidate = {
    id: nextCandidateId++,
    jobId: parseInt(data.jobId),
    jobTitle: job.title,
    name: data.name,
    email: data.email,
    phone: data.phone || '',
    experience: parseInt(data.experience) || 0,
    education: data.education,
    skills: data.skills ? data.skills.split(',').map(s => s.trim()) : [],
    summary: data.summary || '',
    certifications: data.certifications ? data.certifications.split(',').map(c => c.trim()) : [],
    resumeFile: req.file ? req.file.filename : null,
    appliedAt: new Date().toISOString()
  };

  const screening = screenResume(candidate, job);
  candidate.score = screening.score;
  candidate.status = screening.status;
  candidate.breakdown = screening.breakdown;
  candidate.feedback = screening.feedback;
  candidate.matchedSkills = screening.matchedSkills;

  candidates.push(candidate);
  res.status(201).json(candidate);
});

app.put('/api/candidates/:id/status', (req, res) => {
  const c = candidates.find(c => c.id === parseInt(req.params.id));
  if (!c) return res.status(404).json({ error: 'Candidate not found' });
  c.status = req.body.status;
  res.json(c);
});

app.delete('/api/candidates/:id', (req, res) => {
  candidates = candidates.filter(c => c.id !== parseInt(req.params.id));
  res.json({ message: 'Candidate deleted' });
});

// Dashboard stats
app.get('/api/stats', (req, res) => {
  const stats = {
    totalJobs: jobs.length,
    totalCandidates: candidates.length,
    shortlisted: candidates.filter(c => c.status === 'Shortlisted').length,
    underReview: candidates.filter(c => c.status === 'Under Review').length,
    rejected: candidates.filter(c => c.status === 'Rejected').length,
    avgScore: candidates.length
      ? Math.round(candidates.reduce((a, c) => a + c.score, 0) / candidates.length)
      : 0,
    byJob: jobs.map(j => ({
      job: j.title,
      count: candidates.filter(c => c.jobId === j.id).length
    }))
  };
  res.json(stats);
});

app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
