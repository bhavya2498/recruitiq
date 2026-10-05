import React, { useEffect, useRef, useState } from 'react';
import {
  User,
  FileText,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Phone,
  MapPin,
  Briefcase,
  GraduationCap,
  FolderGit2
} from 'lucide-react';
import api, { errMsg } from '../api.js';
import { fmt } from '../stages.js';

export default function Profile() {
  const fileRef = useRef();
  const [data, setData] = useState(null);
  const [form, setForm] = useState({
    name: '',
    headline: '',
    phone: '',
    location: '',
    summary: ''
  });
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [busySave, setBusySave] = useState(false);
  const [busyUpload, setBusyUpload] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const applyData = d => {
    setData(d);
    setForm({
      name: d.name || '',
      headline: d.profile?.headline || '',
      phone: d.profile?.phone || '',
      location: d.profile?.location || '',
      summary: d.profile?.summary || ''
    });
  };

  useEffect(() => {
    api.get('/portal/profile')
      .then(r => applyData(r.data))
      .catch(x => setMsg({ type: 'error', text: errMsg(x) }));
  }, []);

  const handleChange = field => e => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleSave = async e => {
    e.preventDefault();
    setBusySave(true);
    setMsg({ type: '', text: '' });
    try {
      const { data: updated } = await api.put('/portal/profile', form);
      applyData(updated);
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({ ...u, name: updated.name }));
      setMsg({ type: 'success', text: 'Personal details and profile saved successfully.' });
    } catch (x) {
      setMsg({ type: 'error', text: errMsg(x) });
    } finally {
      setBusySave(false);
    }
  };

  const uploadResumeFile = async file => {
    if (!file) return;
    const fd = new FormData();
    fd.append('resume', file);
    setBusyUpload(true);
    setMsg({ type: '', text: '' });

    try {
      const { data: updated } = await api.post('/portal/profile/resume', fd);
      applyData(updated);
      setMsg({
        type: 'success',
        text: `Resume "${file.name}" uploaded and parsed successfully! Skills and experience have been refreshed.`
      });
    } catch (x) {
      setMsg({ type: 'error', text: errMsg(x) });
    } finally {
      setBusyUpload(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleFileChange = e => {
    const file = e.target.files?.[0];
    if (file) uploadResumeFile(file);
  };

  const handleDrop = e => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadResumeFile(file);
  };

  if (!data) {
    return (
      <div style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>
        <Clock className="animate-spin" size={24} style={{ margin: '0 auto 0.5rem' }} />
        <p>Loading candidate profile...</p>
      </div>
    );
  }

  const p = data.profile || {};
  const hasResume = data.hasResume;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ marginBottom: '0.25rem' }}>Profile & Resume</h1>
        <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
          Manage your personal information and upload your master resume for AI screening.
        </p>
      </div>

      {/* Notifications */}
      {msg.text && (
        <div className={`alert-box alert-${msg.type === 'error' ? 'danger' : 'success'}`}>
          {msg.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{msg.text}</span>
        </div>
      )}

      <div className="grid-2" style={{ alignItems: 'start', gap: '1.75rem' }}>
        {/* Left Column: Personal Details Form */}
        <div className="card">
          <div className="card-header" style={{ padding: '0 0 1.25rem 0' }}>
            <div>
              <h3 style={{ margin: 0 }}>Personal Information</h3>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Recruiters see this information alongside your screened resume
              </p>
            </div>
          </div>

          <form onSubmit={handleSave} style={{ marginTop: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input
                className="form-input"
                type="text"
                required
                minLength={2}
                maxLength={80}
                value={form.name}
                onChange={handleChange('name')}
                placeholder="e.g. Alex Morgan"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                className="form-input"
                type="email"
                value={data.email}
                disabled
              />
              <small style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Email address is tied to your account login and cannot be modified here.
              </small>
            </div>

            <div className="form-group">
              <label className="form-label">Professional Headline</label>
              <input
                className="form-input"
                type="text"
                maxLength={150}
                value={form.headline}
                onChange={handleChange('headline')}
                placeholder="e.g. Senior Full Stack Engineer (React, Node, Python)"
              />
            </div>

            <div className="grid-2" style={{ gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="form-input"
                    type="text"
                    maxLength={40}
                    value={form.phone}
                    onChange={handleChange('phone')}
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Location</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="form-input"
                    type="text"
                    maxLength={120}
                    value={form.location}
                    onChange={handleChange('location')}
                    placeholder="e.g. New York, NY (or Remote)"
                  />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Summary / Bio</label>
              <textarea
                className="form-textarea"
                rows={4}
                maxLength={2000}
                value={form.summary}
                onChange={handleChange('summary')}
                placeholder="Briefly describe your background, career focus, and major achievements..."
              />
            </div>

            <button type="submit" className="btn btn-teal" disabled={busySave}>
              {busySave ? 'Saving Profile...' : 'Save Profile Changes'}
            </button>
          </form>
        </div>

        {/* Right Column: Resume Upload & AI Parser Overview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Resume Upload Dropzone */}
          <div className="card">
            <div className="card-header" style={{ padding: '0 0 1.25rem 0' }}>
              <div>
                <h3 style={{ margin: 0 }}>Resume File</h3>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  PDF or DOCX format (Max 5MB). Text is parsed automatically.
                </p>
              </div>
            </div>

            <div style={{ marginTop: '1.25rem' }}>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.docx"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />

              <div
                onDragOver={e => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                style={{
                  border: `2px dashed ${dragOver ? 'var(--brand-teal)' : 'var(--border-strong)'}`,
                  background: dragOver ? 'var(--brand-teal-light)' : 'var(--bg-subtle)',
                  borderRadius: 'var(--r-lg)',
                  padding: '2rem 1.5rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  marginBottom: '1rem'
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 'var(--r-full)',
                    background: '#ffffff',
                    color: 'var(--brand-teal)',
                    display: 'grid',
                    placeItems: 'center',
                    margin: '0 auto 0.75rem',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  <UploadCloud size={24} />
                </div>
                <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.95rem' }}>
                  {busyUpload ? 'Extracting & Parsing Resume...' : 'Click to browse or drag & drop'}
                </h4>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0 }}>
                  Supports clean PDF and Word DOCX documents
                </p>
              </div>

              {hasResume ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.875rem 1rem',
                    background: '#f8fafc',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--r-md)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                    <FileText size={22} style={{ color: 'var(--brand-teal)', flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.resumeFileName}
                      </div>
                      <small style={{ color: 'var(--text-muted)' }}>
                        Last parsed: {fmt(p.resumeUpdatedAt)}
                      </small>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={busyUpload}
                    onClick={() => fileRef.current?.click()}
                  >
                    Replace
                  </button>
                </div>
              ) : (
                <div className="alert-box alert-warning" style={{ margin: 0 }}>
                  <AlertCircle size={16} />
                  <span>No resume attached. Upload one now to apply for open positions.</span>
                </div>
              )}
            </div>
          </div>

          {/* AI Parser Breakdown */}
          {hasResume && (
            <div className="card">
              <div className="card-header" style={{ padding: '0 0 1rem 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Sparkles size={16} style={{ color: 'var(--brand-teal)' }} />
                  <h3 style={{ margin: 0, fontSize: '1.05rem' }}>AI Parser Insights</h3>
                </div>
              </div>

              <div style={{ marginTop: '1.25rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  <div style={{ padding: '0.75rem', background: 'var(--bg-subtle)', borderRadius: 'var(--r-md)', textAlign: 'center' }}>
                    <Briefcase size={16} style={{ color: 'var(--text-muted)', margin: '0 auto 0.25rem' }} />
                    <div style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--brand-navy)' }}>
                      {p.yearsExperience ?? 0}
                    </div>
                    <small>Years Exp</small>
                  </div>

                  <div style={{ padding: '0.75rem', background: 'var(--bg-subtle)', borderRadius: 'var(--r-md)', textAlign: 'center' }}>
                    <GraduationCap size={16} style={{ color: 'var(--text-muted)', margin: '0 auto 0.25rem' }} />
                    <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--brand-navy)', textTransform: 'capitalize' }}>
                      {p.education || 'N/A'}
                    </div>
                    <small>Education</small>
                  </div>

                  <div style={{ padding: '0.75rem', background: 'var(--bg-subtle)', borderRadius: 'var(--r-md)', textAlign: 'center' }}>
                    <FolderGit2 size={16} style={{ color: 'var(--text-muted)', margin: '0 auto 0.25rem' }} />
                    <div style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--brand-navy)' }}>
                      {p.projectsCount ?? 0}
                    </div>
                    <small>Projects</small>
                  </div>
                </div>

                <div>
                  <h4 style={{ fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                    Extracted Skills ({p.skills?.length || 0})
                  </h4>
                  {p.skills?.length ? (
                    <div className="chips-container">
                      {p.skills.map(s => (
                        <span className="chip chip-matched" key={s}>
                          {s}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                      No recognized technical skills detected in the current resume text.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
