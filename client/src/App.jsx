import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Briefcase,
  FileCheck,
  UserCheck,
  Users,
  UserCog,
  ShieldCheck,
  TrendingUp,
  Settings as SettingsIcon,
  LogOut,
  Sparkles,
  Menu,
  X,
  Building2,
  ChevronRight
} from 'lucide-react';

import Landing from './pages/Landing.jsx';
import Auth from './pages/Auth.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Jobs from './pages/Jobs.jsx';
import JobDetail from './pages/JobDetail.jsx';
import CandidateDashboard from './pages/CandidateDashboard.jsx';
import CandidateJobs from './pages/CandidateJobs.jsx';
import MyApplications from './pages/MyApplications.jsx';
import Profile from './pages/Profile.jsx';
import AdminUsers from './pages/AdminUsers.jsx';
import AdminApplications from './pages/AdminApplications.jsx';
import AdminAudit from './pages/AdminAudit.jsx';
import AdminFunnel from './pages/AdminFunnel.jsx';
import Settings from './pages/Settings.jsx';
import api, { getUser, homeFor } from './api.js';

const ROLE_NAV = {
  candidate: [
    { to: '/app/portal/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/app/portal/jobs', label: 'Browse Jobs', icon: Briefcase },
    { to: '/app/portal/applications', label: 'My Applications', icon: FileCheck },
    { to: '/app/portal/profile', label: 'Profile & Resume', icon: UserCheck },
    { to: '/app/settings', label: 'Settings', icon: SettingsIcon }
  ],
  recruiter: [
    { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/app/jobs', label: 'Jobs & Candidates', icon: Briefcase },
    { to: '/app/settings', label: 'Settings', icon: SettingsIcon }
  ],
  admin: [
    { to: '/app', label: 'Dashboard & Analytics', icon: LayoutDashboard, end: true },
    { to: '/app/jobs', label: 'All Jobs', icon: Briefcase },
    { to: '/app/admin/applications', label: 'Candidates', icon: Users },
    { to: '/app/admin/users', label: 'Recruiters & Users', icon: UserCog },
    { to: '/app/admin/funnel', label: 'Hiring Funnel', icon: TrendingUp },
    { to: '/app/admin/audit', label: 'Audit Log', icon: ShieldCheck },
    { to: '/app/settings', label: 'Settings', icon: SettingsIcon }
  ]
};

const ROLE_CONFIG = {
  candidate: { label: 'Candidate', color: 'stage-shortlisted', badge: 'Candidate Portal' },
  recruiter: { label: 'Recruiter', color: 'stage-interview', badge: 'Recruiter Workspace' },
  admin: { label: 'Admin / HR', color: 'stage-hired', badge: 'HR Administrator' }
};

function Shell() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(getUser());
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Sync token and role validity with server on mount
  useEffect(() => {
    if (!localStorage.getItem('token')) return;
    api.get('/auth/me')
      .then(r => {
        localStorage.setItem('user', JSON.stringify(r.data.user));
        setUser(r.data.user);
      })
      .catch(() => {});
  }, []);

  // Close mobile nav on route change
  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  if (!localStorage.getItem('token') || !user?.role) {
    return <Navigate to="/login" replace />;
  }

  const roleMeta = ROLE_CONFIG[user.role] || ROLE_CONFIG.candidate;
  const navItems = ROLE_NAV[user.role] || [];

  const handleSignOut = () => {
    localStorage.clear();
    navigate('/');
  };

  const getInitials = name => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className={`sidebar ${mobileNavOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="brand-logo">
            Recruit<span style={{ color: 'var(--brand-teal)' }}>IQ</span>
            <span className="brand-badge">AI</span>
          </div>

          <button
            type="button"
            className="btn-ghost"
            style={{ display: 'none', padding: '0.25rem' }}
            onClick={() => setMobileNavOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-title">
            {roleMeta.badge}
          </div>

          {navItems.map(item => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={!!item.end}
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User Card in Sidebar Footer */}
        <div className="sidebar-footer">
          <div className="user-profile-widget">
            <div className="user-avatar">
              {getInitials(user.name)}
            </div>
            <div className="user-info">
              <div className="user-name" title={user.name}>
                {user.name}
              </div>
              <div className="user-role-badge">
                <span>{roleMeta.label}</span>
                {user.company && <span>· {user.company}</span>}
              </div>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={handleSignOut}
          >
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="main-content">
        {/* Topbar */}
        <header className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="btn-ghost"
              style={{ padding: '0.4rem', borderRadius: 'var(--r-md)', cursor: 'pointer' }}
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
            >
              <Menu size={20} />
            </button>
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              RecruitIQ Platform
            </span>
          </div>

          <div className="topbar-right">
            <span className={`badge ${roleMeta.color}`}>
              {roleMeta.label}
            </span>
            {user.company && (
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Building2 size={13} /> {user.company}
              </span>
            )}
          </div>
        </header>

        {/* Content Container */}
        <main className="content-container">
          <Outlet context={{ user }} />
        </main>
      </div>
    </div>
  );
}

// UI-level route guard
function Only({ roles, children }) {
  const user = getUser();
  return roles.includes(user?.role) ? children : <Navigate to={homeFor(user?.role)} replace />;
}

const staffRoles = ['recruiter', 'admin'];

export default function App() {
  return (
    <Routes>
      {/* Public Pages */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Auth mode="login" />} />
      <Route path="/register" element={<Auth mode="register" />} />

      {/* Protected App Shell */}
      <Route path="/app" element={<Shell />}>
        {/* Staff Dashboard (Recruiter & Admin) */}
        <Route
          index
          element={
            <Only roles={staffRoles}>
              <Dashboard />
            </Only>
          }
        />

        {/* Candidate Dashboard */}
        <Route
          path="portal/dashboard"
          element={
            <Only roles={['candidate']}>
              <CandidateDashboard />
            </Only>
          }
        />
        <Route
          path="candidate/dashboard"
          element={
            <Only roles={['candidate']}>
              <CandidateDashboard />
            </Only>
          }
        />

        {/* Recruiter / Admin Job Management */}
        <Route
          path="jobs"
          element={
            <Only roles={staffRoles}>
              <Jobs />
            </Only>
          }
        />
        <Route
          path="jobs/:id"
          element={
            <Only roles={staffRoles}>
              <JobDetail />
            </Only>
          }
        />

        {/* Candidate Portal Routes */}
        <Route
          path="portal/jobs"
          element={
            <Only roles={['candidate']}>
              <CandidateJobs />
            </Only>
          }
        />
        <Route
          path="portal/applications"
          element={
            <Only roles={['candidate']}>
              <MyApplications />
            </Only>
          }
        />
        <Route
          path="portal/profile"
          element={
            <Only roles={['candidate']}>
              <Profile />
            </Only>
          }
        />

        {/* Admin / HR Routes */}
        <Route
          path="admin/users"
          element={
            <Only roles={['admin']}>
              <AdminUsers />
            </Only>
          }
        />
        <Route
          path="admin/applications"
          element={
            <Only roles={['admin']}>
              <AdminApplications />
            </Only>
          }
        />
        <Route
          path="admin/audit"
          element={
            <Only roles={['admin']}>
              <AdminAudit />
            </Only>
          }
        />
        <Route
          path="admin/funnel"
          element={
            <Only roles={['admin']}>
              <AdminFunnel />
            </Only>
          }
        />

        {/* Settings Route (All Authenticated Roles) */}
        <Route
          path="settings"
          element={
            <Only roles={['candidate', 'recruiter', 'admin']}>
              <Settings />
            </Only>
          }
        />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
