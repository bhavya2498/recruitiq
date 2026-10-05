import React from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  FileText,
  Users,
  ShieldCheck,
  TrendingUp,
  BrainCircuit,
  Search,
  Check,
  Award,
  Layers,
  Clock,
  Briefcase
} from 'lucide-react';
import ScoreGauge from '../components/ScoreGauge.jsx';

const BREAKDOWN_ROWS = [
  { label: 'Skills match', val: 45, max: 45, color: '#10b981' },
  { label: 'Experience level', val: 26, max: 30, color: '#3b82f6' },
  { label: 'Education degree', val: 10, max: 10, color: '#8b5cf6' },
  { label: 'Project portfolio', val: 8, max: 10, color: '#f59e0b' },
  { label: 'JD keywords & context', val: 5, max: 5, color: '#0d9488' }
];

const FEATURES = [
  {
    icon: <BrainCircuit size={22} style={{ color: '#0d9488' }} />,
    title: 'Explainable AI Scoring',
    desc: 'Every candidate score (0–100) is broken down by skills, experience, education, projects, and keywords. No black box decisions.'
  },
  {
    icon: <FileText size={22} style={{ color: '#2563eb' }} />,
    title: 'Smart Resume Parser',
    desc: 'Extracts skills, work tenure, highest degree, and contact information automatically from any PDF or Word DOCX document.'
  },
  {
    icon: <Layers size={22} style={{ color: '#7c3aed' }} />,
    title: 'Automated Talent Pipeline',
    desc: 'Move candidates through Applied → Screening → Shortlisted → Interview → Hired with built-in transition validation and audit trails.'
  },
  {
    icon: <ShieldCheck size={22} style={{ color: '#059669' }} />,
    title: 'Enterprise RBAC & Security',
    desc: 'Candidate, Recruiter, and Admin boundaries strictly enforced on the server. Recruiter data never leaks to applicants.'
  },
  {
    icon: <TrendingUp size={22} style={{ color: '#ea580c' }} />,
    title: 'Hiring Funnel Analytics',
    desc: 'Track applicant flow across departments, detect most common skill gaps, and optimize recruiter velocity with interactive charts.'
  },
  {
    icon: <Users size={22} style={{ color: '#0f172a' }} />,
    title: 'Private Team Collaboration',
    desc: 'Add confidential interviewer notes, track stage change history with timestamps, and re-screen applicants on requirement changes.'
  }
];

export default function Landing() {
  return (
    <div className="landing-wrap">
      {/* Light Navbar */}
      <header className="landing-nav">
        <div className="brand-logo">
          Recruit<span style={{ color: 'var(--brand-teal)' }}>IQ</span>
          <span className="brand-badge">AI 2.0</span>
        </div>

        <nav style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <a href="#how" style={{ fontSize: '0.9125rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
            How It Works
          </a>
          <a href="#roles" style={{ fontSize: '0.9125rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
            Role Workspaces
          </a>
          <a href="#features" style={{ fontSize: '0.9125rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
            Features
          </a>
          <Link to="/login" style={{ fontSize: '0.9125rem', color: 'var(--text-primary)', fontWeight: 600 }}>
            Sign In
          </Link>
          <Link to="/register" className="btn btn-teal btn-sm">
            Start Free Trial <ArrowRight size={14} />
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="landing-hero">
        <div className="hero-copy">
          <div className="hero-pill">
            <Sparkles size={14} /> Explainable AI Talent Intelligence
          </div>

          <h1 className="hero-heading">
            Screen 200 resumes <span>before your coffee gets cold.</span>
          </h1>

          <p className="hero-subtitle">
            RecruitIQ extracts skills, computes transparent match scores, and server-side ranks your applicants in seconds. Designed for candidates, recruiters, and HR leaders.
          </p>

          <div className="hero-cta">
            <Link to="/register" className="btn btn-teal btn-lg">
              Create Free Workspace <ArrowRight size={16} />
            </Link>
            <Link to="/login" className="btn btn-secondary btn-lg">
              Sign In to Account
            </Link>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginTop: '2.5rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Check size={16} style={{ color: 'var(--brand-teal)' }} /> 3 Built-in Roles
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Check size={16} style={{ color: 'var(--brand-teal)' }} /> PDF & DOCX Bulk Upload
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Check size={16} style={{ color: 'var(--brand-teal)' }} /> 100% Explainable Scoring
            </span>
          </div>
        </div>

        {/* Live Interactive Scorecard Preview Card */}
        <div className="hero-demo-card">
          <div className="demo-header">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <strong style={{ fontSize: '1.1rem', color: 'var(--brand-navy)' }}>Sarah Chen</strong>
                <span className="badge stage-shortlisted">Rank #1</span>
              </div>
              <small style={{ color: 'var(--text-muted)' }}>Lead Full Stack Developer candidate</small>
            </div>
            <ScoreGauge score={94} size={70} showLabel={false} />
          </div>

          {/* Breakdown bars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', marginBottom: '1.25rem' }}>
            {BREAKDOWN_ROWS.map(r => (
              <div key={r.label} style={{ fontSize: '0.8125rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{r.label}</span>
                  <span style={{ fontWeight: 600 }}>{r.val}/{r.max}</span>
                </div>
                <div style={{ height: 6, background: 'var(--bg-subtle)', borderRadius: 'var(--r-full)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(r.val / r.max) * 100}%`, background: r.color, borderRadius: 'var(--r-full)' }} />
                </div>
              </div>
            ))}
          </div>

          {/* Chips */}
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', paddingTop: '1rem', borderTop: '1px solid var(--border-light)' }}>
            <span className="chip chip-matched">React (Found)</span>
            <span className="chip chip-matched">Node.js (Found)</span>
            <span className="chip chip-matched">TypeScript (Found)</span>
            <span className="chip chip-missing">Docker (Missing)</span>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how" style={{ padding: '5rem 2rem', background: 'var(--bg-canvas)', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 3.5rem' }}>
            <span className="badge stage-interview" style={{ marginBottom: '0.5rem' }}>
              Simple 3-Step Workflow
            </span>
            <h2 style={{ fontSize: '2.25rem', marginBottom: '0.75rem' }}>
              From a pile of PDFs to a ranked shortlist
            </h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              Say goodbye to hours of manual resume skimming. RecruitIQ automates extraction, scoring, and pipeline progression.
            </p>
          </div>

          <div className="grid-3">
            <div className="card" style={{ background: '#ffffff' }}>
              <div style={{ width: 44, height: 44, borderRadius: 'var(--r-md)', background: '#eff6ff', color: 'var(--brand-blue)', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: '1.1rem', marginBottom: '1.25rem' }}>
                1
              </div>
              <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>Post Job Requirements</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                Paste the job description and specify key required skills, years of experience, and minimum education level.
              </p>
            </div>

            <div className="card" style={{ background: '#ffffff' }}>
              <div style={{ width: 44, height: 44, borderRadius: 'var(--r-md)', background: '#ecfdf5', color: 'var(--brand-teal)', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: '1.1rem', marginBottom: '1.25rem' }}>
                2
              </div>
              <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>Drop In Resumes</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                Upload up to 20 PDF or DOCX files at once, or accept direct online applications from candidates on your portal.
              </p>
            </div>

            <div className="card" style={{ background: '#ffffff' }}>
              <div style={{ width: 44, height: 44, borderRadius: 'var(--r-md)', background: '#fdf2f8', color: '#db2777', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: '1.1rem', marginBottom: '1.25rem' }}>
                3
              </div>
              <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>Review Ranked Candidates</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                Instantly review candidates ranked by score with plain-language explanations, add private notes, and advance candidates.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Role Workspaces Section */}
      <section id="roles" style={{ padding: '5rem 2rem', background: '#ffffff' }}>
        <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 3.5rem' }}>
            <span className="badge stage-hired" style={{ marginBottom: '0.5rem' }}>
              Built For Every Stakeholder
            </span>
            <h2 style={{ fontSize: '2.25rem', marginBottom: '0.75rem' }}>
              Tailored workspaces for the whole team
            </h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              Strict role-based boundaries ensure each persona gets the exact data and workflows they need.
            </p>
          </div>

          <div className="grid-3">
            {/* Candidate Card */}
            <div className="card" style={{ border: '1px solid #bfdbfe', background: '#f8fafc' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <div style={{ width: 36, height: 36, borderRadius: 'var(--r-md)', background: '#eff6ff', color: '#2563eb', display: 'grid', placeItems: 'center' }}>
                  <Users size={18} />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Candidate Portal</h3>
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                Empowering applicants with full visibility into their own journey.
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Check size={15} style={{ color: '#2563eb' }} /> Profile & Master Resume Parsing
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Check size={15} style={{ color: '#2563eb' }} /> 1-Click Application Submission
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Check size={15} style={{ color: '#2563eb' }} /> Live Pipeline Stage & Timeline
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Check size={15} style={{ color: '#2563eb' }} /> Zero Private Recruiter Data Leaks
                </li>
              </ul>
            </div>

            {/* Recruiter Card */}
            <div className="card" style={{ border: '1px solid #a7f3d0', background: '#f8fafc' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <div style={{ width: 36, height: 36, borderRadius: 'var(--r-md)', background: '#ecfdf5', color: '#059669', display: 'grid', placeItems: 'center' }}>
                  <Briefcase size={18} />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Recruiter Workspace</h3>
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                High-volume resume screening with explainable AI verdicts.
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Check size={15} style={{ color: '#059669' }} /> Job CRUD & Requirement Tuning
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Check size={15} style={{ color: '#059669' }} /> Bulk Resume Screen (20 at a time)
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Check size={15} style={{ color: '#059669' }} /> Matched & Missing Skills Detection
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Check size={15} style={{ color: '#059669' }} /> Pipeline Stepper & Private Notes
                </li>
              </ul>
            </div>

            {/* Admin / HR Card */}
            <div className="card" style={{ border: '1px solid #e2e8f0', background: '#f8fafc' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <div style={{ width: 36, height: 36, borderRadius: 'var(--r-md)', background: '#f1f5f9', color: '#0f172a', display: 'grid', placeItems: 'center' }}>
                  <ShieldCheck size={18} />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Admin / HR Suite</h3>
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                Organization oversight, team management, and audit logs.
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Check size={15} style={{ color: '#0f172a' }} /> Org-wide Metrics & Sourcing Stats
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Check size={15} style={{ color: '#0f172a' }} /> Recruiter Performance Leaderboard
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Check size={15} style={{ color: '#0f172a' }} /> User Role Management & Password Resets
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Check size={15} style={{ color: '#0f172a' }} /> Tamper-Evident Audit Logging
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section id="features" style={{ padding: '5rem 2rem', background: 'var(--bg-canvas)', borderTop: '1px solid var(--border-subtle)' }}>
        <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 3.5rem' }}>
            <h2 style={{ fontSize: '2.25rem', marginBottom: '0.75rem' }}>
              Engineered for precision recruitment
            </h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              Built from the ground up with modern security, explainable scoring algorithms, and production-grade RBAC.
            </p>
          </div>

          <div className="grid-3">
            {FEATURES.map(f => (
              <div key={f.title} className="card" style={{ background: '#ffffff' }}>
                <div style={{ marginBottom: '1rem' }}>{f.icon}</div>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.4rem' }}>{f.title}</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Banner */}
      <section style={{ padding: '5rem 2rem', background: '#ffffff', textAlign: 'center', borderTop: '1px solid var(--border-subtle)' }}>
        <div style={{ maxWidth: '680px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '2.4rem', marginBottom: '1rem', color: 'var(--brand-navy)' }}>
            Give your recruiters their afternoon back.
          </h2>
          <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', marginBottom: '2rem', lineHeight: 1.6 }}>
            Set up your workspace in 30 seconds and experience transparent, AI-powered recruitment today.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
            <Link to="/register" className="btn btn-teal btn-lg">
              Create Free Workspace <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '2rem', borderTop: '1px solid var(--border-light)', background: '#ffffff', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        RecruitIQ &copy; {new Date().getFullYear()}. Production Recruitment Intelligence & Resume Screening Platform.
      </footer>
    </div>
  );
}
