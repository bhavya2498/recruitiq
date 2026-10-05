import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  Briefcase,
  User,
  Building2,
  Mail,
  Lock,
  ArrowRight,
  AlertCircle,
  Clock,
  Sparkles
} from 'lucide-react';
import api, { errMsg, setSession, homeFor } from '../api.js';

export default function Auth({ mode }) {
  const isRegister = mode === 'register';
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    company: '',
    email: '',
    password: '',
    role: 'candidate'
  });

  const [showPassword, setShowPassword] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const handleChange = field => e => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setBusy(true);
    setErr('');

    try {
      const payload = isRegister
        ? {
            name: form.name.trim(),
            email: form.email.trim(),
            password: form.password,
            role: form.role,
            company: form.role === 'recruiter' && form.company.trim() ? form.company.trim() : undefined
          }
        : {
            email: form.email.trim(),
            password: form.password
          };

      const { data } = await api.post('/auth/' + mode, payload);
      setSession(data);
      navigate(homeFor(data.user.role));
    } catch (x) {
      setErr(errMsg(x));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-canvas)',
        display: 'grid',
        placeItems: 'center',
        padding: '2rem 1rem'
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '440px',
          background: '#ffffff',
          borderRadius: 'var(--r-xl)',
          padding: '2.25rem 2rem',
          boxShadow: 'var(--shadow-xl)',
          border: '1px solid var(--border-subtle)'
        }}
      >
        {/* Brand header */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <Link
            to="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontFamily: 'var(--font-heading)',
              fontSize: '1.5rem',
              fontWeight: 800,
              color: 'var(--brand-navy)',
              marginBottom: '0.75rem'
            }}
          >
            Recruit<span style={{ color: 'var(--brand-teal)' }}>IQ</span>
            <span className="brand-badge">AI</span>
          </Link>
          <h2 style={{ fontSize: '1.45rem', margin: '0 0 0.35rem 0' }}>
            {isRegister ? 'Create your workspace' : 'Welcome back'}
          </h2>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            {isRegister
              ? 'Join RecruitIQ for AI-screened recruitment & job tracking.'
              : 'Sign in to access your recruitment pipeline and profile.'}
          </p>
        </div>

        {err && (
          <div className="alert-box alert-danger" style={{ marginBottom: '1.25rem' }}>
            <AlertCircle size={16} />
            <span>{err}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <>
              {/* Role Toggle */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label className="form-label" style={{ marginBottom: '0.4rem', display: 'block' }}>
                  I want to:
                </label>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.5rem'
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, role: 'candidate' })}
                    style={{
                      padding: '0.65rem 0.5rem',
                      border: form.role === 'candidate' ? '2px solid var(--brand-teal)' : '1px solid var(--border-strong)',
                      background: form.role === 'candidate' ? 'var(--brand-teal-light)' : '#ffffff',
                      color: form.role === 'candidate' ? 'var(--brand-teal-dark)' : 'var(--text-secondary)',
                      borderRadius: 'var(--r-md)',
                      fontWeight: 600,
                      fontSize: '0.8125rem',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.25rem',
                      cursor: 'pointer'
                    }}
                  >
                    <User size={16} />
                    Apply for Jobs
                  </button>

                  <button
                    type="button"
                    onClick={() => setForm({ ...form, role: 'recruiter' })}
                    style={{
                      padding: '0.65rem 0.5rem',
                      border: form.role === 'recruiter' ? '2px solid var(--brand-blue)' : '1px solid var(--border-strong)',
                      background: form.role === 'recruiter' ? 'var(--brand-blue-light)' : '#ffffff',
                      color: form.role === 'recruiter' ? 'var(--brand-blue)' : 'var(--text-secondary)',
                      borderRadius: 'var(--r-md)',
                      fontWeight: 600,
                      fontSize: '0.8125rem',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.25rem',
                      cursor: 'pointer'
                    }}
                  >
                    <Briefcase size={16} />
                    Hire Candidates
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input
                  className="form-input"
                  type="text"
                  required
                  minLength={2}
                  maxLength={80}
                  placeholder="e.g. Alex Morgan"
                  value={form.name}
                  onChange={handleChange('name')}
                />
              </div>

              {form.role === 'recruiter' && (
                <div className="form-group">
                  <label className="form-label">Company / Organization</label>
                  <input
                    className="form-input"
                    type="text"
                    maxLength={120}
                    placeholder="e.g. Acme Technologies"
                    value={form.company}
                    onChange={handleChange('company')}
                  />
                </div>
              )}
            </>
          )}

          <div className="form-group">
            <label className="form-label">
              {form.role === 'recruiter' ? 'Work Email *' : 'Email Address *'}
            </label>
            <input
              className="form-input"
              type="email"
              required
              placeholder="you@company.com"
              value={form.email}
              onChange={handleChange('email')}
            />
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="form-label">Password *</label>
              {isRegister && (
                <small style={{ color: 'var(--text-muted)' }}>Min. 8 characters</small>
              )}
            </div>
            <div style={{ position: 'relative' }}>
              <input
                className="form-input"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={isRegister ? 8 : 1}
                maxLength={128}
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange('password')}
                style={{ paddingRight: '2.5rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '0.65rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '0.2rem'
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {isRegister && (
              <small style={{ color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                Must contain at least one letter and one number.
              </small>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-teal"
            style={{ width: '100%', marginTop: '0.75rem', justifyContent: 'center' }}
            disabled={busy}
          >
            {busy ? (
              <>
                <Clock size={16} className="animate-spin" /> Please wait...
              </>
            ) : isRegister ? (
              <>
                Create Workspace Account <ArrowRight size={15} />
              </>
            ) : (
              'Sign In to Dashboard'
            )}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-light)', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          {isRegister ? (
            <span>
              Already have an account?{' '}
              <Link to="/login" style={{ color: 'var(--brand-teal)', fontWeight: 600 }}>
                Sign in here
              </Link>
            </span>
          ) : (
            <span>
              New to RecruitIQ?{' '}
              <Link to="/register" style={{ color: 'var(--brand-teal)', fontWeight: 600 }}>
                Create free account
              </Link>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
