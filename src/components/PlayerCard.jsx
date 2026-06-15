import React from 'react'
import { computeFatigueScore, getFatigueLabel } from '../data/roster'

const styles = {
  card: {
    background: 'var(--c-surface)',
    border: '1px solid var(--c-border)',
    borderRadius: '8px',
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '8px',
  },
  number: {
    fontFamily: 'var(--font-display)',
    fontSize: '22px',
    fontWeight: 800,
    color: 'var(--c-accent)',
    minWidth: '36px',
    textAlign: 'center',
  },
  info: {
    flex: 1,
  },
  name: {
    fontWeight: 600,
    fontSize: '14px',
    color: 'var(--c-ink)',
    marginBottom: '4px',
  },
  meta: {
    fontSize: '11px',
    color: 'var(--c-muted)',
    marginBottom: '6px',
  },
  barTrack: {
    height: '5px',
    background: 'var(--c-border)',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  badge: {
    fontSize: '10px',
    fontWeight: 600,
    padding: '2px 7px',
    borderRadius: '4px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  foulPips: {
    display: 'flex',
    gap: '3px',
    marginTop: '4px',
  },
  pip: {
    width: '7px',
    height: '7px',
    borderRadius: '50%',
  },
}

export default function PlayerCard({ player, highlight = false, onToggleFloor }) {
  const score = computeFatigueScore(player)
  const { label, color } = getFatigueLabel(score)

  const cardStyle = {
    ...styles.card,
    borderColor: highlight ? color : 'var(--c-border)',
    boxShadow: highlight ? `0 0 0 1px ${color}40` : 'none',
    opacity: player.onFloor ? 1 : 0.65,
  }

  return (
    <div style={cardStyle}>
      <div
        onClick={onToggleFloor}
        style={{
          ...styles.number,
          cursor: onToggleFloor ? 'pointer' : 'default',
          color: player.onFloor ? 'var(--c-accent)' : 'var(--c-muted)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
        }}
      >
        #{player.number}
        {onToggleFloor && (
          <span style={{ fontSize: '8px', fontWeight: 700, letterSpacing: '0.5px', color: player.onFloor ? 'var(--c-success)' : 'var(--c-muted)' }}>
            {player.onFloor ? '● ON' : '○ OUT'}
          </span>
        )}
      </div>
      <div style={styles.info}>
        <div style={styles.name}>{player.name}</div>
        <div style={styles.meta}>
          {player.position} &nbsp;|&nbsp; {player.minutesPlayed} min &nbsp;|&nbsp; {player.points} pts / {player.assists} ast
        </div>
        <div style={styles.barTrack}>
          <div
            style={{
              height: '100%',
              width: `${score}%`,
              background: color,
              borderRadius: '3px',
              transition: 'width 0.4s ease',
            }}
          />
        </div>
        <div style={styles.foulPips}>
          {[1, 2, 3, 4, 5].map((n) => (
            <div
              key={n}
              style={{
                ...styles.pip,
                background: n <= player.fouls ? 'var(--c-danger)' : 'var(--c-border)',
              }}
            />
          ))}
          <span style={{ fontSize: '10px', color: 'var(--c-muted)', marginLeft: '4px' }}>
            {player.fouls} foul{player.fouls !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
      <div>
        <div
          style={{
            ...styles.badge,
            background: `${color}20`,
            color: color,
            border: `1px solid ${color}50`,
          }}
        >
          {label}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--c-muted)', textAlign: 'center', marginTop: '4px' }}>
          {score}/100
        </div>
      </div>
    </div>
  )
}
