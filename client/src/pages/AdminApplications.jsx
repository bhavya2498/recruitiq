import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Search,
  Building2,
  Calendar,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Clock,
  AlertCircle,
  ExternalLink,
  Award
} from 'lucide-react';
import api, { errMsg } from '../api.js';
import { STAGES, label, fmt } from '../stages.js';

export default function AdminApplications() {
  const [data, setData] = useState(null);
  const [stageFilter, setStageFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [err, setErr] = useState('');

  const loadApplications = () => {
    api.get('/admin/applications', {
      params: {
        ...(stageFilter && { stage: stageFilter }),
        ...(searchQuery && { q: searchQuery }),
        page
      }
    })
      .then(r => setData(r.data))
      .catch(x => setErr(errMsg(x)));
  };

  useEffect(() => {
    loadApplications();
  }, [stageFilter, page]);

  const handleSearch = e => {
    e.preventDefault();
    setPage(1);
    loadApplications();
  };

  return (
    <div>
      {/* Header */}
      <div className="flex-between" style={{ marginBottom: '1.75rem', flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <h1 style={{ margin: 0 }}>Organisation Applications & Candidates</h1>
            <span className="badge stage-hired">Admin Scope</span>
          </div>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
            Consolidated record of every candidate screened or applied across all recruiters.
          </p>
        </div>
      </div>

      {err && (
        <div className="alert-box alert-danger">
          <AlertCircle size={18} />
          <span>{err}</span>
        </div>
      )}

      {/* Filter & Search Bar */}
      <form onSubmit={handleSearch} className="filter-bar">
        <div className="search-bar" style={{ maxWidth: '380px' }}>
          <Search size={16} style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search candidate name or email..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <select
          className="form-select"
          style={{ width: 'auto', fontSize: '0.875rem' }}
          value={stageFilter}
          onChange={e => {
            setPage(1);
            setStageFilter(e.target.value);
          }}
        >
          <option value="">All Pipeline Stages</option>
          {STAGES.map(s => (
            <option key={s} value={s}>
              {label(s)}
            </option>
          ))}
        </select>

        <button type="submit" className="btn btn-secondary">
          Filter
        </button>

        {(searchQuery || stageFilter) && (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              setSearchQuery('');
              setStageFilter('');
              setPage(1);
            }}
          >
            Clear
          </button>
        )}
      </form>

      {/* Applications Table */}
      {!data ? (
        <div style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Clock className="animate-spin" size={24} style={{ margin: '0 auto 0.5rem' }} />
          <p>Loading applications...</p>
        </div>
      ) : !data.items.length ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <Users size={28} />
          </div>
          <h3>No applications found</h3>
          <p style={{ maxWidth: '400px', margin: '0.5rem auto 1.5rem' }}>
            There are currently no candidate applications matching your selected criteria.
          </p>
        </div>
      ) : (
        <>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Job Opening</th>
                  <th>Managing Recruiter</th>
                  <th>AI Match Score</th>
                  <th>Pipeline Stage</th>
                  <th>Date Received</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map(c => {
                  const score = c.score || 0;
                  let scoreColor = '#059669';
                  if (score < 50) scoreColor = '#dc2626';
                  else if (score < 75) scoreColor = '#d97706';

                  return (
                    <tr key={c._id}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--brand-navy)' }}>{c.name}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                          <span>{c.email || c.fileName}</span>
                          <span className="badge stage-applied" style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem' }}>
                            {c.source === 'application' ? 'Online Apply' : 'Resume Upload'}
                          </span>
                        </div>
                      </td>

                      <td>
                        {c.job ? (
                          <Link
                            to={'/app/jobs/' + c.job._id}
                            style={{ fontWeight: 600, color: 'var(--brand-blue)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                          >
                            {c.job.title} <ExternalLink size={12} />
                          </Link>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>Job Removed</span>
                        )}
                      </td>

                      <td>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {c.owner?.name || 'Unassigned'}
                        </span>
                      </td>

                      <td>
                        <div className="score-badge">
                          <div className="score-bar-mini">
                            <div
                              className="score-bar-mini-fill"
                              style={{
                                width: `${score}%`,
                                background: scoreColor
                              }}
                            />
                          </div>
                          <span style={{ color: scoreColor }}>{score}%</span>
                        </div>
                      </td>

                      <td>
                        <span className={`badge stage-${c.stage}`}>
                          {label(c.stage)}
                        </span>
                      </td>

                      <td>
                        <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                          {fmt(c.createdAt)}
                        </span>
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
                Page {page} of {data.pages} ({data.total} total candidates)
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
