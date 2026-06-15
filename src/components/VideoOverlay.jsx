import { useState } from 'react'
import { usePeerVideo } from '../hooks/usePeerVideo'

const S = {
  container: { padding: '16px', flex: 1, overflowY: 'auto' },
  card: { background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: '12px', padding: '20px', marginBottom: '14px' },
  title: { fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--c-muted)', marginBottom: '14px' },
  btn: (bg) => ({ width: '100%', padding: '13px', borderRadius: '8px', fontWeight: 700, fontSize: '14px', background: bg, color: '#fff', marginBottom: '8px' }),
  code: { fontFamily: 'monospace', fontSize: '28px', fontWeight: 800, letterSpacing: '6px', color: 'var(--c-accent)', display: 'block', textAlign: 'center', padding: '12px', background: 'var(--c-surface2)', borderRadius: '8px', marginTop: '10px' },
  video: { width: '100%', borderRadius: '8px', background: '#000', aspectRatio: '16/9', objectFit: 'cover' },
  status: (ok) => ({ fontSize: '12px', padding: '6px 10px', borderRadius: '20px', background: ok ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)', color: ok ? 'var(--c-success)' : 'var(--c-danger)', display: 'inline-block', marginBottom: '10px' }),
}

const STATUS_LABEL = {
  idle: null,
  loading: '⏳ Connecting...',
  waiting: '📡 Waiting for viewer to join...',
  connected: '🟢 Connected',
  error: '🔴 Error',
}

export default function VideoOverlay() {
  const { mode, status, roomCode, errMsg, localRef, remoteRef, startHost, joinRoom, disconnect } = usePeerVideo()
  const [codeInput, setCodeInput] = useState('')

  if (!mode) {
    return (
      <div style={S.container}>
        <div style={S.card}>
          <div style={S.title}>Share Camera (Host)</div>
          <p style={{ fontSize: '13px', color: 'var(--c-muted)', marginBottom: '14px', lineHeight: 1.6 }}>
            On the iPad filming the court — tap Share Camera to get a 6-digit code. Give it to the coaching iPad.
          </p>
          <button style={S.btn('var(--c-accent)')} onClick={startHost}>📷 Share My Camera</button>
        </div>

        <div style={S.card}>
          <div style={S.title}>Join Stream (Viewer)</div>
          <p style={{ fontSize: '13px', color: 'var(--c-muted)', marginBottom: '14px', lineHeight: 1.6 }}>
            On the coaching iPad — enter the 6-digit code from the filming iPad.
          </p>
          <input
            value={codeInput}
            onChange={e => setCodeInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            placeholder="ABC123"
            maxLength={6}
            style={{ width: '100%', padding: '12px', fontSize: '22px', letterSpacing: '4px', textAlign: 'center', fontWeight: 800, background: 'var(--c-surface2)', border: '1px solid var(--c-border)', borderRadius: '8px', color: 'var(--c-ink)', outline: 'none', marginBottom: '10px', fontFamily: 'monospace' }}
          />
          <button style={{ ...S.btn('var(--c-accent2)'), opacity: codeInput.length === 6 ? 1 : 0.4 }} disabled={codeInput.length !== 6} onClick={() => joinRoom(codeInput)}>
            Join Stream
          </button>
        </div>

        <div style={{ ...S.card, background: 'rgba(59,130,246,0.06)' }}>
          <div style={{ fontSize: '12px', color: 'var(--c-muted)', lineHeight: 1.7 }}>
            <b style={{ color: 'var(--c-accent2)' }}>How it works</b><br />
            Video is peer-to-peer via WebRTC — it doesn't go through any server. Works on the same WiFi network or over the internet. The filming iPad stays in Safari/Chrome; no app install needed.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={S.container}>
      {STATUS_LABEL[status] && (
        <div style={S.status(status === 'connected')}>{STATUS_LABEL[status]}</div>
      )}
      {errMsg && <div style={{ fontSize: '12px', color: 'var(--c-danger)', marginBottom: '10px' }}>{errMsg}</div>}

      {mode === 'host' && (
        <div style={S.card}>
          <div style={S.title}>Your Room Code</div>
          <p style={{ fontSize: '12px', color: 'var(--c-muted)', marginBottom: '4px' }}>Share this with the coaching iPad:</p>
          <span style={S.code}>{roomCode}</span>
          <video ref={localRef} muted playsInline style={{ ...S.video, marginTop: '14px' }} />
        </div>
      )}

      {mode === 'viewer' && status === 'connected' && (
        <div style={S.card}>
          <div style={S.title}>Live Court Feed</div>
          <video ref={remoteRef} playsInline style={S.video} />
        </div>
      )}

      {mode === 'viewer' && status === 'loading' && (
        <div style={{ ...S.card, textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>📡</div>
          <div style={{ color: 'var(--c-muted)', fontSize: '14px' }}>Connecting to stream...</div>
        </div>
      )}

      <button onClick={disconnect} style={S.btn('rgba(239,68,68,0.15)')}>
        <span style={{ color: '#ef4444' }}>✕ Disconnect</span>
      </button>
    </div>
  )
}
