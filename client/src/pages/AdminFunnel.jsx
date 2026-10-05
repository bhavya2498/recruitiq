import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  Filter,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowDown,
  Sparkles,
  ArrowRight,
  Briefcase
} from 'lucide-react';
import api, { errMsg } from '../api.js';
import { label } from '../stages.js';

const FUNNEL_STAGES = [
  { key: 'applied', label: '1. Applied (Top of Funnel)', color: '#64748b', bg: '#f1f5f9' },
  { key: 'screening', label: '2. Under Screening', color: '#d97706', bg: '#fffbeb' },
  { key: 'shortlisted', label: '3. AI Shortlisted', color: '#059669', bg: '#ecfdf5' },
  { key: 'interview', label: '4. Interview Round', color: '#0284c7', bg: '#f0f9ff' },
  { key: 'hired', label: '5. Successfully Hired', color: '#0f172a', bg: '#e2e8f0' }
];

export default function AdminFunnel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get('/analytics')
      .then(r => setData(r.data))
      .catch(x => setErr(errMsg(x)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>
        <Clock className="animate-spin" size={24} style={{ margin: '0 auto 0.5rem' }} />
        <p>Loading hiring funnel analytics...</p>
      </div>
    );
  }

  const pipelineMap = Object.fromEntries(
    (data?.pipeline || []).map(p => [p.name, p.value || 0])
  );

  const totalApplicants = data?.totals?.applicants || 0;
  const rejectedCount = pipelineMap['rejected'] || 0;

  // Compute cumulative volume that reached or passed each stage
  // In our pipeline: applied -> screening -> shortlisted -> interview -> hired
  const appliedCount = pipelineMap['applied'] || 0;
  const screeningCount = pipelineMap['screening'] || 0;
  const shortlistedCount = pipelineMap['shortlisted'] || 0;
  const interviewCount = pipelineMap['interview'] || 0;
  const hiredCount = pipelineMap['hired'] || 0;

  const stageCounts = {
    applied: totalApplicants,
    screening: screeningCount + shortlistedCount + interviewCount + hiredCount,
    shortlisted: shortlistedCount + interviewCount + hiredCount,
    interview: interviewCount + hiredCount,
    hired: hiredCount
  };

  const hireRate = totalApplicants > 0 ? ((hiredCount / totalApplicants) * 100).toFixed(1) : 0;
  const interviewRate = totalApplicants > 0 ? (((interviewCount + hiredCount) / totalApplicants) * 100).toFixed(1) : 0;
  const shortlistRate = totalApplicants > 0 ? (((shortlistedCount + interviewCount + hiredCount) / totalApplicants) * 100).toFixed(1) : 0;

  return (
    <div>
      {/* Header */}
      <div className="flex-between" style={{ marginBottom: '2rem', flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <h1 style={{ margin: 0 }}>Hiring Funnel & Conversion Analytics</h1>
            <span className="badge stage-hired">Admin / HR Scope</span>
          </div>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
            Examine applicant flow, stage conversion ratios, drop-off rates, and hiring velocity.
          </p>
        </div>

        <Link to="/app" className="btn btn-secondary">
          Back to Overview
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Funnel Volume</span>
            <div className="metric-icon-wrap" style={{ background: '#eff6ff', color: '#2563eb' }}>
              <Users size={18} />
            </div>
          </div>
          <div className="metric-value">{totalApplicants}</div>
          <div className="metric-subtext">Total candidates screened</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Shortlist Pass Rate</span>
            <div className="metric-icon-wrap" style={{ background: '#ecfdf5', color: '#059669' }}>
              <Sparkles size={18} />
            </div>
          </div>
          <div className="metric-value">{shortlistRate}%</div>
          <div className="metric-subtext">Candidates meeting threshold</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Interview Advance</span>
            <div className="metric-icon-wrap" style={{ background: '#f0f9ff', color: '#0284c7' }}>
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="metric-value">{interviewRate}%</div>
          <div className="metric-subtext">Invited to interview round</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Offer Accepted / Hired</span>
            <div className="metric-icon-wrap" style={{ background: '#f1f5f9', color: '#0f172a' }}>
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="metric-value">{hireRate}%</div>
          <div className="metric-subtext">{hiredCount} total hires closed</div>
        </div>
      </div>

      {/* Visual Funnel Section */}
      <div className="grid-2" style={{ alignItems: 'start', gap: '1.75rem', marginBottom: '2rem' }}>
        {/* Left: Funnel Bars */}
        <div className="card">
          <div className="card-header" style={{ padding: '0 0 1.25rem 0' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Stage Progression Funnel</h3>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Candidate volume progressing through each successive hiring stage
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.25rem' }}>
            {FUNNEL_STAGES.map((s, idx) => {
              const currentVolume = stageCounts[s.key] || 0;
              const pctOfTotal = totalApplicants > 0 ? Math.round((currentVolume / totalApplicants) * 100) : 0;
              const prevStageKey = idx > 0 ? FUNNEL_STAGES[idx - 1].key : null;
              const prevVolume = prevStageKey ? stageCounts[prevStageKey] : null;
              const conversionFromPrev = prevVolume && prevVolume > 0 ? Math.round((currentVolume / prevVolume) * 100) : null;

              return (
                <div key={s.key} style={{ position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--brand-navy)' }}>
                      {s.label}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{currentVolume}</span>
                      <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                        ({pctOfTotal}% of pool)
                      </span>
                    </div>
                  </div>

                  {/* Funnel Bar */}
                  <div
                    style={{
                      height: '36px',
                      background: 'var(--bg-subtle)',
                      borderRadius: 'var(--r-md)',
                      overflow: 'hidden',
                      position: 'relative'
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.max(4, pctOfTotal)}%`,
                        background: s.color,
                        borderRadius: 'var(--r-md)',
                        transition: 'width 0.8s ease'
                      }}
                    />
                  </div>

                  {/* Stage-to-stage transition indicator */}
                  {idx < FUNNEL_STAGES.length - 1 && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem',
                        margin: '0.4rem 0',
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)'
                      }}
                    >
                      <ArrowDown size={13} />
                      <span>
                        Next Stage Conversion: <b>{conversionFromPrev !== null ? `${conversionFromPrev}%` : 'N/A'}</b>
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Funnel Breakdown & Insights */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Drop-off & Rejections Card */}
          <div className="card">
            <div className="card-header" style={{ padding: '0 0 1rem 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <XCircle size={18} style={{ color: 'var(--danger-solid)' }} />
                <h3 style={{ margin: 0, fontSize: '1.05rem' }}>Drop-off & Rejections</h3>
              </div>
            </div>

            <div style={{ marginTop: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Archived / Rejected Candidates:</span>
                <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--danger-text)' }}>
                  {rejectedCount}
                </span>
              </div>

              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--r-md)', padding: '0.85rem 1rem', fontSize: '0.85rem', color: '#991b1b', lineHeight: 1.5 }}>
                Candidates marked as rejected can be re-opened by recruiters to the Screening stage at any time if new headcount or requirements change.
              </div>
            </div>
          </div>

          {/* Sourcing Breakdown */}
          <div className="card">
            <div className="card-header" style={{ padding: '0 0 1rem 0' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem' }}>Applicant Inbound Channels</h3>
            </div>

            <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'var(--bg-subtle)', borderRadius: 'var(--r-md)' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Direct Candidate Applications</div>
                  <small style={{ color: 'var(--text-muted)' }}>Registered candidates applying via job board</small>
                </div>
                <div style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--brand-teal)' }}>
                  {data?.sources?.application || 0}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'var(--bg-subtle)', borderRadius: 'var(--r-md)' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Recruiter Batch Uploads</div>
                  <small style={{ color: 'var(--text-muted)' }}>Uploaded PDF/DOCX resumes screened directly</small>
                </div>
                <div style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--brand-navy)' }}>
                  {data?.sources?.recruiter_upload || 0}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
