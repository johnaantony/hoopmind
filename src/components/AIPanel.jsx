import React from 'react'

const confColors = {
  high: 'var(--c-success)',
  medium: 'var(--c-warn)',
  low: 'var(--c-danger)',
}

const confLabels = {
  high: 'High Confidence',
  medium: 'Medium Confidence',
  low: 'Low Confidence — Use Judgment',
}

const styles = {
  panel: {
    background: 'var(--c-surface2)',
    border: '1px solid var(--c-border)',
    borderRadius: '10px',
    padding: '16px',
    marginTop: '16px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '12px',
  },
  title: {
    fontFamily: 'var(--font-display)',
    fontSize: '16px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '1px',
    color: 'var(--c-accent)',
  },
  confBadge: {
    fontSize: '11px',
    fontWeight: 600,
    padding: '3px 8px',
    borderRadius: '4px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  text: {
    fontSize: '14px',
    lineHeight: '1.6',
    color: 'var(--c-ink)',
    whiteSpace: 'pre-wrap',
  },
  disclaimer: {
    marginTop: '12px',
    padding: '8px 12px',
    background: 'rgba(234, 179, 8, 0.08)',
    border: '1px solid rgba(234, 179, 8, 0.2)',
    borderRadius: '6px',
    fontSize: '11px',
    color: 'var(--c-muted)',
  },
  loadingDots: {
    display: 'flex',
    gap: '6px',
    padding: '8px 0',
  },
  dot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: 'var(--c-accent)',
    animation: 'pulse 1.2s ease-in-out infinite',
  },
  error: {
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '6px',
    padding: '12px',
    color: 'var(--c-danger)',
    fontSize: '13px',
  },
}

export default function AIPanel({ loading, result, error, confidence, onClear }) {
  if (!loading && !result && !error) return null

  return (
    <div style={styles.panel}>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1); }
        }
        @keyframes pulseDot2 {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1); }
        }
      `}</style>

      <div style={styles.header}>
        <div style={styles.title}>AI Recommendation</div>
        {confidence && !loading && (
          <div
            style={{
              ...styles.confBadge,
              background: `${confColors[confidence]}20`,
              color: confColors[confidence],
              border: `1px solid ${confColors[confidence]}40`,
            }}
          >
            {confLabels[confidence]}
          </div>
        )}
        {result && (
          <button
            onClick={onClear}
            style={{
              background: 'transparent',
              color: 'var(--c-muted)',
              fontSize: '18px',
              padding: '0 4px',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        )}
      </div>

      {loading && (
        <div>
          <div style={{ fontSize: '13px', color: 'var(--c-muted)', marginBottom: '8px' }}>
            Analyzing game state...
          </div>
          <div style={styles.loadingDots}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  ...styles.dot,
                  animationDelay: `${i * 0.2}s`,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {error && (
        <div style={styles.error}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {result && !loading && (
        <>
          <div style={styles.text}>{result}</div>
          <div style={styles.disclaimer}>
            AI recommendations are decision support tools — not substitutes for your coaching judgment.
            Confidence scores reflect data quality, not certainty of outcome.
          </div>
        </>
      )}
    </div>
  )
}
