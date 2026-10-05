import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  UploadCloud,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  FileText,
  User,
  Phone,
  Mail,
  Building2,
  MapPin,
  GraduationCap,
  Briefcase,
  FolderGit2,
  MessageSquare,
  Trash2,
  X,
  AlertCircle,
  Send,
  Calendar,
  Award,
  ArrowRight,
  TrendingUp,
  Layers,
  HelpCircle,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import api, { errMsg, getUser } from '../api.js';
import { STAGES, label, fmt } from '../stages.js';
import ScoreGauge from '../components/ScoreGauge.jsx';

const BREAKDOWN_CONFIG = {
  skills: { label: 'Skills Match', max: 45, color: '#10b981' },
  experience: { label: 'Experience Level', max: 30, color: '#3b82f6' },
  education: { label: 'Education Degree', max: 10, color: '#8b5cf6' },
  projects: { label: 'Project Portfolio', max: 10, color: '#f59e0b' },
  keywords: { label: 'JD Context & Keywords', max: 5, color: '#0d9488' }
};

const STAGE_GUIDANCE = {
  applied: {
    desc: 'Application received and parsed. Needs initial screening review.',
    color: '#64748b',
    nextHint: 'Advance to Screening to review profile in detail, or Reject if qualifications do not align.'
  },
  screening: {
    desc: 'Resume and qualifications are being actively evaluated against job criteria.',
    color: '#d97706',
    nextHint: 'Move to Shortlisted if qualifications meet the threshold, or Reject.'
  },
  shortlisted: {
    desc: 'Candidate meets requirements. Ready for hiring manager or phone interview.',
    color: '#059669',
    nextHint: 'Advance to Interview stage, return to Screening for further checks, or Reject.'
  },
  interview: {
    desc: 'Candidate is actively participating in evaluation rounds with the team.',
    color: '#0284c7',
    nextHint: 'Move to Hired upon offer acceptance, return to Shortlisted, or Reject.'
  },
  hired: {
    desc: 'Offer accepted! Candidate has been successfully hired for this role.',
    color: '#0f172a',
    nextHint: 'This is a final stage. Candidate has been onboarded.'
  },
  rejected: {
    desc: 'Candidate was not selected for this position.',
    color: '#dc2626',
    nextHint: 'Can be re-opened to the Screening stage if requirements or headcount change.'
  }
};

export default function JobDetail() {
  const { id } = useParams();
  const fileInputRef = useRef();
  const me = getUser();

  const [job, setJob] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyUpload, setBusyUpload] = useState(false);
  const [busyRescoreAll, setBusyRescoreAll] = useState(false);
  const [busyRescoreOne, setBusyRescoreOne] = useState(false);

  // Filters & Search
  const [filterStage, setFilterStage] = useState('all');
  const [filterVerdict, setFilterVerdict] = useState('all'); // 'all', 'shortlisted', 'review', 'rejected'
  const [filterSource, setFilterSource] = useState('all');   // 'all', 'application', 'recruiter_upload'
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('rank'); // 'rank', 'score_desc', 'score_asc', 'name_asc', 'date_desc'

  // Drawer states
  const [drawerTab, setDrawerTab] = useState('overview'); // 'overview', 'skills', 'pipeline', 'notes', 'history'
  const [transitionNote, setTransitionNote] = useState('');
  const [newNote, setNewNote] = useState('');
  const [drawerErr, setDrawerErr] = useState('');
  const [movingStage, setMovingStage] = useState(false);

  // Global notification banner
  const [msg, setMsg] = useState({ type: '', text: '' });

  const loadJob = () => {
    return api.get('/jobs/' + id).then(r => setJob(r.data));
  };

  const loadCandidates = () => {
    return api.get('/candidates/job/' + id).then(r => setCandidates(r.data));
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([loadJob(), loadCandidates()])
      .catch(x => setMsg({ type: 'error', text: errMsg(x) }))
      .finally(() => setLoading(false));
  }, [id]);

  const handleUploadResumes = async e => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const fd = new FormData();
    files.forEach(f => fd.append('resumes', f));

    setBusyUpload(true);
    setMsg({ type: '', text: '' });

    try {
      const { data } = await api.post(`/candidates/job/${id}/upload`, fd);
      let message = `Screening complete: ${data.added} candidate(s) successfully added and scored.`;
      if (data.failed?.length) {
        message += ` Failed (${data.failed.length}): ` + data.failed.map(f => `${f.file} (${f.reason})`).join(', ');
      }
      setMsg({ type: data.failed?.length ? 'warning' : 'success', text: message });
      loadCandidates();
    } catch (x) {
      setMsg({ type: 'error', text: errMsg(x) });
    } finally {
      setBusyUpload(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const openCandidateDrawer = async c => {
    setDrawerErr('');
    setTransitionNote('');
    setNewNote('');
    setSelectedCandidate(c);
    setDrawerTab('overview');

    try {
      const { data } = await api.get('/candidates/' + c._id);
      setSelectedCandidate(data);
    } catch (x) {
      setDrawerErr(errMsg(x));
    }
  };

  const refreshCandidateDetails = async cId => {
    try {
      const { data } = await api.get('/candidates/' + cId);
      setSelectedCandidate(data);
      loadCandidates();
    } catch (x) {
      setDrawerErr(errMsg(x));
    }
  };

  const handleMoveStage = async nextStage => {
    if (!selectedCandidate) return;
    setDrawerErr('');
    setMovingStage(true);

    try {
      await api.patch(`/candidates/${selectedCandidate._id}/stage`, {
        stage: nextStage,
        note: transitionNote.trim() || undefined
      });
      setTransitionNote('');
      await refreshCandidateDetails(selectedCandidate._id);
      setMsg({ type: 'success', text: `Candidate advanced to ${label(nextStage)}.` });
    } catch (x) {
      setDrawerErr(errMsg(x));
    } finally {
      setMovingStage(false);
    }
  };

  const handleAddNote = async e => {
    e.preventDefault();
    if (!newNote.trim() || !selectedCandidate) return;
    setDrawerErr('');

    try {
      await api.post(`/candidates/${selectedCandidate._id}/notes`, { body: newNote.trim() });
      setNewNote('');
      await refreshCandidateDetails(selectedCandidate._id);
    } catch (x) {
      setDrawerErr(errMsg(x));
    }
  };

  const handleDeleteNote = async noteId => {
    if (!selectedCandidate) return;
    setDrawerErr('');

    try {
      await api.delete(`/candidates/${selectedCandidate._id}/notes/${noteId}`);
      await refreshCandidateDetails(selectedCandidate._id);
    } catch (x) {
      setDrawerErr(errMsg(x));
    }
  };

  const handleRescoreCandidate = async () => {
    if (!selectedCandidate) return;
    setDrawerErr('');
    setBusyRescoreOne(true);

    try {
      await api.post(`/candidates/${selectedCandidate._id}/rescore`);
      await refreshCandidateDetails(selectedCandidate._id);
      setMsg({ type: 'success', text: `Candidate re-scored against current job requirements.` });
    } catch (x) {
      setDrawerErr(errMsg(x));
    } finally {
      setBusyRescoreOne(false);
    }
  };

  const handleRescoreAll = async () => {
    setBusyRescoreAll(true);
    setMsg({ type: '', text: '' });

    try {
      const { data } = await api.post(`/jobs/${id}/rescore`);
      setMsg({ type: 'success', text: `AI Screening complete: ${data.rescored} candidate(s) re-scored against current job requirements.` });
      loadCandidates();
    } catch (x) {
      setMsg({ type: 'error', text: errMsg(x) });
    } finally {
      setBusyRescoreAll(false);
    }
  };

  const handleDeleteCandidate = async candidate => {
    if (!window.confirm(`Are you sure you want to remove candidate "${candidate.name}" from this job pool?`)) {
      return;
    }

    try {
      await api.delete('/candidates/' + candidate._id);
      setSelectedCandidate(null);
      setMsg({ type: 'success', text: 'Candidate successfully removed from this position.' });
      loadCandidates();
    } catch (x) {
      setDrawerErr(errMsg(x));
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>
        <Clock className="animate-spin" size={24} style={{ margin: '0 auto 0.5rem' }} />
        <p>Loading candidate pipeline...</p>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="alert-box alert-danger">
        <AlertCircle size={18} />
        <span>Job position not found or you do not have permission to view it.</span>
      </div>
    );
  }

  // Filter & sort candidates
  const filteredCandidates = candidates
    .filter(c => {
      // Stage filter
      if (filterStage !== 'all' && c.stage !== filterStage) return false;

      // Verdict filter
      if (filterVerdict !== 'all') {
        const v = c.status || (c.score >= 75 ? 'shortlisted' : c.score >= 50 ? 'review' : 'rejected');
        if (v !== filterVerdict) return false;
      }

      // Source filter
      if (filterSource !== 'all' && c.source !== filterSource) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = c.name?.toLowerCase().includes(q);
        const matchEmail = c.email?.toLowerCase().includes(q);
        const matchPhone = c.phone?.toLowerCase().includes(q);
        const matchSkills = (c.skills || []).some(s => s.toLowerCase().includes(q));
        const matchRec = c.recommendation?.toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchPhone && !matchSkills && !matchRec) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'score_desc') return (b.score || 0) - (a.score || 0);
      if (sortBy === 'score_asc') return (a.score || 0) - (b.score || 0);
      if (sortBy === 'name_asc') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'date_desc') return new Date(b.createdAt) - new Date(a.createdAt);
      return (a.rank || 0) - (b.rank || 0); // Default by Server Rank
    });

  const canDeleteCandidate = selectedCandidate && (selectedCandidate.source !== 'application' || me?.role === 'admin');

  // Compute live pipeline summary
  const shortlistedCount = candidates.filter(c => (c.score || 0) >= 75).length;
  const interviewCount = candidates.filter(c => c.stage === 'interview').length;
  const hiredCount = candidates.filter(c => c.stage === 'hired').length;

  return (
    <div>
      {/* Back Link */}
      <Link to="/app/jobs" className="btn btn-ghost btn-sm" style={{ paddingLeft: 0, marginBottom: '0.75rem', color: 'var(--text-muted)' }}>
        <ArrowLeft size={16} /> Back to Jobs Roster
      </Link>

      {/* Job Header Card */}
      <div
        className="card"
        style={{
          background: '#ffffff',
          border: '1px solid var(--border-subtle)',
          padding: '1.5rem',
          marginBottom: '1.5rem'
        }}
      >
        <div className="flex-between" style={{ flexWrap: 'wrap', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.35rem' }}>
              <h1 style={{ fontSize: '1.65rem', margin: 0 }}>{job.title}</h1>
              <span className={`badge status-${job.status}`}>{job.status}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              {job.department && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Building2 size={13} /> {job.department}
                </span>
              )}
              {job.location && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <MapPin size={13} /> {job.location}
                </span>
              )}
              {job.owner?.name && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--brand-blue)' }}>
                  <User size={13} /> Owner: {job.owner.name}
                </span>
              )}
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Calendar size={13} /> Posted {fmt(job.createdAt)}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx"
              multiple
              style={{ display: 'none' }}
              onChange={handleUploadResumes}
            />

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={busyRescoreAll || !candidates.length}
              onClick={handleRescoreAll}
              title="Re-run AI matcher against current requirements"
            >
              <RefreshCw size={14} className={busyRescoreAll ? 'animate-spin' : ''} />
              {busyRescoreAll ? 'Re-scoring All...' : 'Re-score All'}
            </button>

            <button
              type="button"
              className="btn btn-teal btn-sm"
              disabled={busyUpload || job.status === 'archived'}
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadCloud size={16} />
              {busyUpload ? 'Screening Resumes...' : 'Upload Resumes (PDF / DOCX)'}
            </button>
          </div>
        </div>

        {/* Required Skills & Criteria Chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', paddingTop: '0.75rem', borderTop: '1px solid var(--border-light)' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Target Criteria:
          </span>
          {(job.requiredSkills || []).map(skill => (
            <span className="chip chip-matched" key={skill}>
              {skill}
            </span>
          ))}
          {job.minExperience > 0 && (
            <span className="chip" style={{ background: '#f8fafc' }}>
              <Clock size={11} style={{ marginRight: '0.25rem' }} /> {job.minExperience}+ yrs exp
            </span>
          )}
          {job.minEducation && job.minEducation !== 'any' && (
            <span className="chip" style={{ background: '#f8fafc', textTransform: 'capitalize' }}>
              <GraduationCap size={11} style={{ marginRight: '0.25rem' }} /> {job.minEducation}
            </span>
          )}
        </div>
      </div>

      {/* Notifications */}
      {msg.text && (
        <div className={`alert-box alert-${msg.type === 'error' ? 'danger' : msg.type === 'warning' ? 'warning' : 'success'}`}>
          {msg.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Pipeline Stages Tabs */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div className="tabs-segmented" style={{ flexWrap: 'wrap', gap: '0.35rem' }}>
          <button
            type="button"
            className={`tab-btn ${filterStage === 'all' ? 'active' : ''}`}
            onClick={() => setFilterStage('all')}
          >
            All Candidates ({candidates.length})
          </button>
          {STAGES.map(s => {
            const count = candidates.filter(c => c.stage === s).length;
            return (
              <button
                key={s}
                type="button"
                className={`tab-btn ${filterStage === s ? 'active' : ''}`}
                onClick={() => setFilterStage(s)}
              >
                {label(s)} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Filters & Sorting Toolbar */}
      <div className="filter-bar" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', flex: 1, maxWidth: '780px' }}>
          {/* Search Bar */}
          <div className="search-bar" style={{ maxWidth: '320px', flex: 1 }}>
            <Search size={15} style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search candidate, skill, phone..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          {/* AI Verdict Filter */}
          <select
            className="form-select"
            style={{ width: 'auto', fontSize: '0.8125rem', padding: '0.4rem 0.75rem' }}
            value={filterVerdict}
            onChange={e => setFilterVerdict(e.target.value)}
          >
            <option value="all">All AI Verdicts</option>
            <option value="shortlisted">AI Shortlisted (&ge;75%)</option>
            <option value="review">Under Review (50-74%)</option>
            <option value="rejected">Low Match (&lt;50%)</option>
          </select>

          {/* Source Filter */}
          <select
            className="form-select"
            style={{ width: 'auto', fontSize: '0.8125rem', padding: '0.4rem 0.75rem' }}
            value={filterSource}
            onChange={e => setFilterSource(e.target.value)}
          >
            <option value="all">All Sourcing Channels</option>
            <option value="application">Online Applications</option>
            <option value="recruiter_upload">Recruiter Uploads</option>
          </select>

          {(searchQuery || filterVerdict !== 'all' || filterSource !== 'all') && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setSearchQuery('');
                setFilterVerdict('all');
                setFilterSource('all');
              }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Sorting Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Sort:</span>
          <select
            className="form-select"
            style={{ width: 'auto', padding: '0.4rem 0.75rem', fontSize: '0.8125rem' }}
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
          >
            <option value="rank">Server Rank (#1 first)</option>
            <option value="score_desc">Match Score (High to Low)</option>
            <option value="score_asc">Match Score (Low to High)</option>
            <option value="name_asc">Candidate Name (A to Z)</option>
            <option value="date_desc">Date Added (Newest first)</option>
          </select>
        </div>
      </div>

      {/* Summary Metrics Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0.5rem 0 1rem', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
        <span>
          Showing <b>{filteredCandidates.length}</b> of <b>{candidates.length}</b> applicants
        </span>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <span><b>{shortlistedCount}</b> AI Shortlisted</span>
          <span><b>{interviewCount}</b> In Interview</span>
          <span><b>{hiredCount}</b> Hired</span>
        </div>
      </div>

      {/* Candidates Ranked Table */}
      {!candidates.length ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <UploadCloud size={28} />
          </div>
          <h3>No candidates screened yet</h3>
          <p style={{ maxWidth: '440px', margin: '0.5rem auto 1.5rem' }}>
            Upload resume files (PDF or DOCX), or wait for registered candidates to apply online. RecruitIQ will rank and score them automatically.
          </p>
          <button
            type="button"
            className="btn btn-teal"
            disabled={busyUpload || job.status === 'archived'}
            onClick={() => fileInputRef.current?.click()}
          >
            <UploadCloud size={16} /> Upload Resumes
          </button>
        </div>
      ) : !filteredCandidates.length ? (
        <div className="empty-state" style={{ padding: '2.5rem 1rem' }}>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>
            No candidates found matching the selected stage and search criteria.
          </p>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>Rank</th>
                <th>Candidate Profile</th>
                <th>AI Match Score</th>
                <th>AI Recommendation</th>
                <th>Skills Match</th>
                <th>Pipeline Stage</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCandidates.map(c => {
                const score = c.score || 0;
                let scoreColor = '#059669';
                let verdictBadge = 'stage-shortlisted';
                let verdictText = 'Shortlisted';

                if (score < 50) {
                  scoreColor = '#dc2626';
                  verdictBadge = 'stage-rejected';
                  verdictText = 'Low Match';
                } else if (score < 75) {
                  scoreColor = '#d97706';
                  verdictBadge = 'stage-screening';
                  verdictText = 'Review';
                }

                return (
                  <tr
                    key={c._id}
                    className="clickable"
                    onClick={() => openCandidateDrawer(c)}
                  >
                    <td>
                      <span
                        style={{
                          fontWeight: 700,
                          fontFamily: 'var(--font-heading)',
                          fontSize: '0.9rem',
                          color: c.rank === 1 ? '#d97706' : 'var(--text-secondary)'
                        }}
                      >
                        #{c.rank}
                      </span>
                    </td>

                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--brand-navy)' }}>{c.name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                        <span>{c.email || c.fileName}</span>
                        {c.source === 'application' ? (
                          <span className="badge stage-shortlisted" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>
                            Applied Online
                          </span>
                        ) : (
                          <span className="badge stage-applied" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>
                            Uploaded
                          </span>
                        )}
                      </div>
                    </td>

                    <td>
                      <div className="score-badge">
                        <div className="score-bar-mini">
                          <div
                            className="score-bar-mini-fill"
                            style={{
                              width: `${score}%`,
                              background: scoreColor
                            }}
                          />
                        </div>
                        <span style={{ color: scoreColor }}>{score}%</span>
                      </div>
                    </td>

                    <td>
                      <div>
                        <span className={`badge ${verdictBadge}`} style={{ fontSize: '0.72rem' }}>
                          {verdictText}
                        </span>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {c.recommendation || 'Scored against requirements'}
                        </div>
                      </div>
                    </td>

                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <div className="chips-container" style={{ margin: 0 }}>
                          {(c.matchedSkills || []).slice(0, 3).map(s => (
                            <span className="chip chip-matched" key={s}>
                              {s}
                            </span>
                          ))}
                          {(c.matchedSkills?.length || 0) > 3 && (
                            <span className="chip" style={{ fontSize: '0.7rem' }}>
                              +{c.matchedSkills.length - 3}
                            </span>
                          )}
                        </div>
                        {c.missingSkills?.length > 0 && (
                          <small style={{ color: 'var(--danger-text)', fontSize: '0.72rem' }}>
                            Missing: {c.missingSkills.slice(0, 2).join(', ')}
                            {c.missingSkills.length > 2 && ` +${c.missingSkills.length - 2}`}
                          </small>
                        )}
                      </div>
                    </td>

                    <td>
                      <span className={`badge stage-${c.stage}`}>
                        {label(c.stage)}
                      </span>
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={e => {
                          e.stopPropagation();
                          openCandidateDrawer(c);
                        }}
                      >
                        Review Profile <ChevronRight size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Redesigned Candidate Evaluation Slide-Over Drawer */}
      {selectedCandidate && (
        <div className="drawer-overlay" onClick={() => setSelectedCandidate(null)}>
          <aside className="drawer-content" style={{ width: 'min(620px, 100%)' }} onClick={e => e.stopPropagation()}>
            {/* Drawer Header */}
            <div className="drawer-header">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.25rem' }}>
                  <h2 style={{ fontSize: '1.4rem', margin: 0 }}>{selectedCandidate.name}</h2>
                  {selectedCandidate.rank && (
                    <span className="badge stage-hired" style={{ fontSize: '0.75rem' }}>
                      Rank #{selectedCandidate.rank}
                    </span>
                  )}
                  <span className={`badge stage-${selectedCandidate.stage}`}>
                    {label(selectedCandidate.stage)}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  {selectedCandidate.email && (
                    <a href={`mailto:${selectedCandidate.email}`} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--brand-blue)' }}>
                      <Mail size={13} /> {selectedCandidate.email}
                    </a>
                  )}
                  {selectedCandidate.phone && (
                    <a href={`tel:${selectedCandidate.phone}`} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-secondary)' }}>
                      <Phone size={13} /> {selectedCandidate.phone}
                    </a>
                  )}
                  {selectedCandidate.fileName && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <FileText size={13} /> {selectedCandidate.fileName}
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                className="btn-ghost"
                style={{ padding: '0.35rem', borderRadius: 'var(--r-md)', cursor: 'pointer' }}
                onClick={() => setSelectedCandidate(null)}
                aria-label="Close drawer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Drawer Section Navigation Tabs */}
            <div style={{ padding: '0.75rem 1.5rem 0', background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto' }}>
                {[
                  { id: 'overview', label: '1. Profile & AI Match' },
                  { id: 'skills', label: '2. Skills Breakdown' },
                  { id: 'pipeline', label: '3. Recruitment Stage' },
                  { id: 'notes', label: `4. Notes (${selectedCandidate.notes?.length || 0})` },
                  { id: 'history', label: '5. Timeline' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setDrawerTab(tab.id)}
                    style={{
                      padding: '0.5rem 0.75rem',
                      background: 'none',
                      border: 'none',
                      borderBottom: drawerTab === tab.id ? '2px solid var(--brand-teal)' : '2px solid transparent',
                      fontWeight: drawerTab === tab.id ? 700 : 500,
                      fontSize: '0.8125rem',
                      color: drawerTab === tab.id ? 'var(--brand-navy)' : 'var(--text-muted)',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Drawer Body */}
            <div className="drawer-body">
              {drawerErr && (
                <div className="alert-box alert-danger">
                  <AlertCircle size={16} />
                  <span>{drawerErr}</span>
                </div>
              )}

              {/* SECTION 1: PROFILE & AI MATCH */}
              {drawerTab === 'overview' && (
                <div>
                  {/* AI Match Gauge & Recommendation Card */}
                  <div
                    style={{
                      background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)',
                      border: '1px solid #dcfce7',
                      borderRadius: 'var(--r-lg)',
                      padding: '1.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1.5rem',
                      marginBottom: '1.5rem'
                    }}
                  >
                    <ScoreGauge score={selectedCandidate.score} size={84} />

                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
                        <Sparkles size={16} style={{ color: 'var(--brand-teal)' }} />
                        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--brand-navy)' }}>
                          AI Match Recommendation
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        {selectedCandidate.recommendation || 'Evaluated against job requirements and keywords.'}
                      </p>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '0.25rem 0', marginTop: '0.5rem', color: 'var(--brand-teal)', fontSize: '0.75rem' }}
                        disabled={busyRescoreOne}
                        onClick={handleRescoreCandidate}
                      >
                        <RefreshCw size={12} className={busyRescoreOne ? 'animate-spin' : ''} />
                        {busyRescoreOne ? 'Re-scoring...' : 'Re-score Candidate'}
                      </button>
                    </div>
                  </div>

                  {/* Profile Qualifications Card */}
                  <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <h4 style={{ fontSize: '0.9rem', marginBottom: '0.85rem', color: 'var(--brand-navy)' }}>
                      Detected Candidate Profile
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', textAlign: 'center' }}>
                      <div style={{ padding: '0.75rem', background: 'var(--bg-subtle)', borderRadius: 'var(--r-md)' }}>
                        <Briefcase size={16} style={{ color: 'var(--text-muted)', margin: '0 auto 0.25rem' }} />
                        <div style={{ fontWeight: 700, fontSize: '1.15rem', color: 'var(--brand-navy)' }}>
                          {selectedCandidate.yearsExperience ?? 0}
                        </div>
                        <small style={{ color: 'var(--text-muted)' }}>Years Experience</small>
                      </div>
                      <div style={{ padding: '0.75rem', background: 'var(--bg-subtle)', borderRadius: 'var(--r-md)' }}>
                        <GraduationCap size={16} style={{ color: 'var(--text-muted)', margin: '0 auto 0.25rem' }} />
                        <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--brand-navy)', textTransform: 'capitalize' }}>
                          {selectedCandidate.education || 'N/A'}
                        </div>
                        <small style={{ color: 'var(--text-muted)' }}>Education Degree</small>
                      </div>
                      <div style={{ padding: '0.75rem', background: 'var(--bg-subtle)', borderRadius: 'var(--r-md)' }}>
                        <FolderGit2 size={16} style={{ color: 'var(--text-muted)', margin: '0 auto 0.25rem' }} />
                        <div style={{ fontWeight: 700, fontSize: '1.15rem', color: 'var(--brand-navy)' }}>
                          {selectedCandidate.projectsCount ?? 0}
                        </div>
                        <small style={{ color: 'var(--text-muted)' }}>Projects Detected</small>
                      </div>
                    </div>
                  </div>

                  {/* Explainable Match Breakdown */}
                  <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--brand-navy)' }}>
                      Score Breakdown (Total: {selectedCandidate.score}/100)
                    </h4>

                    {selectedCandidate.breakdown && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                        {Object.entries(BREAKDOWN_CONFIG).map(([key, cfg]) => {
                          const val = selectedCandidate.breakdown[key] || 0;
                          const pct = Math.round((val / cfg.max) * 100);
                          return (
                            <div key={key} style={{ fontSize: '0.8125rem' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                                <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{cfg.label}</span>
                                <span style={{ fontWeight: 700 }}>
                                  {val} / {cfg.max} pts
                                </span>
                              </div>
                              <div style={{ height: 6, background: 'var(--bg-subtle)', borderRadius: 'var(--r-full)', overflow: 'hidden' }}>
                                <div style={{ width: `${pct}%`, height: '100%', background: cfg.color, borderRadius: 'var(--r-full)' }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* AI Explanation reasons */}
                    {(selectedCandidate.explanation || []).length > 0 && (
                      <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: 'var(--bg-subtle)', borderRadius: 'var(--r-md)' }}>
                        <span style={{ fontSize: '0.775rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                          Why this score:
                        </span>
                        <ul style={{ margin: '0.4rem 0 0 1.25rem', padding: 0, fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                          {selectedCandidate.explanation.map((item, idx) => (
                            <li key={idx} style={{ marginBottom: '0.25rem' }}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SECTION 2: SKILLS BREAKDOWN */}
              {drawerTab === 'skills' && (
                <div>
                  {/* Matched Skills */}
                  <div className="card" style={{ marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                      <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--brand-navy)' }}>
                        Matched Required Skills ({selectedCandidate.matchedSkills?.length || 0})
                      </h4>
                      <span className="badge stage-shortlisted">Matching Target</span>
                    </div>

                    <div className="chips-container">
                      {(selectedCandidate.matchedSkills || []).map(s => (
                        <span className="chip chip-matched" key={s}>
                          <CheckCircle2 size={12} style={{ marginRight: '0.25rem' }} /> {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Missing Skills */}
                  <div className="card" style={{ marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                      <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--brand-navy)' }}>
                        Missing Required Skills ({selectedCandidate.missingSkills?.length || 0})
                      </h4>
                      {selectedCandidate.missingSkills?.length ? (
                        <span className="badge stage-rejected">Skills Gaps</span>
                      ) : (
                        <span className="badge stage-shortlisted">100% Skills Match</span>
                      )}
                    </div>

                    <div className="chips-container">
                      {selectedCandidate.missingSkills?.length ? (
                        selectedCandidate.missingSkills.map(s => (
                          <span className="chip chip-missing" key={s}>
                            <XCircle size={12} style={{ marginRight: '0.25rem' }} /> {s}
                          </span>
                        ))
                      ) : (
                        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0 }}>
                          No missing required skills. All target requirements were verified on the resume!
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Additional Skills */}
                  <div className="card">
                    <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', color: 'var(--brand-navy)' }}>
                      Other Extracted Skills ({((selectedCandidate.skills || []).filter(s => !selectedCandidate.matchedSkills?.includes(s))).length})
                    </h4>
                    <div className="chips-container">
                      {(selectedCandidate.skills || [])
                        .filter(s => !selectedCandidate.matchedSkills?.includes(s))
                        .map(s => (
                          <span className="chip" key={s}>
                            {s}
                          </span>
                        ))}
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 3: RECRUITMENT PIPELINE TIMELINE & ACTIONS */}
              {drawerTab === 'pipeline' && (
                <div>
                  {/* Current Stage Card */}
                  <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                      <h4 style={{ margin: 0, fontSize: '1rem' }}>Current Pipeline Stage</h4>
                      <span className={`badge stage-${selectedCandidate.stage}`}>
                        {label(selectedCandidate.stage)}
                      </span>
                    </div>

                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '0 0 0.5rem 0' }}>
                      {STAGE_GUIDANCE[selectedCandidate.stage]?.desc}
                    </p>

                    <div style={{ padding: '0.65rem 0.85rem', background: 'var(--bg-subtle)', borderRadius: 'var(--r-md)', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                      <b>Next Step:</b> {STAGE_GUIDANCE[selectedCandidate.stage]?.nextHint}
                    </div>
                  </div>

                  {/* Visual Timeline of Stages */}
                  <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <h4 style={{ fontSize: '0.9rem', marginBottom: '1rem', color: 'var(--brand-navy)' }}>
                      Pipeline Workflow Stepper
                    </h4>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {STAGES.filter(s => s !== 'rejected').map((stg, i) => {
                        const currentStageIdx = STAGES.indexOf(selectedCandidate.stage);
                        const thisIdx = STAGES.indexOf(stg);
                        const isCurrent = selectedCandidate.stage === stg;
                        const isDone = currentStageIdx > thisIdx && selectedCandidate.stage !== 'rejected';

                        return (
                          <div
                            key={stg}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.85rem',
                              padding: '0.65rem 0.85rem',
                              borderRadius: 'var(--r-md)',
                              background: isCurrent ? 'var(--brand-blue-light)' : isDone ? '#f0fdf4' : '#ffffff',
                              border: isCurrent ? '1px solid #bfdbfe' : isDone ? '1px solid #bbf7d0' : '1px solid var(--border-subtle)'
                            }}
                          >
                            <div
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: 'var(--r-full)',
                                background: isCurrent ? 'var(--brand-navy)' : isDone ? '#10b981' : 'var(--bg-subtle)',
                                color: isCurrent || isDone ? '#ffffff' : 'var(--text-muted)',
                                display: 'grid',
                                placeItems: 'center',
                                fontSize: '0.75rem',
                                fontWeight: 700
                              }}
                            >
                              {isDone ? <CheckCircle2 size={15} /> : i + 1}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600, fontSize: '0.875rem', color: isCurrent ? 'var(--brand-blue)' : 'var(--text-primary)' }}>
                                {label(stg)} {isCurrent && '(Active Stage)'}
                              </div>
                              <small style={{ color: 'var(--text-muted)' }}>{STAGE_GUIDANCE[stg]?.desc}</small>
                            </div>
                          </div>
                        );
                      })}

                      {selectedCandidate.stage === 'rejected' && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.85rem',
                            padding: '0.65rem 0.85rem',
                            borderRadius: 'var(--r-md)',
                            background: '#fef2f2',
                            border: '1px solid #fecaca'
                          }}
                        >
                          <XCircle size={22} style={{ color: '#dc2626' }} />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#991b1b' }}>
                              Rejected / Archived
                            </div>
                            <small style={{ color: '#991b1b' }}>Candidate was not moved forward for this role.</small>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Stage-Specific Actions Form */}
                  <div className="card">
                    <h4 style={{ fontSize: '0.95rem', marginBottom: '0.5rem', color: 'var(--brand-navy)' }}>
                      Stage Action
                    </h4>

                    {selectedCandidate.allowedNext?.length ? (
                      <div>
                        <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                          Select an allowed transition below to advance or update this candidate.
                        </p>

                        <div className="form-group">
                          <label className="form-label">Transition Audit Note (Optional)</label>
                          <input
                            className="form-input"
                            type="text"
                            maxLength={1000}
                            placeholder="e.g. Passed technical interview with strong algorithmic rating..."
                            value={transitionNote}
                            onChange={e => setTransitionNote(e.target.value)}
                            style={{ fontSize: '0.8125rem' }}
                          />
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          {selectedCandidate.allowedNext.map(stage => {
                            const isReject = stage === 'rejected';
                            const isReopen = selectedCandidate.stage === 'rejected' && stage === 'screening';
                            return (
                              <button
                                key={stage}
                                type="button"
                                className={`btn btn-sm ${isReject ? 'btn-danger' : isReopen ? 'btn-secondary' : 'btn-teal'}`}
                                disabled={movingStage}
                                onClick={() => handleMoveStage(stage)}
                              >
                                {isReject ? (
                                  <>
                                    <XCircle size={14} /> Move to Rejected
                                  </>
                                ) : isReopen ? (
                                  <>
                                    <RefreshCw size={14} /> Re-open to Screening
                                  </>
                                ) : (
                                  <>
                                    <ArrowRight size={14} /> Advance to {label(stage)}
                                  </>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="alert-box alert-info" style={{ margin: 0 }}>
                        <CheckCircle2 size={16} />
                        <span>Candidate has reached the final stage ({label(selectedCandidate.stage)}). No further stage transitions allowed.</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SECTION 4: PRIVATE NOTES */}
              {drawerTab === 'notes' && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <h4 style={{ margin: 0, fontSize: '0.95rem' }}>Confidential Recruiter Notes</h4>
                    <span className="badge stage-applied">Internal Only</span>
                  </div>

                  {/* Add Note Form */}
                  <form onSubmit={handleAddNote} className="card" style={{ marginBottom: '1.25rem' }}>
                    <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                      <label className="form-label">Add Note / Interview Feedback</label>
                      <textarea
                        className="form-textarea"
                        rows={3}
                        maxLength={2000}
                        placeholder="Write internal feedback, compensation notes, or interviewer evaluation..."
                        value={newNote}
                        onChange={e => setNewNote(e.target.value)}
                        style={{ fontSize: '0.8125rem' }}
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button type="submit" className="btn btn-teal btn-sm" disabled={!newNote.trim()}>
                        <Send size={13} /> Save Private Note
                      </button>
                    </div>
                  </form>

                  {/* Notes Feed */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {(selectedCandidate.notes || []).length ? (
                      selectedCandidate.notes.map(n => {
                        const canDelete = n.author === me?.id || me?.role === 'admin';
                        return (
                          <div
                            key={n._id}
                            className="card"
                            style={{ padding: '0.875rem 1rem' }}
                          >
                            <div style={{ whiteSpace: 'pre-wrap', color: 'var(--text-primary)', marginBottom: '0.5rem', fontSize: '0.875rem', lineHeight: 1.5 }}>
                              {n.body}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', paddingTop: '0.4rem', borderTop: '1px solid var(--border-light)' }}>
                              <span>
                                <b>{n.authorName}</b> · {fmt(n.createdAt)}
                              </span>
                              {canDelete && (
                                <button
                                  type="button"
                                  style={{ background: 'none', border: 'none', color: 'var(--danger-solid)', cursor: 'pointer', padding: 0, fontSize: '0.75rem' }}
                                  onClick={() => handleDeleteNote(n._id)}
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 1rem' }}>
                        No internal notes added yet. Use the field above to record interview impressions or private feedback.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* SECTION 5: AUDIT TIMELINE */}
              {drawerTab === 'history' && (
                <div>
                  <h4 style={{ fontSize: '0.95rem', marginBottom: '0.75rem', color: 'var(--brand-navy)' }}>
                    Stage Transition History & Audit Trail
                  </h4>
                  <ol className="timeline-list">
                    {(selectedCandidate.history || []).slice().reverse().map((h, i) => (
                      <li className="timeline-item" key={i}>
                        <div className="timeline-time">{fmt(h.at)}</div>
                        <div className="timeline-title">
                          {h.from ? `Moved from ${label(h.from)} to ${label(h.to)}` : `Application Stage: ${label(h.to)}`}
                        </div>
                        <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '0.15rem' }}>
                          Updated by {h.by?.name || (h.byRole === 'candidate' ? 'Candidate (Online Submission)' : h.byRole === 'system' ? 'Screening Engine' : 'Recruitment Team')}
                        </small>
                        {h.note && <div className="timeline-note">{h.note}</div>}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="drawer-footer">
              {canDeleteCandidate && (
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDeleteCandidate(selectedCandidate)}
                >
                  <Trash2 size={14} /> Remove Candidate
                </button>
              )}
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setSelectedCandidate(null)}
              >
                Close Drawer
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
