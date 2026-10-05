import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  Users,
  Briefcase,
  CheckCircle2,
  Clock,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  PlusCircle,
  Building2,
  ShieldCheck,
  UserCheck,
  Award,
  ArrowRight,
  UploadCloud,
  FileCheck,
  Layers,
  ArrowDown
} from 'lucide-react';
import api, { errMsg } from '../api.js';

const VERDICT_COLORS = {
  shortlisted: '#10b981', // emerald
  review: '#f59e0b',      // amber
  rejected: '#ef4444'     // red
};

const STAGE_COLORS = {
  applied: '#64748b',
  screening: '#f59e0b',
  shortlisted: '#10b981',
  interview: '#0284c7',
  hired: '#0f172a',
  rejected: '#ef4444'
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          background: '#ffffff',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--r-md)',
          padding: '0.5rem 0.85rem',
          boxShadow: 'var(--shadow-md)',
          fontSize: '0.8125rem'
        }}
      >
        <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary)' }}>{label || payload[0].name}</p>
        <p style={{ margin: '0.2rem 0 0', color: payload[0].fill || 'var(--brand-navy)' }}>
          {payload[0].value} {payload[0].name ? `(${payload[0].name})` : 'candidates'}
        </p>
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
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
        <p>Loading analytics data...</p>
      </div>
    );
  }

  if (err) {
    return (
      <div className="alert-box alert-danger">
        <AlertTriangle size={18} />
        <span>{err}</span>
      </div>
    );
  }

  const t = data?.totals || {};
  const isAdmin = data?.role === 'admin';

  // Empty state when recruiter has no jobs or candidates
  if (!t.applicants && !t.allJobs) {
    return (
      <div>
        <div className="flex-between" style={{ marginBottom: '2rem' }}>
          <div>
            <h1 style={{ marginBottom: '0.25rem' }}>{isAdmin ? 'Organisation Dashboard' : 'Recruitment Dashboard'}</h1>
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
              Real-time talent acquisition analytics and pipeline management.
            </p>
          </div>
        </div>

        <div className="card" style={{ padding: '3rem 2rem', textAlign: 'center', background: '#ffffff', border: '1px solid var(--border-subtle)', borderRadius: 'var(--r-xl)', maxWidth: '780px', margin: '0 auto' }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 'var(--r-full)',
              background: '#eff6ff',
              color: 'var(--brand-blue)',
              display: 'grid',
              placeItems: 'center',
              margin: '0 auto 1.25rem'
            }}
          >
            <Sparkles size={28} />
          </div>

          <h2 style={{ fontSize: '1.6rem', marginBottom: '0.5rem', color: 'var(--brand-navy)' }}>
            Welcome to RecruitIQ
          </h2>
          <p style={{ maxWidth: '520px', margin: '0 auto 2rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            You haven't posted any jobs or screened candidates yet. Follow these quick steps to experience automated AI resume ranking:
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', textAlign: 'left', marginBottom: '2.5rem' }}>
            <div style={{ padding: '1.25rem', background: 'var(--bg-subtle)', borderRadius: 'var(--r-lg)' }}>
              <div style={{ fontWeight: 700, color: 'var(--brand-blue)', marginBottom: '0.35rem' }}>Step 1</div>
              <h4 style={{ margin: '0 0 0.35rem 0', fontSize: '0.95rem' }}>Create a Job</h4>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: 0 }}>
                Set title, required skills, and minimum experience.
              </p>
            </div>

            <div style={{ padding: '1.25rem', background: 'var(--bg-subtle)', borderRadius: 'var(--r-lg)' }}>
              <div style={{ fontWeight: 700, color: 'var(--brand-teal)', marginBottom: '0.35rem' }}>Step 2</div>
              <h4 style={{ margin: '0 0 0.35rem 0', fontSize: '0.95rem' }}>Drop in Resumes</h4>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: 0 }}>
                Upload PDF or DOCX files in batch or accept online applicants.
              </p>
            </div>

            <div style={{ padding: '1.25rem', background: 'var(--bg-subtle)', borderRadius: 'var(--r-lg)' }}>
              <div style={{ fontWeight: 700, color: '#7c3aed', marginBottom: '0.35rem' }}>Step 3</div>
              <h4 style={{ margin: '0 0 0.35rem 0', fontSize: '0.95rem' }}>Review AI Rankings</h4>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: 0 }}>
                Inspect explainable match breakdowns and advance stages.
              </p>
            </div>
          </div>

          <Link to="/app/jobs" className="btn btn-teal btn-lg">
            <PlusCircle size={18} /> Create Your First Job
          </Link>
        </div>
      </div>
    );
  }

  const verdictData = [
    { name: 'Shortlisted', key: 'shortlisted', value: t.shortlisted || 0, color: VERDICT_COLORS.shortlisted },
    { name: 'Review', key: 'review', value: t.review || 0, color: VERDICT_COLORS.review },
    { name: 'Rejected', key: 'rejected', value: t.rejected || 0, color: VERDICT_COLORS.rejected }
  ].filter(x => x.value > 0);

  // Compute funnel metrics from real pipeline data
  const pipelineMap = Object.fromEntries(
    (data.pipeline || []).map(p => [p.name, p.value || 0])
  );
  const totalApps = t.applicants || 0;
  const appliedCount = pipelineMap['applied'] || 0;
  const screeningCount = pipelineMap['screening'] || 0;
  const shortlistedCount = pipelineMap['shortlisted'] || 0;
  const interviewCount = pipelineMap['interview'] || 0;
  const hiredCount = pipelineMap['hired'] || 0;

  return (
    <div>
      {/* Page Header */}
      <div className="flex-between" style={{ marginBottom: '2rem', flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <h1 style={{ margin: 0 }}>
              {isAdmin ? 'Organisation Overview' : 'Recruiter Dashboard'}
            </h1>
            <span className={`badge ${isAdmin ? 'stage-hired' : 'stage-interview'}`}>
              {isAdmin ? 'Admin / HR Scope' : 'Recruiter Workspace'}
            </span>
          </div>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
            Real-time pipeline analytics, AI candidate match metrics, and talent acquisition breakdown.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link to="/app/jobs" className="btn btn-teal">
            <PlusCircle size={16} /> Post New Job
          </Link>
          {isAdmin && (
            <Link to="/app/admin/funnel" className="btn btn-secondary">
              <TrendingUp size={16} /> Hiring Funnel
            </Link>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Total Applicants</span>
            <div className="metric-icon-wrap" style={{ background: '#eff6ff', color: '#2563eb' }}>
              <Users size={18} />
            </div>
          </div>
          <div className="metric-value">{t.applicants || 0}</div>
          <div className="metric-subtext">Across {t.allJobs || 0} job listings</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">AI Shortlisted</span>
            <div className="metric-icon-wrap" style={{ background: '#ecfdf5', color: '#059669' }}>
              <Sparkles size={18} />
            </div>
          </div>
          <div className="metric-value">{t.shortlisted || 0}</div>
          <div className="metric-subtext">Match score &ge; 75% threshold</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">In Interview</span>
            <div className="metric-icon-wrap" style={{ background: '#f0f9ff', color: '#0284c7' }}>
              <Clock size={18} />
            </div>
          </div>
          <div className="metric-value">{t.interviews || 0}</div>
          <div className="metric-subtext">Active evaluation rounds</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Hired</span>
            <div className="metric-icon-wrap" style={{ background: '#f1f5f9', color: '#0f172a' }}>
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="metric-value">{t.hired || 0}</div>
          <div className="metric-subtext">Positions successfully filled</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Avg AI Match</span>
            <div className="metric-icon-wrap" style={{ background: '#fef3c7', color: '#d97706' }}>
              <Award size={18} />
            </div>
          </div>
          <div className="metric-value">{t.avgScore || 0}%</div>
          <div className="metric-subtext">Pool-wide screening average</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Active Open Jobs</span>
            <div className="metric-icon-wrap" style={{ background: '#f3e8ff', color: '#7c3aed' }}>
              <Briefcase size={18} />
            </div>
          </div>
          <div className="metric-value">{t.jobs || 0}</div>
          <div className="metric-subtext">{t.allJobs || 0} total listings</div>
        </div>
      </div>

      {/* Recruitment Pipeline Funnel & Sourcing Channels Grid */}
      <div className="grid-2" style={{ marginBottom: '1.75rem' }}>
        {/* Pipeline Funnel Progression */}
        <div className="card">
          <div className="card-header" style={{ padding: '0 0 1rem 0' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem' }}>Recruitment Funnel Activity</h3>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Active volume of candidates at each workflow stage
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
            {[
              { label: 'Applied (Inbound)', count: appliedCount, color: '#64748b' },
              { label: 'Screening (Under Review)', count: screeningCount, color: '#f59e0b' },
              { label: 'Shortlisted (Qualified)', count: shortlistedCount, color: '#10b981' },
              { label: 'Interview Round', count: interviewCount, color: '#0284c7' },
              { label: 'Hired (Offer Closed)', count: hiredCount, color: '#0f172a' }
            ].map((step, idx) => {
              const pct = totalApps > 0 ? Math.round((step.count / totalApps) * 100) : 0;
              return (
                <div key={step.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem', fontSize: '0.8125rem' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{step.label}</span>
                    <span style={{ color: 'var(--text-muted)' }}>
                      <b>{step.count}</b> candidates ({pct}%)
                    </span>
                  </div>
                  <div style={{ height: 8, background: 'var(--bg-subtle)', borderRadius: 'var(--r-full)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.max(step.count > 0 ? 3 : 0, pct)}%`, background: step.color, borderRadius: 'var(--r-full)' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sourcing Channel Split & AI Screening Verdict */}
        <div className="card">
          <div className="card-header" style={{ padding: '0 0 1rem 0' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem' }}>AI Screening Verdict & Inbound Channels</h3>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Matcher classification breakdown and resume intake source
              </p>
            </div>
          </div>

          {/* Sourcing channels bar */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '1rem', marginBottom: '1.25rem' }}>
            <div style={{ padding: '0.75rem 1rem', background: '#f0fdf4', border: '1px solid #dcfce7', borderRadius: 'var(--r-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--brand-teal)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>
                <FileCheck size={14} /> Direct Portal Applications
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--brand-navy)', marginTop: '0.25rem' }}>
                {data.sources?.application || 0}
              </div>
            </div>

            <div style={{ padding: '0.75rem 1rem', background: '#eff6ff', border: '1px solid #dbeafe', borderRadius: 'var(--r-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--brand-blue)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>
                <UploadCloud size={14} /> Recruiter File Uploads
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--brand-navy)', marginTop: '0.25rem' }}>
                {data.sources?.recruiter_upload || 0}
              </div>
            </div>
          </div>

          {/* Verdict breakdown chips */}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'var(--bg-subtle)', borderRadius: 'var(--r-md)', fontSize: '0.8125rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: VERDICT_COLORS.shortlisted }} />
              Shortlisted: <b>{t.shortlisted || 0}</b>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: VERDICT_COLORS.review }} />
              Review: <b>{t.review || 0}</b>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: VERDICT_COLORS.rejected }} />
              Low Match: <b>{t.rejected || 0}</b>
            </span>
          </div>
        </div>
      </div>

      {/* Detailed Charts Grid */}
      <div className="grid-2" style={{ marginBottom: '1.75rem' }}>
        {/* Applicants by Job Listing */}
        <div className="card">
          <div className="card-header" style={{ padding: '0 0 1rem 0' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem' }}>Applicants by Job Listing</h3>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Candidate volume distribution across open positions
              </p>
            </div>
          </div>

          <div style={{ height: 260, marginTop: '1rem' }}>
            {data.byJob?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.byJob} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" fill="#0f172a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: 'var(--text-muted)' }}>
                No active jobs with applicants
              </div>
            )}
          </div>
        </div>

        {/* AI Screening Verdict Donut */}
        <div className="card">
          <div className="card-header" style={{ padding: '0 0 1rem 0' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem' }}>AI Screening Verdict Share</h3>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Matcher classification proportions
              </p>
            </div>
          </div>

          <div style={{ height: 260, marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {verdictData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={verdictData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={4}
                  >
                    {verdictData.map(entry => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p style={{ color: 'var(--text-muted)' }}>No candidate verdicts available yet</p>
            )}
          </div>
        </div>

        {/* Most Common Skills */}
        <div className="card">
          <div className="card-header" style={{ padding: '0 0 1rem 0' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem' }}>Top Candidate Skills</h3>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Most prevalent qualifications in your candidate pool
              </p>
            </div>
          </div>

          <div style={{ height: 260, marginTop: '1rem' }}>
            {data.skills?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.skills} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11, fill: '#334155' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" fill="#0d9488" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: 'var(--text-muted)' }}>
                No candidate skills recorded
              </div>
            )}
          </div>
        </div>

        {/* Missing Skills / Skill Gaps */}
        <div className="card">
          <div className="card-header" style={{ padding: '0 0 1rem 0' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem' }}>Top Missing Required Skills</h3>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Required skills most commonly absent from applicant resumes
              </p>
            </div>
          </div>

          <div style={{ height: 260, marginTop: '1rem' }}>
            {data.skillGaps?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.skillGaps} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11, fill: '#334155' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" fill="#ef4444" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: 'var(--text-muted)' }}>
                No skill gaps detected in current candidates
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top Ranked Candidates Section */}
      <div className="card card-flush" style={{ marginBottom: '2rem' }}>
        <div className="card-header">
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem' }}>Highest Ranked Applicants</h3>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Top scoring candidate profiles across active positions
            </p>
          </div>
          <Link to="/app/jobs" className="btn btn-ghost btn-sm" style={{ color: 'var(--brand-blue)' }}>
            View All Jobs <ArrowRight size={14} />
          </Link>
        </div>

        <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Candidate Name</th>
                <th>Applied Job</th>
                <th>Pipeline Stage</th>
                <th style={{ textAlign: 'right' }}>AI Match Score</th>
              </tr>
            </thead>
            <tbody>
              {(data.topCandidates || []).length ? (
                data.topCandidates.map(c => (
                  <tr key={c._id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--brand-navy)' }}>{c.name}</div>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {c.job || 'Position'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge stage-${c.stage}`}>
                        {c.stage}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span style={{ fontWeight: 700, fontFamily: 'var(--font-heading)', color: c.score >= 75 ? '#059669' : c.score >= 50 ? '#d97706' : '#dc2626' }}>
                        {c.score}%
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                    No candidates scored yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Admin Specific Organization Section */}
      {isAdmin && data.org && (
        <div className="card" style={{ marginTop: '2rem' }}>
          <div className="card-header" style={{ padding: '0 0 1.25rem 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldCheck size={20} style={{ color: 'var(--brand-navy)' }} />
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Recruiter Team Performance Leaderboard</h3>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  Organisation-wide hiring activity and metrics broken down by recruiter
                </p>
              </div>
            </div>
            <Link to="/app/admin/users" className="btn btn-secondary btn-sm">
              Manage User Accounts <ArrowRight size={14} />
            </Link>
          </div>

          {/* User breakdown summary */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', margin: '1rem 0 1.5rem', padding: '0.875rem 1rem', background: 'var(--bg-subtle)', borderRadius: 'var(--r-md)' }}>
            <span style={{ fontSize: '0.85rem' }}>
              <b>{data.org.users.recruiter || 0}</b> Recruiters
            </span>
            <span style={{ color: 'var(--border-strong)' }}>|</span>
            <span style={{ fontSize: '0.85rem' }}>
              <b>{data.org.users.candidate || 0}</b> Candidates
            </span>
            <span style={{ color: 'var(--border-strong)' }}>|</span>
            <span style={{ fontSize: '0.85rem' }}>
              <b>{data.org.users.admin || 0}</b> Admins
            </span>
            {data.org.users.inactive > 0 && (
              <>
                <span style={{ color: 'var(--border-strong)' }}>|</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--danger-text)' }}>
                  <b>{data.org.users.inactive}</b> Deactivated
                </span>
              </>
            )}
          </div>

          {/* Recruiter Leaderboard Table */}
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Recruiter</th>
                  <th>Jobs Owned</th>
                  <th>Applicants Handled</th>
                  <th>Hires Closed</th>
                  <th style={{ textAlign: 'right' }}>Avg Match Score</th>
                </tr>
              </thead>
              <tbody>
                {data.org.recruiters?.map(r => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{r.name}</div>
                      <small style={{ color: 'var(--text-muted)' }}>{r.email}</small>
                    </td>
                    <td><b>{r.jobs || 0}</b></td>
                    <td>{r.applicants || 0}</td>
                    <td>
                      <span className="badge stage-hired">{r.hired || 0}</span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>
                      {r.avgScore || 0}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
