import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileCheck,
  Building2,
  MapPin,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Briefcase,
  ArrowRight
} from 'lucide-react';
import api, { errMsg } from '../api.js';
import { label, fmt } from '../stages.js';

const FLOW = ['applied', 'screening', 'shortlisted', 'interview', 'hired'];

const STAGE_DESCRIPTIONS = {
  applied: 'Your application has been received and entered into the screening queue.',
  screening: 'The recruitment team is evaluating your qualifications against the role requirements.',
  shortlisted: 'Congratulations! Your profile has been shortlisted for further consideration.',
  interview: 'You are currently in the interview evaluation process with the hiring team.',
  hired: 'Offer accepted! You have been successfully hired for this position.',
  rejected: 'This application was not advanced for this opening.'
};

export default function MyApplications() {
  const [apps, setApps] = useState(null);
  const [filter, setFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get('/portal/applications')
      .then(r => setApps(r.data))
      .catch(x => setErr(errMsg(x)));
  }, []);

  if (err) {
    return (
      <div className="alert-box alert-danger">
        <AlertCircle size={18} />
        <span>{err}</span>
      </div>
    );
  }

  if (!apps) {
    return (
      <div style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>
        <Clock className="animate-spin" size={24} style={{ margin: '0 auto 0.5rem' }} />
        <p>Loading your application history...</p>
      </div>
    );
  }

  const filteredApps = apps.filter(a => {
    if (filter === 'all') return true;
    if (filter === 'active') return ['applied', 'screening', 'shortlisted', 'interview'].includes(a.stage);
    if (filter === 'hired') return a.stage === 'hired';
    if (filter === 'rejected') return a.stage === 'rejected';
    return true;
  });

  return (
    <div>
      {/* Header */}
      <div className="flex-between" style={{ marginBottom: '1.75rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ marginBottom: '0.25rem' }}>My Applications</h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
            Real-time status tracking and stage progression for all your submitted applications.
          </p>
        </div>

        <Link to="/app/portal/jobs" className="btn btn-secondary">
          <Briefcase size={16} /> Browse More Jobs
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="tabs-segmented" style={{ marginBottom: '1.5rem' }}>
        <button
          type="button"
          className={`tab-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All Applications ({apps.length})
        </button>
        <button
          type="button"
          className={`tab-btn ${filter === 'active' ? 'active' : ''}`}
          onClick={() => setFilter('active')}
        >
          In Progress ({apps.filter(a => ['applied', 'screening', 'shortlisted', 'interview'].includes(a.stage)).length})
        </button>
        <button
          type="button"
          className={`tab-btn ${filter === 'hired' ? 'active' : ''}`}
          onClick={() => setFilter('hired')}
        >
          Hired ({apps.filter(a => a.stage === 'hired').length})
        </button>
        <button
          type="button"
          className={`tab-btn ${filter === 'rejected' ? 'active' : ''}`}
          onClick={() => setFilter('rejected')}
        >
          Archived / Closed ({apps.filter(a => a.stage === 'rejected').length})
        </button>
      </div>

      {/* Empty State */}
      {!apps.length ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <FileCheck size={28} />
          </div>
          <h3>No applications yet</h3>
          <p style={{ maxWidth: '400px', margin: '0.5rem auto 1.5rem' }}>
            You haven't applied to any roles yet. Explore our open positions and submit your profile in one click.
          </p>
          <Link className="btn btn-teal" to="/app/portal/jobs">
            Browse Open Jobs <ArrowRight size={14} />
          </Link>
        </div>
      ) : !filteredApps.length ? (
        <div className="empty-state" style={{ padding: '2.5rem 1rem' }}>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>No applications found in this filter category.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {filteredApps.map(a => {
            const isRejected = a.stage === 'rejected';
            const isHired = a.stage === 'hired';
            const currentIdx = FLOW.indexOf(a.stage);
            const reachedIdx = isRejected
              ? Math.max(0, ...a.timeline.map(t => FLOW.indexOf(t.to)))
              : currentIdx;

            const isExpanded = expandedId === a.id;

            return (
              <div
                key={a.id}
                className="card"
                style={{
                  border: isHired
                    ? '1px solid #a7f3d0'
                    : isRejected
                    ? '1px solid #fecaca'
                    : '1px solid var(--border-subtle)',
                  background: isHired
                    ? 'linear-gradient(180deg, #ffffff 0%, #f0fdf4 100%)'
                    : isRejected
                    ? 'linear-gradient(180deg, #ffffff 0%, #fffbfb 100%)'
                    : '#ffffff'
                }}
              >
                {/* Application Header */}
                <div className="flex-between" style={{ flexWrap: 'wrap', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.35rem' }}>
                      <h3 style={{ fontSize: '1.25rem', margin: 0, color: 'var(--brand-navy)' }}>
                        {a.job?.title || 'Open Position'}
                      </h3>
                      <span className={`badge stage-${a.stage}`}>
                        {label(a.stage)}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                      {a.job?.department && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Building2 size={13} /> {a.job.department}
                        </span>
                      )}
                      {a.job?.location && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <MapPin size={13} /> {a.job.location}
                        </span>
                      )}
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Calendar size={13} /> Applied {fmt(a.appliedAt)}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setExpandedId(isExpanded ? null : a.id)}
                  >
                    {isExpanded ? (
                      <>
                        Hide Timeline <ChevronUp size={14} />
                      </>
                    ) : (
                      <>
                        View Timeline <ChevronDown size={14} />
                      </>
                    )}
                  </button>
                </div>

                {/* Pipeline Visual Stepper */}
                <div style={{ padding: '0.5rem 0', marginBottom: '1rem' }}>
                  <div className="pipeline-stepper">
                    {FLOW.map((s, i) => {
                      const isCompleted = i < currentIdx || (isRejected && i <= reachedIdx && !isRejected);
                      const isCurrent = i === currentIdx;
                      const wasReached = isRejected && i === reachedIdx;

                      let nodeClass = '';
                      if (isCompleted) nodeClass = 'completed';
                      else if (isCurrent) nodeClass = 'current';
                      else if (wasReached) nodeClass = 'rejected';

                      return (
                        <div key={s} className={`pipeline-step ${nodeClass}`}>
                          <div className="step-node">
                            {isCompleted ? (
                              <CheckCircle2 size={16} />
                            ) : wasReached ? (
                              <XCircle size={16} />
                            ) : (
                              i + 1
                            )}
                          </div>
                          <span className="step-label">
                            {label(s)}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Stage description banner */}
                  <div
                    style={{
                      background: isRejected ? '#fef2f2' : isHired ? '#ecfdf5' : '#f8fafc',
                      border: `1px solid ${isRejected ? '#fecaca' : isHired ? '#a7f3d0' : '#e2e8f0'}`,
                      borderRadius: 'var(--r-md)',
                      padding: '0.75rem 1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.625rem',
                      fontSize: '0.85rem',
                      color: isRejected ? '#991b1b' : isHired ? '#065f46' : 'var(--text-secondary)'
                    }}
                  >
                    {isRejected ? <XCircle size={16} /> : isHired ? <CheckCircle2 size={16} /> : <Clock size={16} />}
                    <span>{STAGE_DESCRIPTIONS[a.stage] || 'Application in progress.'}</span>
                  </div>
                </div>

                {/* Expandable History Timeline */}
                {isExpanded && (
                  <div
                    style={{
                      marginTop: '1.25rem',
                      paddingTop: '1.25rem',
                      borderTop: '1px solid var(--border-light)'
                    }}
                  >
                    <h4 style={{ fontSize: '0.9rem', marginBottom: '0.85rem', color: 'var(--brand-navy)' }}>
                      Activity History & Stage Events
                    </h4>

                    <ol className="timeline-list">
                      {(a.timeline || []).slice().reverse().map((t, idx) => (
                        <li className="timeline-item" key={idx}>
                          <div className="timeline-time">{fmt(t.at)}</div>
                          <div className="timeline-title">
                            {t.from ? `Transitioned from ${label(t.from)} to ${label(t.to)}` : `Application Stage: ${label(t.to)}`}
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
