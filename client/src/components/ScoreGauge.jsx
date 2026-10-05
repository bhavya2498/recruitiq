import React from 'react';

export default function ScoreGauge({ score = 0, size = 80, strokeWidth = 8, showLabel = true }) {
  const normalized = Math.min(100, Math.max(0, Math.round(score)));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (normalized / 100) * circumference;

  let color = '#10b981'; // green for 75+
  let trackColor = '#d1fae5';
  let label = 'Strong Match';
  let badgeClass = 'stage-shortlisted';

  if (normalized < 50) {
    color = '#ef4444'; // red for <50
    trackColor = '#fee2e2';
    label = 'Low Match';
    badgeClass = 'stage-rejected';
  } else if (normalized < 75) {
    color = '#f59e0b'; // amber for 50-74
    trackColor = '#fef3c7';
    label = 'Moderate Match';
    badgeClass = 'stage-screening';
  }

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={trackColor}
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.8s ease-in-out' }}
          />
        </svg>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-heading)',
            fontWeight: 800,
            fontSize: size * 0.28,
            color: 'var(--text-primary)',
            lineHeight: 1
          }}
        >
          {normalized}
          <span style={{ fontSize: size * 0.14, fontWeight: 600, color: 'var(--text-muted)' }}>%</span>
        </div>
      </div>
      {showLabel && (
        <span className={`badge ${badgeClass}`} style={{ fontSize: '0.7rem' }}>
          {label}
        </span>
      )}
    </div>
  );
}
