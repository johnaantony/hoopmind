import { useState, useRef, useEffect, useCallback } from 'react'

const CW = 420  // canvas width (px)
const CH = 560  // canvas height (px) — portrait half-court
const TOKEN_R = 18
const BALL_R  = 12

const OFF_STARTS = [
  { x: 0.50, y: 0.88 },
  { x: 0.80, y: 0.72 },
  { x: 0.20, y: 0.72 },
  { x: 0.75, y: 0.48 },
  { x: 0.25, y: 0.48 },
]
const DEF_STARTS = [
  { x: 0.50, y: 0.82 },
  { x: 0.78, y: 0.66 },
  { x: 0.22, y: 0.66 },
  { x: 0.73, y: 0.44 },
  { x: 0.27, y: 0.44 },
]
const OFF_COLOR = '#3b82f6'
const DEF_COLOR = '#ef4444'
const BALL_COLOR = '#f97316'

// ── Court drawing ─────────────────────────────────────────────
function drawCourt(ctx, w, h) {
  ctx.fillStyle = '#1a5c36'
  ctx.fillRect(0, 0, w, h)

  ctx.strokeStyle = 'rgba(255,255,255,0.75)'
  ctx.lineWidth = 2
  ctx.lineCap = 'round'

  const BX = w / 2
  const BY = h * 0.10
  const keyW = w * 0.33
  const keyH = h * 0.43
  const ftR  = keyW / 2

  // Boundary
  ctx.strokeRect(2, 2, w - 4, h - 4)
  // Half-court line
  ctx.beginPath(); ctx.moveTo(2, h - 2); ctx.lineTo(w - 2, h - 2); ctx.stroke()

  // Backboard
  ctx.beginPath()
  ctx.moveTo(BX - w * 0.07, BY - h * 0.025)
  ctx.lineTo(BX + w * 0.07, BY - h * 0.025)
  ctx.stroke()

  // Basket
  ctx.beginPath(); ctx.arc(BX, BY, w * 0.025, 0, Math.PI * 2); ctx.stroke()

  // Restricted arc
  ctx.beginPath(); ctx.arc(BX, BY, w * 0.075, 0.15, Math.PI - 0.15); ctx.stroke()

  // Key
  ctx.strokeRect(BX - keyW / 2, 0, keyW, keyH)

  // FT line
  ctx.beginPath(); ctx.moveTo(BX - keyW / 2, keyH); ctx.lineTo(BX + keyW / 2, keyH); ctx.stroke()

  // FT circle (solid top, dashed bottom)
  ctx.beginPath(); ctx.arc(BX, keyH, ftR, Math.PI, 0); ctx.stroke()
  ctx.save()
  ctx.setLineDash([6, 5])
  ctx.beginPath(); ctx.arc(BX, keyH, ftR, 0, Math.PI); ctx.stroke()
  ctx.restore()

  // 3-point arc
  const r3 = w * 0.455
  const cosA = (w * 0.04) / r3
  const ang  = Math.acos(Math.min(cosA, 1))
  ctx.beginPath(); ctx.arc(BX, BY, r3, ang, Math.PI - ang); ctx.stroke()

  // Corner 3 straight lines
  const cY = BY + r3 * Math.sin(ang)
  ctx.beginPath()
  ctx.moveTo(2,     2); ctx.lineTo(2,     cY)
  ctx.moveTo(w - 2, 2); ctx.lineTo(w - 2, cY)
  ctx.stroke()

  // Center circle half (at bottom edge = half-court)
  ctx.beginPath(); ctx.arc(BX, h, w * 0.12, Math.PI, 0); ctx.stroke()
}

function drawArrow(ctx, pts, color, alpha = 1) {
  if (!pts || pts.length < 2) return
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.strokeStyle = color
  ctx.fillStyle   = color
  ctx.lineWidth   = 3
  ctx.lineCap     = 'round'
  ctx.lineJoin    = 'round'

  ctx.beginPath()
  ctx.moveTo(pts[0].x * CW, pts[0].y * CH)
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x * CW, pts[i].y * CH)
  ctx.stroke()

  // Arrowhead at end
  const last = pts[pts.length - 1]
  const prev = pts[pts.length - 2]
  const dx = last.x - prev.x
  const dy = last.y - prev.y
  const angle = Math.atan2(dy * CH, dx * CW)
  const ex = last.x * CW, ey = last.y * CH
  const hs = 10
  ctx.beginPath()
  ctx.moveTo(ex, ey)
  ctx.lineTo(ex - hs * Math.cos(angle - 0.4), ey - hs * Math.sin(angle - 0.4))
  ctx.lineTo(ex - hs * Math.cos(angle + 0.4), ey - hs * Math.sin(angle + 0.4))
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

function drawToken(ctx, tok, selected, replayPos) {
  const px = (replayPos?.x ?? tok.x) * CW
  const py = (replayPos?.y ?? tok.y) * CH
  const r  = tok.type === 'ball' ? BALL_R : TOKEN_R

  ctx.save()
  ctx.shadowColor = selected ? '#fff' : 'transparent'
  ctx.shadowBlur  = selected ? 8 : 0

  ctx.fillStyle   = tok.color
  ctx.strokeStyle = selected ? '#fff' : 'rgba(0,0,0,0.5)'
  ctx.lineWidth   = selected ? 2.5 : 1.5
  ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2)
  ctx.fill(); ctx.stroke()

  if (tok.type !== 'ball') {
    ctx.fillStyle   = '#fff'
    ctx.font        = `bold ${tok.label.length > 2 ? '9' : '11'}px Inter,sans-serif`
    ctx.textAlign   = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(tok.label, px, py)
  }
  ctx.restore()
}

// ── Helpers ───────────────────────────────────────────────────
function ptDistance(ax, ay, bx, by) { return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2) }

function lerpPath(pts, t) {
  if (!pts || pts.length === 0) return null
  if (pts.length === 1) return pts[0]
  let total = 0
  const seg = []
  for (let i = 1; i < pts.length; i++) {
    const d = ptDistance(pts[i-1].x, pts[i-1].y, pts[i].x, pts[i].y)
    seg.push(d); total += d
  }
  let target = t * total, acc = 0
  for (let i = 0; i < seg.length; i++) {
    if (acc + seg[i] >= target || i === seg.length - 1) {
      const s = seg[i] === 0 ? 0 : (target - acc) / seg[i]
      return {
        x: pts[i].x + s * (pts[i+1].x - pts[i].x),
        y: pts[i].y + s * (pts[i+1].y - pts[i].y),
      }
    }
    acc += seg[i]
  }
  return pts[pts.length - 1]
}

function buildTokens(roster) {
  const onFloor = roster.filter(p => p.onFloor).slice(0, 5)
  const tokens = []

  OFF_STARTS.forEach((pos, i) => {
    const player = onFloor[i]
    tokens.push({
      id: `off-${i}`,
      type: 'offense',
      label: player ? `#${player.number}` : String(i + 1),
      name:  player?.name || `Player ${i + 1}`,
      color: OFF_COLOR,
      ...pos,
    })
  })

  DEF_STARTS.forEach((pos, i) => {
    tokens.push({ id: `def-${i}`, type: 'defense', label: `X${i + 1}`, name: `Defender ${i + 1}`, color: DEF_COLOR, ...pos })
  })

  tokens.push({ id: 'ball', type: 'ball', label: '', name: 'Ball', color: BALL_COLOR, ...OFF_STARTS[0] })

  return tokens
}

// ── Component ─────────────────────────────────────────────────
export default function CoachBoard({ roster = [] }) {
  const canvasRef  = useRef(null)
  const rafRef     = useRef(null)
  const drawingRef = useRef(false)
  const currentPathRef = useRef([])

  const [tokens,      setTokens]      = useState(() => buildTokens(roster))
  const [mode,        setMode]        = useState('setup')  // setup | draw | replay
  const [selectedId,  setSelectedId]  = useState(null)
  const [steps,       setSteps]       = useState([])       // [{paths: {id:[{x,y}]}}]
  const [replayPos,   setReplayPos]   = useState({})
  const [isReplaying, setIsReplaying] = useState(false)
  const [replaySpeed, setReplaySpeed] = useState(1)

  const [plays,           setPlays]           = useState(() => {
    try { return JSON.parse(localStorage.getItem('hm_plays') || '[]') } catch { return [] }
  })
  const [showSave,    setShowSave]    = useState(false)
  const [showLib,     setShowLib]     = useState(false)
  const [playName,    setPlayName]    = useState('')

  // Committed paths for current step being drawn
  const [stepPaths, setStepPaths] = useState({})
  // Live path being actively drawn
  const [livePath,  setLivePath]  = useState([])

  // ── Canvas render ─────────────────────────────────────────
  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, CW, CH)
    drawCourt(ctx, CW, CH)

    // Draw all committed step paths
    steps.forEach((step, si) => {
      Object.entries(step.paths || {}).forEach(([tid, pts]) => {
        const tok = tokens.find(t => t.id === tid)
        if (tok) drawArrow(ctx, pts, tok.color, 0.55 + si * 0.1)
      })
    })

    // Draw current step's committed paths
    Object.entries(stepPaths).forEach(([tid, pts]) => {
      const tok = tokens.find(t => t.id === tid)
      if (tok) drawArrow(ctx, pts, tok.color, 0.85)
    })

    // Draw live (in-progress) path
    if (livePath.length > 1 && selectedId) {
      const tok = tokens.find(t => t.id === selectedId)
      if (tok) drawArrow(ctx, livePath, tok.color, 1)
    }

    // Draw tokens
    tokens.forEach(tok => {
      const rp = isReplaying ? replayPos[tok.id] : null
      drawToken(ctx, tok, tok.id === selectedId && mode === 'draw', rp)
    })
  }, [tokens, steps, stepPaths, livePath, selectedId, mode, isReplaying, replayPos])

  useEffect(() => { render() }, [render])

  // ── Pointer events ────────────────────────────────────────
  function canvasPoint(e) {
    const rect = canvasRef.current.getBoundingClientRect()
    const scaleX = CW / rect.width
    const scaleY = CH / rect.height
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    return {
      x: ((clientX - rect.left) * scaleX) / CW,
      y: ((clientY - rect.top)  * scaleY) / CH,
    }
  }

  function findToken(nx, ny) {
    const hit = TOKEN_R / CW * 1.5
    return tokens.find(t => ptDistance(t.x, t.y, nx, ny) < hit)
  }

  function onPointerDown(e) {
    e.preventDefault()
    const pt = canvasPoint(e)

    if (mode === 'setup') {
      const tok = findToken(pt.x, pt.y)
      if (tok) { setSelectedId(tok.id); drawingRef.current = true }
      return
    }

    if (mode === 'draw') {
      const tok = findToken(pt.x, pt.y)
      if (tok) {
        setSelectedId(tok.id)
        currentPathRef.current = [{ x: tok.x, y: tok.y }]
        drawingRef.current = true
        setLivePath([{ x: tok.x, y: tok.y }])
      }
    }
  }

  function onPointerMove(e) {
    e.preventDefault()
    if (!drawingRef.current) return
    const pt = canvasPoint(e)

    if (mode === 'setup' && selectedId) {
      setTokens(prev => prev.map(t => t.id === selectedId ? { ...t, x: pt.x, y: pt.y } : t))
    }

    if (mode === 'draw' && selectedId) {
      currentPathRef.current.push(pt)
      // Thin out points to every ~4 for performance
      if (currentPathRef.current.length % 4 === 0) {
        setLivePath([...currentPathRef.current])
      }
    }
  }

  function onPointerUp(e) {
    e.preventDefault()
    if (!drawingRef.current) return
    drawingRef.current = false

    if (mode === 'draw' && selectedId && currentPathRef.current.length > 1) {
      const finalPt = currentPathRef.current[currentPathRef.current.length - 1]
      // Commit path and move token to endpoint
      setStepPaths(prev => ({ ...prev, [selectedId]: [...currentPathRef.current] }))
      setTokens(prev => prev.map(t => t.id === selectedId ? { ...t, x: finalPt.x, y: finalPt.y } : t))
      setLivePath([])
      currentPathRef.current = []
    }

    if (mode === 'setup') setSelectedId(null)
  }

  // ── Step management ───────────────────────────────────────
  function commitStep() {
    if (!Object.keys(stepPaths).length) return
    setSteps(prev => [...prev, { paths: stepPaths }])
    setStepPaths({})
    setSelectedId(null)
  }

  function undoLastStep() {
    if (steps.length === 0) { setStepPaths({}); return }
    const last = steps[steps.length - 1]
    // Restore token positions from last step's endpoints
    setTokens(prev => {
      const next = [...prev]
      Object.entries(last.paths).forEach(([tid, pts]) => {
        const start = pts[0]
        const idx = next.findIndex(t => t.id === tid)
        if (idx >= 0 && start) next[idx] = { ...next[idx], x: start.x, y: start.y }
      })
      return next
    })
    setSteps(prev => prev.slice(0, -1))
  }

  function clearBoard() {
    setSteps([])
    setStepPaths({})
    setLivePath([])
    setSelectedId(null)
    setIsReplaying(false)
    setReplayPos({})
    setTokens(buildTokens(roster))
  }

  // ── Replay ────────────────────────────────────────────────
  function startReplay() {
    if (!steps.length) return
    setMode('replay')
    setIsReplaying(true)
    setSelectedId(null)

    const allSteps = steps
    const STEP_MS  = 1400 / replaySpeed

    // Build initial positions map
    const initPos = {}
    tokens.forEach(t => { initPos[t.id] = { x: t.x, y: t.y } })
    // Rewind tokens to initial positions by walking steps backward
    const startPos = { ...initPos }
    allSteps.forEach(step => {
      Object.entries(step.paths).forEach(([tid, pts]) => {
        // The start of step = first point in path
        if (pts[0]) startPos[tid] = pts[0]
      })
    })
    // Actually: initial positions are before any step
    // We need to reconstruct by rewinding
    const posHistory = [{}]
    tokens.forEach(t => { posHistory[0][t.id] = { x: t.x, y: t.y } })

    // Rewind: for each step, the start positions are the path[0] of each moved token
    // (and previous position for unmoved tokens)
    // Simplest: store snapshots. Walk forward computing positions.
    const snapshots = [{}]
    tokens.forEach(t => { snapshots[0][t.id] = { x: t.x, y: t.y } })

    // Compute snapshot BEFORE each step (start position for that step)
    // by walking backwards from current token positions
    // Actually: each step's path[0] = token position at START of that step
    const rewindSnaps = []
    let cur = {}
    // current token positions = after all steps
    tokens.forEach(t => { cur[t.id] = { x: t.x, y: t.y } })
    // Walk backward
    for (let si = allSteps.length - 1; si >= 0; si--) {
      const snap = { ...cur }
      Object.entries(allSteps[si].paths).forEach(([tid, pts]) => {
        snap[tid] = pts[0]
      })
      rewindSnaps.unshift(snap)
    }

    let stepIdx = 0
    let stepStart = null

    function tick(now) {
      if (stepStart === null) stepStart = now
      const elapsed = now - stepStart
      const t = Math.min(elapsed / STEP_MS, 1)

      const step     = allSteps[stepIdx]
      const startSnap = rewindSnaps[stepIdx]

      const pos = {}
      tokens.forEach(tok => {
        const path = step.paths[tok.id]
        if (path && path.length > 1) {
          pos[tok.id] = lerpPath(path, t)
        } else {
          pos[tok.id] = startSnap[tok.id] || { x: tok.x, y: tok.y }
        }
      })
      setReplayPos(pos)

      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        stepIdx++
        if (stepIdx < allSteps.length) {
          stepStart = null
          rafRef.current = requestAnimationFrame(tick)
        } else {
          setIsReplaying(false)
          setMode('draw')
        }
      }
    }

    rafRef.current = requestAnimationFrame(tick)
  }

  function stopReplay() {
    cancelAnimationFrame(rafRef.current)
    setIsReplaying(false)
    setReplayPos({})
    setMode('draw')
  }

  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  // ── Save / Load ───────────────────────────────────────────
  function savePlay() {
    if (!playName.trim()) return
    const play = {
      id: Date.now(),
      name: playName.trim(),
      tokens: tokens.map(t => ({ ...t })),
      steps: steps.map(s => ({ paths: s.paths })),
    }
    const updated = [...plays, play]
    setPlays(updated)
    localStorage.setItem('hm_plays', JSON.stringify(updated))
    setShowSave(false)
    setPlayName('')
  }

  function loadPlay(play) {
    clearBoard()
    setTokens(play.tokens.map(t => ({ ...t })))
    setSteps(play.steps.map(s => ({ paths: s.paths })))
    setShowLib(false)
  }

  function deletePlay(id) {
    const updated = plays.filter(p => p.id !== id)
    setPlays(updated)
    localStorage.setItem('hm_plays', JSON.stringify(updated))
  }

  // ── Styles ────────────────────────────────────────────────
  const modeBtn = (m, label, color) => (
    <button
      onClick={() => { setMode(m); setSelectedId(null) }}
      style={{
        flex: 1, padding: '8px 0', borderRadius: '6px', fontSize: '12px', fontWeight: 700,
        background: mode === m ? color : 'var(--c-surface2)',
        color: mode === m ? '#fff' : 'var(--c-muted)',
        border: mode === m ? `1px solid ${color}` : '1px solid var(--c-border)',
      }}
    >{label}</button>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--c-bg)' }}>

      {/* Toolbar */}
      <div style={{ padding: '8px 12px', background: 'var(--c-surface)', borderBottom: '1px solid var(--c-border)', display: 'flex', gap: '6px' }}>
        {modeBtn('setup', '✋ Move', '#6366f1')}
        {modeBtn('draw',  '✏️ Draw', '#22c55e')}
        <button
          onClick={isReplaying ? stopReplay : startReplay}
          disabled={!steps.length && !isReplaying}
          style={{
            flex: 1, padding: '8px 0', borderRadius: '6px', fontSize: '12px', fontWeight: 700,
            background: isReplaying ? '#ef4444' : '#f97316',
            color: '#fff', opacity: (!steps.length && !isReplaying) ? 0.4 : 1,
          }}
        >{isReplaying ? '⏹ Stop' : '▶ Play'}</button>
      </div>

      {/* Canvas */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '8px', overflow: 'hidden' }}>
        <canvas
          ref={canvasRef}
          width={CW} height={CH}
          style={{ width: '100%', maxWidth: `${CW}px`, touchAction: 'none', borderRadius: '8px', cursor: mode === 'draw' ? 'crosshair' : 'grab' }}
          onMouseDown={onPointerDown} onMouseMove={onPointerMove} onMouseUp={onPointerUp}
          onTouchStart={onPointerDown} onTouchMove={onPointerMove} onTouchEnd={onPointerUp}
        />
      </div>

      {/* Action bar */}
      <div style={{ padding: '8px 12px 4px', display: 'flex', gap: '6px', background: 'var(--c-surface)', borderTop: '1px solid var(--c-border)' }}>
        {mode === 'draw' && (
          <button onClick={commitStep} disabled={!Object.keys(stepPaths).length}
            style={{ flex: 2, padding: '9px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, background: Object.keys(stepPaths).length ? '#22c55e' : 'var(--c-surface2)', color: '#fff', opacity: Object.keys(stepPaths).length ? 1 : 0.4 }}>
            + Add Step ({steps.length})
          </button>
        )}
        <button onClick={undoLastStep} style={{ flex: 1, padding: '9px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, background: 'var(--c-surface2)', color: 'var(--c-muted)', border: '1px solid var(--c-border)' }}>
          Undo
        </button>
        <button onClick={() => setShowLib(true)} style={{ flex: 1, padding: '9px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, background: 'var(--c-surface2)', color: 'var(--c-muted)', border: '1px solid var(--c-border)' }}>
          📚 Lib
        </button>
        <button onClick={() => setShowSave(true)} disabled={!steps.length} style={{ flex: 1, padding: '9px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, background: steps.length ? '#3b82f6' : 'var(--c-surface2)', color: '#fff', opacity: steps.length ? 1 : 0.4 }}>
          💾 Save
        </button>
        <button onClick={clearBoard} style={{ flex: 1, padding: '9px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, background: 'var(--c-surface2)', color: '#ef4444', border: '1px solid var(--c-border)' }}>
          Clear
        </button>
      </div>

      {/* Speed control */}
      <div style={{ padding: '6px 12px 10px', background: 'var(--c-surface)', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '11px', color: 'var(--c-muted)', whiteSpace: 'nowrap' }}>Replay speed</span>
        <input type="range" min="0.5" max="3" step="0.5" value={replaySpeed} onChange={e => setReplaySpeed(Number(e.target.value))}
          style={{ flex: 1 }} />
        <span style={{ fontSize: '11px', color: 'var(--c-accent)', width: '28px' }}>{replaySpeed}×</span>
      </div>

      {/* Save dialog */}
      {showSave && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'var(--c-surface)', borderRadius: '12px', padding: '20px', width: '280px', border: '1px solid var(--c-border)' }}>
            <div style={{ fontWeight: 700, marginBottom: '12px', fontSize: '15px' }}>Save Play</div>
            <input value={playName} onChange={e => setPlayName(e.target.value)} placeholder="Play name (e.g. Horns Set)"
              onKeyDown={e => e.key === 'Enter' && savePlay()}
              style={{ width: '100%', padding: '10px', borderRadius: '7px', background: 'var(--c-surface2)', border: '1px solid var(--c-border)', color: 'var(--c-ink)', fontSize: '14px', outline: 'none' }} />
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <button onClick={() => setShowSave(false)} style={{ flex: 1, padding: '9px', borderRadius: '7px', background: 'var(--c-surface2)', color: 'var(--c-muted)', border: '1px solid var(--c-border)' }}>Cancel</button>
              <button onClick={savePlay} disabled={!playName.trim()} style={{ flex: 1, padding: '9px', borderRadius: '7px', background: '#3b82f6', color: '#fff', fontWeight: 700 }}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Library */}
      {showLib && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'flex-end', zIndex: 100 }}>
          <div style={{ background: 'var(--c-surface)', borderRadius: '16px 16px 0 0', padding: '20px', width: '100%', maxHeight: '60vh', overflow: 'auto', border: '1px solid var(--c-border)' }}>
            <div style={{ fontWeight: 700, marginBottom: '14px', fontSize: '15px' }}>Play Library</div>
            {!plays.length && <div style={{ color: 'var(--c-muted)', fontSize: '13px' }}>No saved plays yet.</div>}
            {plays.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0', borderBottom: '1px solid var(--c-border)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '13px' }}>{p.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--c-muted)' }}>{p.steps.length} step{p.steps.length !== 1 ? 's' : ''}</div>
                </div>
                <button onClick={() => loadPlay(p)} style={{ padding: '6px 12px', borderRadius: '6px', background: '#3b82f6', color: '#fff', fontSize: '12px', fontWeight: 600 }}>Load</button>
                <button onClick={() => deletePlay(p.id)} style={{ padding: '6px 10px', borderRadius: '6px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: '12px' }}>✕</button>
              </div>
            ))}
            <button onClick={() => setShowLib(false)} style={{ marginTop: '14px', width: '100%', padding: '11px', borderRadius: '8px', background: 'var(--c-surface2)', color: 'var(--c-muted)', fontWeight: 600 }}>Close</button>
          </div>
        </div>
      )}
    </div>
  )
}
