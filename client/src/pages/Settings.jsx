import React, { useState } from 'react';
import {
  User,
  ShieldCheck,
  KeyRound,
  Building2,
  Mail,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles
} from 'lucide-react';
import api, { errMsg, getUser } from '../api.js';

export default function Settings() {
  const me = getUser();

  const [profileForm, setProfileForm] = useState({
    name: me?.name || '',
    company: me?.company || ''
  });
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });
  const [savingProfile, setSavingProfile] = useState(false);

  const [pwdForm, setPwdForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [pwdMsg, setPwdMsg] = useState({ type: '', text: '' });
  const [savingPwd, setSavingPwd] = useState(false);

  const handleUpdateProfile = async e => {
    e.preventDefault();
    setProfileMsg({ type: '', text: '' });
    setSavingProfile(true);

    try {
      const { data } = await api.patch('/auth/me', {
        name: profileForm.name.trim(),
        company: profileForm.company.trim() || undefined
      });
      const updatedUser = { ...me, ...data.user };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setProfileMsg({ type: 'success', text: 'Account profile details updated successfully.' });
    } catch (x) {
      setProfileMsg({ type: 'error', text: errMsg(x) });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async e => {
    e.preventDefault();
    setPwdMsg({ type: '', text: '' });

    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      setPwdMsg({ type: 'error', text: 'New password and confirmation do not match.' });
      return;
    }

    setSavingPwd(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword: pwdForm.currentPassword,
        newPassword: pwdForm.newPassword
      });
      setPwdMsg({
        type: 'success',
        text: 'Password changed successfully! All other active sessions have been safely invalidated.'
      });
      setPwdForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (x) {
      setPwdMsg({ type: 'error', text: errMsg(x) });
    } finally {
      setSavingPwd(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ marginBottom: '0.25rem' }}>Account & Security Settings</h1>
        <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
          Manage your personal profile details, organization information, and security credentials.
        </p>
      </div>

      <div className="grid-2" style={{ alignItems: 'start', gap: '2rem' }}>
        {/* Left: Profile Details */}
        <div className="card">
          <div className="card-header" style={{ padding: '0 0 1.25rem 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <User size={18} style={{ color: 'var(--brand-teal)' }} />
              <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Personal & Company Details</h3>
            </div>
          </div>

          {profileMsg.text && (
            <div className={`alert-box alert-${profileMsg.type === 'error' ? 'danger' : 'success'}`} style={{ marginTop: '1rem' }}>
              {profileMsg.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
              <span>{profileMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleUpdateProfile} style={{ marginTop: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input
                className="form-input"
                type="text"
                required
                minLength={2}
                maxLength={80}
                value={profileForm.name}
                onChange={e => setProfileForm({ ...profileForm, name: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                className="form-input"
                type="email"
                value={me?.email || ''}
                disabled
              />
              <small style={{ color: 'var(--text-muted)' }}>
                Email is tied to your account login and RBAC role.
              </small>
            </div>

            <div className="form-group">
              <label className="form-label">Organization / Company</label>
              <input
                className="form-input"
                type="text"
                maxLength={120}
                value={profileForm.company}
                onChange={e => setProfileForm({ ...profileForm, company: e.target.value })}
                placeholder="e.g. RecruitIQ Technologies"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Role Classification</label>
              <div>
                <span className="badge stage-hired" style={{ textTransform: 'capitalize', fontSize: '0.8125rem' }}>
                  {me?.role === 'admin' ? 'Admin / HR' : me?.role || 'Member'}
                </span>
              </div>
            </div>

            <button type="submit" className="btn btn-teal" disabled={savingProfile} style={{ marginTop: '0.5rem' }}>
              {savingProfile ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>

        {/* Right: Security & Password */}
        <div className="card">
          <div className="card-header" style={{ padding: '0 0 1.25rem 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <KeyRound size={18} style={{ color: 'var(--brand-blue)' }} />
              <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Security & Credentials</h3>
            </div>
          </div>

          {pwdMsg.text && (
            <div className={`alert-box alert-${pwdMsg.type === 'error' ? 'danger' : 'success'}`} style={{ marginTop: '1rem' }}>
              {pwdMsg.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
              <span>{pwdMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} style={{ marginTop: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label">Current Password *</label>
              <input
                className="form-input"
                type="password"
                required
                value={pwdForm.currentPassword}
                onChange={e => setPwdForm({ ...pwdForm, currentPassword: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">New Password *</label>
              <input
                className="form-input"
                type="password"
                required
                minLength={8}
                value={pwdForm.newPassword}
                onChange={e => setPwdForm({ ...pwdForm, newPassword: e.target.value })}
              />
              <small style={{ color: 'var(--text-muted)' }}>
                Minimum 8 characters with at least one letter and one number.
              </small>
            </div>

            <div className="form-group">
              <label className="form-label">Confirm New Password *</label>
              <input
                className="form-input"
                type="password"
                required
                minLength={8}
                value={pwdForm.confirmPassword}
                onChange={e => setPwdForm({ ...pwdForm, confirmPassword: e.target.value })}
              />
            </div>

            <button type="submit" className="btn btn-secondary" disabled={savingPwd} style={{ marginTop: '0.5rem' }}>
              {savingPwd ? 'Updating Password...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
