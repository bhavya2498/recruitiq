import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase,
  FileCheck,
  Clock,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Building2,
  MapPin,
  Calendar,
  FileText
} from 'lucide-react';
import api, { errMsg } from '../api.js';
import { label, fmt } from '../stages.js';

export default function CandidateDashboard() {
  const [profile, setProfile] = useState(null);
  const [applications, setApplications] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/portal/profile'),
      api.get('/portal/applications'),
      api.get('/portal/jobs', { params: { page: 1 } })
    ])
      .then(([profRes, appsRes, jobsRes]) => {
        setProfile(profRes.data);
        setApplications(appsRes.data);
        setJobs(jobsRes.data.items || []);
      })
      .catch(e => setErr(errMsg(e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '2rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-muted)' }}>
        <Clock className="animate-spin" size={20} />
        <span>Loading your candidate dashboard...</span>
      </div>
    );
  }

  const p = profile?.profile || {};
  const hasResume = profile?.hasResume;
  const activeApps = applications.filter(a => ['applied', 'screening', 'shortlisted', 'interview'].includes(a.stage));
  const advancedApps = applications.filter(a => ['shortlisted', 'interview', 'hired'].includes(a.stage));

  return (
    <div>
      {/* Welcome Banner */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)',
          border: '1px solid #dcfce7',
          padding: '1.75rem 2rem',
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1.5rem',
          flexWrap: 'wrap'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span className="badge stage-shortlisted" style={{ fontSize: '0.75rem' }}>
              <Sparkles size={12} /> Candidate Portal
            </span>
            {hasResume ? (
              <span className="badge status-open" style={{ fontSize: '0.75rem' }}>
                <CheckCircle2 size={12} /> Resume Ready
              </span>
            ) : (
              <span className="badge stage-screening" style={{ fontSize: '0.75rem' }}>
                <AlertCircle size={12} /> Resume Required to Apply
              </span>
            )}
          </div>
          <h1 style={{ fontSize: '1.75rem', margin: '0 0 0.35rem 0' }}>
            Welcome back, {profile?.name || 'Candidate'}
          </h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            {p.headline || 'Find your next career move with transparent, AI-screened recruitment.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link to="/app/portal/jobs" className="btn btn-teal">
            <Briefcase size={16} /> Browse Open Roles
          </Link>
          <Link to="/app/portal/profile" className="btn btn-secondary">
            <FileText size={16} /> Edit Profile & Resume
          </Link>
        </div>
      </div>

      {err && (
        <div className="alert-box alert-danger">
          <AlertCircle size={18} />
          <span>{err}</span>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Applications</span>
            <div className="metric-icon-wrap" style={{ background: '#eff6ff', color: '#2563eb' }}>
              <FileCheck size={18} />
            </div>
          </div>
          <div className="metric-value">{applications.length}</div>
          <div className="metric-subtext">Total roles applied</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Active in Pipeline</span>
            <div className="metric-icon-wrap" style={{ background: '#fef3c7', color: '#d97706' }}>
              <Clock size={18} />
            </div>
          </div>
          <div className="metric-value">{activeApps.length}</div>
          <div className="metric-subtext">In screening or review</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Shortlisted & Interview</span>
            <div className="metric-icon-wrap" style={{ background: '#ecfdf5', color: '#059669' }}>
              <Sparkles size={18} />
            </div>
          </div>
          <div className="metric-value">{advancedApps.length}</div>
          <div className="metric-subtext">Progressed applications</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">AI Skills Detected</span>
            <div className="metric-icon-wrap" style={{ background: '#f3e8ff', color: '#7c3aed' }}>
              <FileText size={18} />
            </div>
          </div>
          <div className="metric-value">{p.skills?.length || 0}</div>
          <div className="metric-subtext">
            {hasResume ? 'Extracted from resume' : 'Upload resume to parse'}
          </div>
        </div>
      </div>

      {/* Grid: Recent Applications & Resume Insights */}
      <div className="grid-2" style={{ marginBottom: '2rem' }}>
        {/* Left: Applications Overview */}
        <div className="card card-flush">
          <div className="card-header">
            <div>
              <h3 style={{ margin: 0 }}>Recent Applications</h3>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Track the status and timeline of your submissions
              </p>
            </div>
            <Link to="/app/portal/applications" className="btn btn-ghost btn-sm" style={{ color: 'var(--brand-blue)' }}>
              View all <ArrowRight size={14} />
            </Link>
          </div>

          <div style={{ padding: '1rem 1.25rem' }}>
            {!applications.length ? (
              <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
                <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>You have not submitted any applications yet.</p>
                <Link to="/app/portal/jobs" className="btn btn-sm">Browse open jobs</Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                {applications.slice(0, 4).map(app => (
                  <div
                    key={app.id}
                    style={{
                      padding: '0.875rem 1rem',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--r-md)',
                      background: 'var(--bg-hover)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '1rem'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.925rem', color: 'var(--text-primary)' }}>
                        {app.job?.title || 'Open Role'}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {app.job?.department && <span>{app.job.department}</span>}
                        {app.job?.location && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                            <MapPin size={12} /> {app.job.location}
                          </span>
                        )}
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                          <Calendar size={12} /> {fmt(app.appliedAt)}
                        </span>
                      </div>
                    </div>
                    <div>
                      <span className={`badge stage-${app.stage}`}>
                        {label(app.stage)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: AI Profile & Resume Status */}
        <div className="card">
          <div className="card-header" style={{ padding: '0 0 1rem 0' }}>
            <div>
              <h3 style={{ margin: 0 }}>Resume & Screening Profile</h3>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                How the AI screening engine reads your profile
              </p>
            </div>
            <Link to="/app/portal/profile" className="btn btn-ghost btn-sm" style={{ color: 'var(--brand-blue)' }}>
              Manage <ArrowRight size={14} />
            </Link>
          </div>

          <div style={{ marginTop: '1.25rem' }}>
            {hasResume ? (
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem 1rem',
                    background: '#f8fafc',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--r-md)',
                    marginBottom: '1.25rem'
                  }}
                >
                  <FileText size={24} style={{ color: 'var(--brand-teal)' }} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.resumeFileName}
                    </div>
                    <small style={{ color: 'var(--text-tertiary)' }}>
                      Updated {fmt(p.resumeUpdatedAt)}
                    </small>
                  </div>
                  <span className="badge status-open" style={{ fontSize: '0.7rem' }}>Active</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: 'var(--r-md)', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--brand-navy)' }}>
                      {p.yearsExperience ?? 0}
                    </div>
                    <small style={{ color: 'var(--text-muted)' }}>Years Experience</small>
                  </div>
                  <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: 'var(--r-md)', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--brand-navy)', textTransform: 'capitalize' }}>
                      {p.education || 'N/A'}
                    </div>
                    <small style={{ color: 'var(--text-muted)' }}>Education</small>
                  </div>
                  <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: 'var(--r-md)', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--brand-navy)' }}>
                      {p.projectsCount ?? 0}
                    </div>
                    <small style={{ color: 'var(--text-muted)' }}>Projects Found</small>
                  </div>
                </div>

                <div>
                  <h4 style={{ fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                    Extracted Skills ({p.skills?.length || 0})
                  </h4>
                  <div className="chips-container">
                    {(p.skills || []).slice(0, 10).map(s => (
                      <span className="chip" key={s}>
                        {s}
                      </span>
                    ))}
                    {(p.skills?.length || 0) > 10 && (
                      <span className="chip" style={{ background: '#f1f5f9', color: 'var(--text-muted)' }}>
                        +{p.skills.length - 10} more
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                <AlertCircle size={36} style={{ color: '#f59e0b', margin: '0 auto 0.75rem' }} />
                <h4 style={{ margin: '0 0 0.5rem 0' }}>Upload your resume to activate 1-click apply</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                  Our parser extracts your skills, experience, and projects so recruiters can match you accurately.
                </p>
                <Link to="/app/portal/profile" className="btn btn-teal btn-sm">
                  Upload Resume Now
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Featured Open Roles Preview */}
      <div className="card card-flush">
        <div className="card-header">
          <div>
            <h3 style={{ margin: 0 }}>Latest Open Positions</h3>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Explore recently posted opportunities across hiring departments
            </p>
          </div>
          <Link to="/app/portal/jobs" className="btn btn-secondary btn-sm">
            View All Open Jobs <ArrowRight size={14} />
          </Link>
        </div>

        <div style={{ padding: '1.25rem' }}>
          <div className="grid-3">
            {jobs.slice(0, 3).map(j => (
              <div
                key={j.id}
                style={{
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--r-lg)',
                  padding: '1.25rem',
                  background: '#ffffff',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span className="badge status-open">Open</span>
                    {j.applied && <span className="badge stage-shortlisted">Applied</span>}
                  </div>
                  <h4 style={{ fontSize: '1.05rem', margin: '0 0 0.35rem 0' }}>{j.title}</h4>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '0 0 0.75rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Building2 size={13} /> {j.company || 'RecruitIQ Partner'}
                    {j.location && <> · <MapPin size={13} /> {j.location}</>}
                  </p>
                  <div className="chips-container" style={{ marginBottom: '1rem' }}>
                    {(j.requiredSkills || []).slice(0, 3).map(s => (
                      <span className="chip" key={s}>{s}</span>
                    ))}
                  </div>
                </div>

                <Link
                  to="/app/portal/jobs"
                  className="btn btn-secondary btn-sm"
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  View Details & Apply
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
