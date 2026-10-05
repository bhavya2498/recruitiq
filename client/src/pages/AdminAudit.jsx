import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Search,
  Filter,
  Clock,
  User,
  ChevronLeft,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import api, { errMsg } from '../api.js';
import { fmt } from '../stages.js';

const COMMON_ACTIONS = [
  'candidate.upload',
  'candidate.stage',
  'candidate.delete',
  'job.create',
  'job.update',
  'job.reassign',
  'job.delete',
  'admin.user.create',
  'admin.user.update',
  'admin.user.reset_password',
  'auth.register',
  'auth.lockout',
  'auth.password_change'
];

export default function AdminAudit() {
  const [data, setData] = useState(null);
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(1);
  const [err, setErr] = useState('');

  const loadAudit = () => {
    api.get('/admin/audit', {
      params: {
        ...(actionFilter && { action: actionFilter }),
        page
      }
    })
      .then(r => setData(r.data))
      .catch(x => setErr(errMsg(x)));
  };

  useEffect(() => {
    loadAudit();
  }, [actionFilter, page]);

  return (
    <div>
      {/* Header */}
      <div className="flex-between" style={{ marginBottom: '1.75rem', flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <h1 style={{ margin: 0 }}>System Audit & Security Logs</h1>
            <span className="badge stage-hired">Admin Scope</span>
          </div>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
            Tamper-evident audit trail of stage changes, account actions, and administrative operations.
          </p>
        </div>
      </div>

      {err && (
        <div className="alert-box alert-danger">
          <AlertCircle size={18} />
          <span>{err}</span>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="filter-bar">
        <select
          className="form-select"
          style={{ width: 'auto', minWidth: '240px', fontSize: '0.875rem' }}
          value={actionFilter}
          onChange={e => {
            setPage(1);
            setActionFilter(e.target.value);
          }}
        >
          <option value="">All Action Types</option>
          {COMMON_ACTIONS.map(a => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>

        {actionFilter && (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              setActionFilter('');
              setPage(1);
            }}
          >
            Clear Filter
          </button>
        )}
      </div>

      {/* Audit Log Table */}
      {!data ? (
        <div style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Clock className="animate-spin" size={24} style={{ margin: '0 auto 0.5rem' }} />
          <p>Loading security audit entries...</p>
        </div>
      ) : !data.items.length ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <ShieldCheck size={28} />
          </div>
          <h3>No audit records found</h3>
          <p style={{ maxWidth: '400px', margin: '0.5rem auto 1.5rem' }}>
            There are no recorded system actions matching your current filter.
          </p>
        </div>
      ) : (
        <>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '180px' }}>Timestamp</th>
                  <th>Actor</th>
                  <th>Action Type</th>
                  <th>Target & Metadata</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map(a => {
                  let actionClass = 'stage-applied';
                  if (a.action.includes('delete') || a.action.includes('lockout')) actionClass = 'stage-rejected';
                  else if (a.action.includes('create') || a.action.includes('register')) actionClass = 'status-open';
                  else if (a.action.includes('stage') || a.action.includes('reassign')) actionClass = 'stage-screening';

                  return (
                    <tr key={a._id}>
                      <td>
                        <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                          {fmt(a.createdAt)}
                        </span>
                      </td>

                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--brand-navy)' }}>
                          {a.actor?.name || 'System Auto'}
                        </div>
                        <small style={{ color: 'var(--text-muted)' }}>
                          {a.actorRole || 'system'}
                        </small>
                      </td>

                      <td>
                        <span className={`badge ${actionClass}`} style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                          {a.action}
                        </span>
                      </td>

                      <td>
                        <div style={{ fontSize: '0.8125rem' }}>
                          {a.targetType && (
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)', marginRight: '0.5rem' }}>
                              [{a.targetType}] {a.target || ''}
                            </span>
                          )}
                          {a.meta && (
                            <code
                              style={{
                                background: '#f8fafc',
                                padding: '0.15rem 0.4rem',
                                borderRadius: 'var(--r-xs)',
                                color: 'var(--text-secondary)',
                                fontSize: '0.75rem'
                              }}
                            >
                              {JSON.stringify(a.meta)}
                            </code>
                          )}
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
                Page {page} of {data.pages} ({data.total} audit logs)
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
    </div>
  );
}
