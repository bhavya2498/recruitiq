import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase,
  PlusCircle,
  Search,
  Building2,
  MapPin,
  Clock,
  GraduationCap,
  Users,
  Award,
  MoreVertical,
  Edit2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  UserCheck,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import api, { errMsg, getUser } from '../api.js';
import Modal from '../components/Modal.jsx';

const blankForm = {
  title: '',
  department: '',
  location: '',
  description: '',
  requiredSkills: '',
  minExperience: 0,
  minEducation: 'any'
};

export default function Jobs() {
  const me = getUser();
  const isAdmin = me?.role === 'admin';

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingJobId, setEditingJobId] = useState(null);
  const [formData, setFormData] = useState(blankForm);
  const [formErr, setFormErr] = useState('');
  const [saving, setSaving] = useState(false);

  // Admin reassign state
  const [reassignJob, setReassignJob] = useState(null);
  const [recruiters, setRecruiters] = useState([]);
  const [selectedOwner, setSelectedOwner] = useState('');
  const [reassigning, setReassigning] = useState(false);

  // Notifications
  const [msg, setMsg] = useState({ type: '', text: '' });

  const loadJobs = () => {
    setLoading(true);
    api.get('/jobs')
      .then(r => setJobs(r.data))
      .catch(x => setMsg({ type: 'error', text: errMsg(x) }))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadJobs();
    if (isAdmin) {
      api.get('/admin/users', { params: { active: 'true', limit: 100 } })
        .then(r => {
          const list = (r.data.items || []).filter(u => ['recruiter', 'admin'].includes(u.role));
          setRecruiters(list);
        })
        .catch(() => {});
    }
  }, [isAdmin]);

  const handleFieldChange = field => e => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  const openCreateModal = () => {
    setEditingJobId(null);
    setFormData(blankForm);
    setFormErr('');
    setIsFormOpen(true);
  };

  const openEditModal = job => {
    setEditingJobId(job._id);
    setFormData({
      title: job.title,
      department: job.department || '',
      location: job.location || '',
      description: job.description,
      requiredSkills: (job.requiredSkills || []).join(', '),
      minExperience: job.minExperience || 0,
      minEducation: job.minEducation || 'any'
    });
    setFormErr('');
    setIsFormOpen(true);
  };

  const closeFormModal = () => {
    setIsFormOpen(false);
    setEditingJobId(null);
    setFormData(blankForm);
    setFormErr('');
  };

  const handleSaveJob = async e => {
    e.preventDefault();
    setFormErr('');
    setSaving(true);
    setMsg({ type: '', text: '' });

    try {
      const skillsArray = formData.requiredSkills
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      const payload = {
        title: formData.title,
        department: formData.department || undefined,
        location: formData.location || undefined,
        description: formData.description,
        requiredSkills: skillsArray,
        minExperience: parseInt(formData.minExperience, 10) || 0,
        minEducation: formData.minEducation
      };

      if (editingJobId) {
        const { data } = await api.put('/jobs/' + editingJobId, payload);
        closeFormModal();
        loadJobs();
        if (data.rescored > 0) {
          setMsg({
            type: 'info',
            text: `Job requirements updated! ${data.rescored} candidate(s) were automatically re-scored by the AI matcher.`
          });
        } else {
          setMsg({ type: 'success', text: 'Job updated successfully.' });
        }
      } else {
        await api.post('/jobs', payload);
        closeFormModal();
        loadJobs();
        setMsg({ type: 'success', text: 'New job created! You can now start screening resumes against it.' });
      }
    } catch (x) {
      setFormErr(errMsg(x));
    } finally {
      setSaving(false);
    }
  };

  const toggleJobStatus = async job => {
    const nextStatus = job.status === 'open' ? 'closed' : 'open';
    try {
      await api.put('/jobs/' + job._id, { status: nextStatus });
      setMsg({ type: 'success', text: `Job status changed to ${nextStatus}.` });
      loadJobs();
    } catch (x) {
      setMsg({ type: 'error', text: errMsg(x) });
    }
  };

  const handleDeleteJob = async job => {
    if (!window.confirm(`Are you sure you want to delete "${job.title}" and all associated screening data?`)) {
      return;
    }

    try {
      await api.delete('/jobs/' + job._id);
      setMsg({ type: 'success', text: 'Job deleted successfully.' });
      loadJobs();
    } catch (x) {
      if (isAdmin && x.response?.data?.code === 'HAS_APPLICATIONS') {
        if (window.confirm(`${x.response.data.message}\n\nDo you want to FORCE delete this job and all registered applications?`)) {
          try {
            await api.delete('/jobs/' + job._id + '?force=true');
            setMsg({ type: 'success', text: 'Job and all candidate applications were permanently deleted.' });
            loadJobs();
          } catch (e2) {
            setMsg({ type: 'error', text: errMsg(e2) });
          }
        }
      } else {
        setMsg({ type: 'error', text: errMsg(x) });
      }
    }
  };

  const handleReassignOwner = async e => {
    e.preventDefault();
    if (!selectedOwner || !reassignJob) return;
    setReassigning(true);
    try {
      await api.post(`/jobs/${reassignJob._id}/reassign`, { owner: selectedOwner });
      setMsg({ type: 'success', text: `Job successfully reassigned.` });
      setReassignJob(null);
      setSelectedOwner('');
      loadJobs();
    } catch (x) {
      setMsg({ type: 'error', text: errMsg(x) });
    } finally {
      setReassigning(false);
    }
  };

  const filteredJobs = jobs.filter(j => {
    if (filterStatus !== 'all' && j.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = j.title?.toLowerCase().includes(q);
      const matchDept = j.department?.toLowerCase().includes(q);
      const matchLoc = j.location?.toLowerCase().includes(q);
      const matchSkills = (j.requiredSkills || []).some(s => s.toLowerCase().includes(q));
      if (!matchTitle && !matchDept && !matchLoc && !matchSkills) return false;
    }
    return true;
  });

  return (
    <div>
      {/* Header */}
      <div className="flex-between" style={{ marginBottom: '1.75rem', flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <h1 style={{ margin: 0 }}>
              {isAdmin ? 'All Jobs & Recruitment Pipelines' : 'My Jobs & Candidates'}
            </h1>
            <span className={`badge ${isAdmin ? 'stage-hired' : 'stage-interview'}`}>
              {isAdmin ? 'Organisation-wide' : 'My Workspace'}
            </span>
          </div>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
            Create positions, manage AI requirements, screen candidates, and track pipeline metrics.
          </p>
        </div>

        <button type="button" className="btn btn-teal" onClick={openCreateModal}>
          <PlusCircle size={16} /> Create New Job
        </button>
      </div>

      {/* Notifications */}
      {msg.text && (
        <div className={`alert-box alert-${msg.type === 'error' ? 'danger' : msg.type === 'info' ? 'info' : 'success'}`}>
          {msg.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="filter-bar">
        <div className="search-bar" style={{ maxWidth: '380px' }}>
          <Search size={16} style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Filter by title, skill, or location..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="tabs-segmented">
          <button
            type="button"
            className={`tab-btn ${filterStatus === 'all' ? 'active' : ''}`}
            onClick={() => setFilterStatus('all')}
          >
            All ({jobs.length})
          </button>
          <button
            type="button"
            className={`tab-btn ${filterStatus === 'open' ? 'active' : ''}`}
            onClick={() => setFilterStatus('open')}
          >
            Open ({jobs.filter(j => j.status === 'open').length})
          </button>
          <button
            type="button"
            className={`tab-btn ${filterStatus === 'closed' ? 'active' : ''}`}
            onClick={() => setFilterStatus('closed')}
          >
            Closed ({jobs.filter(j => j.status === 'closed').length})
          </button>
        </div>
      </div>

      {/* Content Grid */}
      {loading ? (
        <div style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Clock className="animate-spin" size={24} style={{ margin: '0 auto 0.5rem' }} />
          <p>Loading jobs...</p>
        </div>
      ) : !jobs.length ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <Briefcase size={28} />
          </div>
          <h3>No jobs created yet</h3>
          <p style={{ maxWidth: '440px', margin: '0.5rem auto 1.5rem' }}>
            Start by creating a job with title, required skills, and description. You can immediately upload resumes for automated AI screening and ranking.
          </p>
          <button type="button" className="btn btn-teal" onClick={openCreateModal}>
            <PlusCircle size={16} /> Create Job
          </button>
        </div>
      ) : !filteredJobs.length ? (
        <div className="empty-state" style={{ padding: '2.5rem 1rem' }}>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>No jobs match your search and filter criteria.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.25rem' }}>
          {filteredJobs.map(job => (
            <div
              key={job._id}
              className="card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                border: job.status === 'open' ? '1px solid var(--border-subtle)' : '1px solid var(--border-strong)',
                background: job.status === 'open' ? '#ffffff' : '#fbfcfc'
              }}
            >
              <div>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.35rem' }}>
                  <h3 style={{ fontSize: '1.15rem', margin: 0, color: 'var(--brand-navy)' }}>
                    {job.title}
                  </h3>
                  <span className={`badge status-${job.status}`}>
                    {job.status}
                  </span>
                </div>

                {/* Subtitle */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', margin: '0.35rem 0 0.85rem 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
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
                  {isAdmin && job.owner && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--brand-blue)' }}>
                      <UserCheck size={13} /> Owner: {job.owner.name}
                    </span>
                  )}
                </div>

                {/* Requirement Chips */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.85rem' }}>
                  {job.minExperience > 0 && (
                    <span className="chip" style={{ background: '#f8fafc' }}>
                      <Clock size={11} style={{ marginRight: '0.25rem' }} /> {job.minExperience}+ yrs
                    </span>
                  )}
                  {job.minEducation && job.minEducation !== 'any' && (
                    <span className="chip" style={{ background: '#f8fafc', textTransform: 'capitalize' }}>
                      <GraduationCap size={11} style={{ marginRight: '0.25rem' }} /> {job.minEducation}
                    </span>
                  )}
                </div>

                {/* Required Skills */}
                <div className="chips-container" style={{ marginBottom: '1.25rem' }}>
                  {(job.requiredSkills || []).slice(0, 5).map(s => (
                    <span className="chip" key={s}>
                      {s}
                    </span>
                  ))}
                  {(job.requiredSkills?.length || 0) > 5 && (
                    <span className="chip" style={{ background: 'var(--bg-subtle)' }}>
                      +{job.requiredSkills.length - 5}
                    </span>
                  )}
                </div>

                {/* Metrics Bar */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '0.5rem',
                    background: 'var(--bg-subtle)',
                    padding: '0.75rem',
                    borderRadius: 'var(--r-md)',
                    marginBottom: '1.25rem',
                    textAlign: 'center'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1.15rem', color: 'var(--brand-navy)' }}>
                      {job.applicants || 0}
                    </div>
                    <small>Applicants</small>
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1.15rem', color: job.avgScore >= 75 ? '#059669' : job.avgScore >= 50 ? '#d97706' : '#64748b' }}>
                      {job.avgScore || 0}%
                    </div>
                    <small>Avg Match</small>
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1.15rem', color: 'var(--brand-navy)' }}>
                      {job.hired || 0}
                    </div>
                    <small>Hired</small>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '0.85rem',
                  borderTop: '1px solid var(--border-light)',
                  gap: '0.5rem',
                  flexWrap: 'wrap'
                }}
              >
                <Link to={'/app/jobs/' + job._id} className="btn btn-sm btn-teal">
                  Applicants & Pipeline <ArrowRight size={14} />
                </Link>

                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    title="Edit Requirements"
                    onClick={() => openEditModal(job)}
                  >
                    <Edit2 size={14} /> Edit
                  </button>

                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    title={job.status === 'open' ? 'Close job' : 'Reopen job'}
                    onClick={() => toggleJobStatus(job)}
                  >
                    {job.status === 'open' ? 'Close' : 'Reopen'}
                  </button>

                  {isAdmin && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      title="Reassign to another recruiter"
                      onClick={() => {
                        setReassignJob(job);
                        setSelectedOwner(job.owner?._id || '');
                      }}
                    >
                      Reassign
                    </button>
                  )}

                  <button
                    type="button"
                    className="btn btn-ghost btn-sm btn-danger"
                    title="Delete Job"
                    onClick={() => handleDeleteJob(job)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Job Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={closeFormModal}
        title={editingJobId ? 'Edit Job Requirements' : 'Create New Job Opening'}
        subtitle={editingJobId ? 'Updating requirements will automatically re-score all existing candidates.' : 'Define required skills and criteria for automated AI resume screening.'}
        maxWidth={620}
      >
        <form onSubmit={handleSaveJob}>
          {formErr && (
            <div className="alert-box alert-danger">
              <AlertCircle size={16} />
              <span>{formErr}</span>
            </div>
          )}

          {editingJobId && (
            <div className="alert-box alert-info" style={{ marginBottom: '1.25rem' }}>
              <Sparkles size={16} />
              <span>
                Any changes to required skills, experience, or description will automatically trigger real-time AI re-scoring for all screened candidates.
              </span>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Job Title *</label>
            <input
              className="form-input"
              type="text"
              required
              minLength={2}
              maxLength={150}
              placeholder="e.g. Senior Full Stack Developer"
              value={formData.title}
              onChange={handleFieldChange('title')}
            />
          </div>

          <div className="grid-2" style={{ gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Department</label>
              <input
                className="form-input"
                type="text"
                maxLength={100}
                placeholder="e.g. Engineering"
                value={formData.department}
                onChange={handleFieldChange('department')}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Location</label>
              <input
                className="form-input"
                type="text"
                maxLength={100}
                placeholder="e.g. San Francisco, CA / Remote"
                value={formData.location}
                onChange={handleFieldChange('location')}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Required Skills (Comma separated) *</label>
            <input
              className="form-input"
              type="text"
              placeholder="e.g. react, node.js, typescript, mongodb, docker"
              value={formData.requiredSkills}
              onChange={handleFieldChange('requiredSkills')}
            />
            <small style={{ color: 'var(--text-muted)' }}>
              Skills are normalized against our 200+ industry dictionary for exact and semantic matching.
            </small>
          </div>

          <div className="grid-2" style={{ gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Minimum Years Experience</label>
              <input
                className="form-input"
                type="number"
                min="0"
                max="50"
                value={formData.minExperience}
                onChange={handleFieldChange('minExperience')}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Minimum Education</label>
              <select
                className="form-select"
                value={formData.minEducation}
                onChange={handleFieldChange('minEducation')}
              >
                <option value="any">Any Level</option>
                <option value="diploma">Diploma / Associate</option>
                <option value="bachelor">Bachelor's Degree</option>
                <option value="master">Master's Degree</option>
                <option value="phd">PhD / Doctorate</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Job Description *</label>
            <textarea
              className="form-textarea"
              required
              rows={5}
              maxLength={10000}
              placeholder="Paste full responsibilities, requirements, and tech stack details. The AI matcher extracts JD keywords from this text."
              value={formData.description}
              onChange={handleFieldChange('description')}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={closeFormModal}>
              Cancel
            </button>
            <button type="submit" className="btn btn-teal" disabled={saving}>
              {saving ? 'Saving...' : editingJobId ? 'Save & Rescore Candidates' : 'Publish Job'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Admin Reassign Modal */}
      {isAdmin && (
        <Modal
          isOpen={!!reassignJob}
          onClose={() => setReassignJob(null)}
          title="Reassign Job Ownership"
          subtitle={`Transfer "${reassignJob?.title}" and all its candidates to another recruiter or admin.`}
          maxWidth={480}
        >
          <form onSubmit={handleReassignOwner}>
            <div className="form-group">
              <label className="form-label">Select New Owner *</label>
              <select
                className="form-select"
                required
                value={selectedOwner}
                onChange={e => setSelectedOwner(e.target.value)}
              >
                <option value="">-- Choose active recruiter or admin --</option>
                {recruiters.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email}) - {u.role}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setReassignJob(null)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-teal" disabled={reassigning || !selectedOwner}>
                {reassigning ? 'Reassigning...' : 'Confirm Transfer'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
