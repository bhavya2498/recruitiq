import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Briefcase,
  Building2,
  MapPin,
  Clock,
  GraduationCap,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText
} from 'lucide-react';
import api, { errMsg } from '../api.js';
import Modal from '../components/Modal.jsx';

export default function CandidateJobs() {
  const [data, setData] = useState(null);
  const [q, setQ] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [busy, setBusy] = useState('');
  const [selectedJob, setSelectedJob] = useState(null);
  const [hasResume, setHasResume] = useState(true);

  // Check if profile has resume
  useEffect(() => {
    api.get('/portal/profile')
      .then(r => setHasResume(r.data.hasResume))
      .catch(() => {});
  }, []);

  const load = () => {
    api.get('/portal/jobs', { params: { ...(q ? { q } : {}), page } })
      .then(r => setData(r.data))
      .catch(x => setMsg({ type: 'error', text: errMsg(x) }));
  };

  useEffect(() => {
    load();
  }, [page, q]);

  const handleSearch = e => {
    e.preventDefault();
    setPage(1);
    setQ(searchInput);
  };

  const apply = async job => {
    if (!hasResume) {
      setMsg({
        type: 'warning',
        text: 'Please upload a resume to your profile before applying. The AI screen runs automatically against your resume.'
      });
      return;
    }

    setBusy(job.id);
    setMsg({ type: '', text: '' });
    try {
      await api.post(`/portal/jobs/${job.id}/apply`);
      setMsg({
        type: 'success',
        text: `Application submitted successfully for ${job.title}! You can track its progress under My Applications.`
      });
      if (selectedJob?.id === job.id) {
        setSelectedJob({ ...selectedJob, applied: true });
      }
      load();
    } catch (x) {
      setMsg({ type: 'error', text: errMsg(x) });
    } finally {
      setBusy('');
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="flex-between" style={{ marginBottom: '1.75rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ marginBottom: '0.25rem' }}>Browse Open Jobs</h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
            Discover and apply to roles matching your skills with transparent AI screening.
          </p>
        </div>

        {!hasResume && (
          <div className="alert-box alert-warning" style={{ margin: 0, padding: '0.5rem 0.85rem' }}>
            <AlertCircle size={16} />
            <span>Resume missing. <Link to="/app/portal/profile" style={{ fontWeight: 600, textDecoration: 'underline' }}>Upload resume</Link> to apply.</span>
          </div>
        )}
      </div>

      {/* Notifications */}
      {msg.text && (
        <div
          className={`alert-box alert-${msg.type === 'error' ? 'danger' : msg.type === 'warning' ? 'warning' : 'success'}`}
        >
          {msg.type === 'error' ? <AlertCircle size={18} /> : msg.type === 'warning' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <div style={{ flex: 1 }}>
            <span>{msg.text}</span>
            {msg.text.includes('My Applications') && (
              <Link to="/app/portal/applications" style={{ fontWeight: 600, marginLeft: '0.5rem', textDecoration: 'underline' }}>
                View My Applications &rarr;
              </Link>
            )}
            {msg.text.includes('profile') && (
              <Link to="/app/portal/profile" style={{ fontWeight: 600, marginLeft: '0.5rem', textDecoration: 'underline' }}>
                Go to Profile &rarr;
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Search Bar */}
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.75rem', flexWrap: 'wrap' }}>
        <div className="search-bar" style={{ maxWidth: '480px', flex: 1 }}>
          <Search size={16} style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search by job title, department, or location..."
            value={searchInput}
            maxLength={100}
            onChange={e => setSearchInput(e.target.value)}
          />
        </div>
        <button type="submit" className="btn btn-secondary">
          Search
        </button>
        {q && (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              setSearchInput('');
              setQ('');
              setPage(1);
            }}
          >
            Clear Search
          </button>
        )}
      </form>

      {/* Content State */}
      {!data ? (
        <div style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Clock className="animate-spin" size={24} style={{ margin: '0 auto 0.5rem' }} />
          <p>Loading open opportunities...</p>
        </div>
      ) : !data.items.length ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <Briefcase size={28} />
          </div>
          <h3>No matching jobs found</h3>
          <p style={{ maxWidth: '400px', margin: '0.5rem auto 1.5rem' }}>
            We could not find any active jobs matching your search criteria. Try using different keywords or clearing your filters.
          </p>
          {q && (
            <button
              className="btn btn-secondary"
              onClick={() => {
                setSearchInput('');
                setQ('');
                setPage(1);
              }}
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              Showing {data.items.length} of {data.total} open position{data.total === 1 ? '' : 's'}
            </span>
          </div>

          {/* Job Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
            {data.items.map(job => (
              <div
                key={job.id}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  border: job.applied ? '1px solid #a7f3d0' : '1px solid var(--border-subtle)',
                  background: job.applied ? 'linear-gradient(180deg, #ffffff 0%, #f0fdf4 100%)' : '#ffffff'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <h3 style={{ fontSize: '1.15rem', margin: 0, color: 'var(--brand-navy)' }}>
                      {job.title}
                    </h3>
                    {job.applied ? (
                      <span className="badge stage-shortlisted" style={{ fontSize: '0.72rem' }}>
                        <CheckCircle2 size={12} /> Applied
                      </span>
                    ) : (
                      <span className="badge status-open" style={{ fontSize: '0.72rem' }}>
                        Open
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', margin: '0.4rem 0 0.85rem 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Building2 size={13} /> {job.company || 'Direct Hiring'}
                    </span>
                    {job.department && <span>· {job.department}</span>}
                    {job.location && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        · <MapPin size={13} /> {job.location}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.85rem' }}>
                    {job.minExperience > 0 ? (
                      <span className="chip" style={{ background: '#f8fafc' }}>
                        <Clock size={11} style={{ marginRight: '0.25rem' }} /> {job.minExperience}+ yrs exp
                      </span>
                    ) : (
                      <span className="chip" style={{ background: '#f8fafc' }}>Entry level</span>
                    )}
                    {job.minEducation && job.minEducation !== 'any' && (
                      <span className="chip" style={{ background: '#f8fafc', textTransform: 'capitalize' }}>
                        <GraduationCap size={11} style={{ marginRight: '0.25rem' }} /> {job.minEducation}
                      </span>
                    )}
                  </div>

                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '0 0 1rem 0', lineClamp: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {job.description}
                  </p>

                  <div className="chips-container" style={{ marginBottom: '1.25rem' }}>
                    {(job.requiredSkills || []).map(skill => (
                      <span className="chip" key={skill}>
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: '1rem',
                    borderTop: '1px solid var(--border-light)',
                    gap: '0.75rem'
                  }}
                >
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setSelectedJob(job)}
                  >
                    View Details
                  </button>

                  {job.applied ? (
                    <Link to="/app/portal/applications" className="btn btn-ghost btn-sm" style={{ color: 'var(--brand-teal)' }}>
                      Track Stage &rarr;
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-sm"
                      disabled={busy === job.id}
                      onClick={() => apply(job)}
                    >
                      {busy === job.id ? (
                        <>
                          <Clock size={14} className="animate-spin" /> Screening...
                        </>
                      ) : (
                        '1-Click Apply'
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {data.pages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft size={16} /> Previous
              </button>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', padding: '0 0.5rem' }}>
                Page {page} of {data.pages}
              </span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={page >= data.pages}
                onClick={() => setPage(page + 1)}
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}

      {/* Job Details Modal */}
      <Modal
        isOpen={!!selectedJob}
        onClose={() => setSelectedJob(null)}
        title={selectedJob?.title || 'Job Details'}
        subtitle={[selectedJob?.company, selectedJob?.department, selectedJob?.location].filter(Boolean).join(' · ')}
        maxWidth={640}
      >
        {selectedJob && (
          <div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
              <span className="badge status-open">Open Position</span>
              {selectedJob.applied && (
                <span className="badge stage-shortlisted">
                  <CheckCircle2 size={12} /> You have already applied
                </span>
              )}
              {selectedJob.minExperience > 0 && (
                <span className="badge stage-applied">
                  {selectedJob.minExperience}+ Years Experience
                </span>
              )}
              {selectedJob.minEducation && selectedJob.minEducation !== 'any' && (
                <span className="badge stage-applied" style={{ textTransform: 'capitalize' }}>
                  {selectedJob.minEducation} Degree
                </span>
              )}
            </div>

            <h4 style={{ marginBottom: '0.4rem' }}>Required Skills</h4>
            <div className="chips-container" style={{ marginBottom: '1.25rem' }}>
              {(selectedJob.requiredSkills || []).map(s => (
                <span className="chip chip-matched" key={s}>
                  {s}
                </span>
              ))}
            </div>

            <h4 style={{ marginBottom: '0.4rem' }}>Job Description</h4>
            <div
              style={{
                fontSize: '0.9125rem',
                lineHeight: 1.6,
                color: 'var(--text-secondary)',
                whiteSpace: 'pre-wrap',
                background: 'var(--bg-subtle)',
                padding: '1rem',
                borderRadius: 'var(--r-md)',
                maxHeight: '260px',
                overflowY: 'auto',
                marginBottom: '1.5rem'
              }}
            >
              {selectedJob.description}
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: '1rem',
                borderTop: '1px solid var(--border-light)'
              }}
            >
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setSelectedJob(null)}
              >
                Close
              </button>

              {selectedJob.applied ? (
                <Link
                  to="/app/portal/applications"
                  className="btn btn-teal"
                  onClick={() => setSelectedJob(null)}
                >
                  Track in My Applications
                </Link>
              ) : (
                <button
                  type="button"
                  className="btn btn-teal"
                  disabled={busy === selectedJob.id}
                  onClick={() => apply(selectedJob)}
                >
                  {busy === selectedJob.id ? 'Submitting Application...' : 'Apply with Profile Resume'}
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
