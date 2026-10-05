import React, { useEffect, useState } from 'react';
import {
  Users,
  UserPlus,
  Search,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  KeyRound,
  MoreVertical,
  Clock,
  AlertCircle,
  Building2,
  Mail,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import api, { errMsg, getUser } from '../api.js';
import { fmt } from '../stages.js';
import Modal from '../components/Modal.jsx';

const blankForm = {
  name: '',
  email: '',
  password: '',
  role: 'recruiter',
  company: ''
};

export default function AdminUsers() {
  const me = getUser();

  const [data, setData] = useState(null);
  const [roleFilter, setRoleFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addForm, setAddForm] = useState(blankForm);
  const [addErr, setAddErr] = useState('');
  const [adding, setAdding] = useState(false);

  const [resetUser, setResetUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetErr, setResetErr] = useState('');
  const [resetting, setResetting] = useState(false);

  // Feedback notifications
  const [msg, setMsg] = useState({ type: '', text: '' });

  const loadUsers = () => {
    api.get('/admin/users', {
      params: {
        ...(roleFilter && { role: roleFilter }),
        ...(activeFilter && { active: activeFilter }),
        ...(searchQuery && { q: searchQuery }),
        page
      }
    })
      .then(r => setData(r.data))
      .catch(x => setMsg({ type: 'error', text: errMsg(x) }));
  };

  useEffect(() => {
    loadUsers();
  }, [roleFilter, activeFilter, page]);

  const handleSearch = e => {
    e.preventDefault();
    setPage(1);
    loadUsers();
  };

  const handleCreateUser = async e => {
    e.preventDefault();
    setAddErr('');
    setAdding(true);
    setMsg({ type: '', text: '' });

    try {
      await api.post('/admin/users', {
        ...addForm,
        company: addForm.company?.trim() || undefined
      });
      setIsAddOpen(false);
      setAddForm(blankForm);
      setMsg({ type: 'success', text: `User account created for ${addForm.name} (${addForm.role}).` });
      loadUsers();
    } catch (x) {
      setAddErr(errMsg(x));
    } finally {
      setAdding(false);
    }
  };

  const handlePatchUser = async (u, updates) => {
    setMsg({ type: '', text: '' });
    try {
      await api.patch('/admin/users/' + u.id, updates);
      setMsg({ type: 'success', text: `User ${u.name} updated.` });
      loadUsers();
    } catch (x) {
      setMsg({ type: 'error', text: errMsg(x) });
    }
  };

  const handleResetPassword = async e => {
    e.preventDefault();
    if (!resetUser || !newPassword.trim()) return;
    setResetErr('');
    setResetting(true);

    try {
      await api.post(`/admin/users/${resetUser.id}/reset-password`, { password: newPassword });
      setMsg({
        type: 'success',
        text: `Password reset for ${resetUser.email}. All their active sessions have been invalidated.`
      });
      setResetUser(null);
      setNewPassword('');
    } catch (x) {
      setResetErr(errMsg(x));
    } finally {
      setResetting(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex-between" style={{ marginBottom: '1.75rem', flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <h1 style={{ margin: 0 }}>User Management & Recruiter Roster</h1>
            <span className="badge stage-hired">Admin Scope</span>
          </div>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
            Manage organization members, assign roles, reset credentials, and review user status.
          </p>
        </div>

        <button type="button" className="btn btn-teal" onClick={() => setIsAddOpen(true)}>
          <UserPlus size={16} /> Add Member
        </button>
      </div>

      {/* Notifications */}
      {msg.text && (
        <div className={`alert-box alert-${msg.type === 'error' ? 'danger' : 'success'}`}>
          {msg.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Filter & Search Bar */}
      <form onSubmit={handleSearch} className="filter-bar">
        <div className="search-bar" style={{ maxWidth: '320px' }}>
          <Search size={16} style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search name, email, or company..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <select
          className="form-select"
          style={{ width: 'auto', fontSize: '0.875rem' }}
          value={roleFilter}
          onChange={e => {
            setPage(1);
            setRoleFilter(e.target.value);
          }}
        >
          <option value="">All Roles</option>
          <option value="recruiter">Recruiters</option>
          <option value="candidate">Candidates</option>
          <option value="admin">Administrators</option>
        </select>

        <select
          className="form-select"
          style={{ width: 'auto', fontSize: '0.875rem' }}
          value={activeFilter}
          onChange={e => {
            setPage(1);
            setActiveFilter(e.target.value);
          }}
        >
          <option value="">All Account Statuses</option>
          <option value="true">Active Only</option>
          <option value="false">Deactivated Only</option>
        </select>

        <button type="submit" className="btn btn-secondary">
          Filter
        </button>

        {(searchQuery || roleFilter || activeFilter) && (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              setSearchQuery('');
              setRoleFilter('');
              setActiveFilter('');
              setPage(1);
            }}
          >
            Clear
          </button>
        )}
      </form>

      {/* Users Table */}
      {!data ? (
        <div style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Clock className="animate-spin" size={24} style={{ margin: '0 auto 0.5rem' }} />
          <p>Loading members...</p>
        </div>
      ) : !data.items.length ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <Users size={28} />
          </div>
          <h3>No users match your filters</h3>
          <p style={{ maxWidth: '400px', margin: '0.5rem auto 1.5rem' }}>
            Adjust your search query or filters to view organization accounts.
          </p>
        </div>
      ) : (
        <>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>User Profile</th>
                  <th>Assigned Role</th>
                  <th>Platform Activity</th>
                  <th>Last Sign In</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map(u => {
                  const isSelf = u.id === me?.id;
                  return (
                    <tr key={u.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--brand-navy)' }}>
                          {u.name} {isSelf && <span className="badge stage-applied" style={{ fontSize: '0.65rem' }}>You</span>}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                          <span>{u.email}</span>
                          {u.company && <span>· {u.company}</span>}
                        </div>
                      </td>
                      <td>
                        <select
                          className="form-select"
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.8125rem', width: 'auto', background: '#f8fafc' }}
                          value={u.role}
                          disabled={isSelf}
                          onChange={e => handlePatchUser(u, { role: e.target.value })}
                        >
                          <option value="candidate">Candidate</option>
                          <option value="recruiter">Recruiter</option>
                          <option value="admin">Admin / HR</option>
                        </select>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.85rem' }}>
                          {u.role === 'candidate'
                            ? `${u.applications || 0} application(s)`
                            : `${u.jobs || 0} job(s), ${u.applications || 0} candidates`}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                          {u.lastLoginAt ? fmt(u.lastLoginAt) : 'Never signed in'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span className={`badge ${u.isActive ? 'status-active' : 'status-deactivated'}`}>
                            {u.isActive ? 'Active' : 'Deactivated'}
                          </span>
                          {u.locked && (
                            <span className="badge stage-rejected" style={{ fontSize: '0.7rem' }}>
                              Locked (5 fails)
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                          <button
                            type="button"
                            className={`btn btn-sm ${u.isActive ? 'btn-ghost' : 'btn-secondary'}`}
                            disabled={isSelf}
                            title={isSelf ? 'Cannot deactivate self' : u.isActive ? 'Deactivate user' : 'Activate user'}
                            onClick={() => handlePatchUser(u, { isActive: !u.isActive })}
                          >
                            {u.isActive ? 'Deactivate' : 'Activate'}
                          </button>

                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            title="Reset Password"
                            onClick={() => {
                              setResetUser(u);
                              setNewPassword('');
                              setResetErr('');
                            }}
                          >
                            <KeyRound size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
                Page {page} of {data.pages} ({data.total} total members)
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

      {/* Add User Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add New Organization Member"
        subtitle="Create an internal account for a recruiter, candidate, or administrator."
        maxWidth={540}
      >
        <form onSubmit={handleCreateUser}>
          {addErr && (
            <div className="alert-box alert-danger">
              <AlertCircle size={16} />
              <span>{addErr}</span>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input
              className="form-input"
              type="text"
              required
              minLength={2}
              maxLength={80}
              placeholder="e.g. Jordan Smith"
              value={addForm.name}
              onChange={e => setAddForm({ ...addForm, name: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Work Email *</label>
            <input
              className="form-input"
              type="email"
              required
              placeholder="jordan@company.com"
              value={addForm.email}
              onChange={e => setAddForm({ ...addForm, email: e.target.value })}
            />
          </div>

          <div className="grid-2" style={{ gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Temporary Password *</label>
              <input
                className="form-input"
                type="password"
                required
                minLength={8}
                placeholder="Min 8 chars (letter + number)"
                value={addForm.password}
                onChange={e => setAddForm({ ...addForm, password: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Account Role *</label>
              <select
                className="form-select"
                value={addForm.role}
                onChange={e => setAddForm({ ...addForm, role: e.target.value })}
              >
                <option value="recruiter">Recruiter</option>
                <option value="candidate">Candidate</option>
                <option value="admin">Admin / HR</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Company Name</label>
            <input
              className="form-input"
              type="text"
              maxLength={120}
              placeholder="e.g. Acme Corp"
              value={addForm.company}
              onChange={e => setAddForm({ ...addForm, company: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsAddOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-teal" disabled={adding}>
              {adding ? 'Creating User...' : 'Create Account'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        isOpen={!!resetUser}
        onClose={() => setResetUser(null)}
        title="Reset User Password"
        subtitle={`Set a new temporary password for ${resetUser?.name} (${resetUser?.email}).`}
        maxWidth={460}
      >
        <form onSubmit={handleResetPassword}>
          {resetErr && (
            <div className="alert-box alert-danger">
              <AlertCircle size={16} />
              <span>{resetErr}</span>
            </div>
          )}

          <div className="alert-box alert-info" style={{ marginBottom: '1.25rem' }}>
            <KeyRound size={16} />
            <span>
              Resetting this password will immediately invalidate all active sessions for this user across every browser.
            </span>
          </div>

          <div className="form-group">
            <label className="form-label">New Password *</label>
            <input
              className="form-input"
              type="password"
              required
              minLength={8}
              placeholder="At least 8 characters with letter and number"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setResetUser(null)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-teal" disabled={resetting || !newPassword.trim()}>
              {resetting ? 'Resetting...' : 'Save New Password'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
