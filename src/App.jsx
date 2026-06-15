import React, { useState } from 'react'
import { ROSTER, GAME_STATE, computeFatigueScore, getFatigueLabel } from './data/roster'
import PlayerCard from './components/PlayerCard'
import AIPanel from './components/AIPanel'
import CoachBoard from './components/CoachBoard'
import VideoOverlay from './components/VideoOverlay'
import { useClaudeAdvisor } from './hooks/useClaudeAdvisor'
import { useLiveGame } from './hooks/useLiveGame'

// ── Shared styles ─────────────────────────────────────────────
const S = {
  layout: { maxWidth: '480px', margin: '0 auto', minHeight: '100vh', background: 'var(--c-bg)', display: 'flex', flexDirection: 'column' },
  topBar: { background: 'var(--c-surface)', borderBottom: '1px solid var(--c-border)', padding: '10px 16px 8px' },
  scoreboard: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' },
  teamName: { fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' },
  score: { fontFamily: 'var(--font-display)', fontSize: '32px', fontWeight: 800, color: 'var(--c-accent)' },
  gameMeta: { display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--c-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' },
  content: { flex: 1, padding: '16px', overflowY: 'auto' },
  sectionTitle: { fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--c-muted)', marginBottom: '10px', marginTop: '16px' },
  btn: { width: '100%', padding: '13px', borderRadius: '8px', fontWeight: 600, fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'opacity 0.15s' },
  tabBar: { display: 'flex', background: 'var(--c-surface)', borderTop: '1px solid var(--c-border)', padding: '6px 0 10px', flexWrap: 'nowrap', overflowX: 'auto' },
  tab: { flex: '0 0 auto', minWidth: '60px', padding: '4px 8px', background: 'transparent', color: 'var(--c-muted)', fontSize: '9px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' },
  tabActive: { color: 'var(--c-accent)' },
  input: { width: '100%', background: 'var(--c-surface2)', border: '1px solid var(--c-border)', borderRadius: '8px', padding: '10px 12px', color: 'var(--c-ink)', fontSize: '13px', fontFamily: 'var(--font-body)', outline: 'none', marginTop: '6px' },
  labelText: { fontSize: '12px', color: 'var(--c-muted)', fontWeight: 500 },
  alertCard: { background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '8px', padding: '12px 14px', marginBottom: '8px', display: 'flex', gap: '10px', alignItems: 'flex-start' },
}

// ── Live badge ────────────────────────────────────────────────
function LiveBadge({ isLive }) {
  if (!isLive) return null
  return (
    <span style={{ fontSize: '10px', fontWeight: 700, background: '#ef4444', color: '#fff', borderRadius: '4px', padding: '2px 6px', letterSpacing: '0.5px', marginLeft: '6px', verticalAlign: 'middle' }}>
      LIVE
    </span>
  )
}

// ── Team selector ─────────────────────────────────────────────
function TeamSelector({ game, myTeamId, onSelect }) {
  if (!game) return null
  return (
    <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
      {[game.home, game.away].filter(Boolean).map(t => (
        <button
          key={t.id}
          onClick={() => onSelect(t.id)}
          style={{ flex: 1, padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, background: t.id === myTeamId ? 'var(--c-accent)' : 'var(--c-surface2)', color: t.id === myTeamId ? '#fff' : 'var(--c-muted)', border: '1px solid var(--c-border)' }}
        >
          {t.abbr}
        </button>
      ))}
    </div>
  )
}

// ── Scoreboard ────────────────────────────────────────────────
function Scoreboard({ gs, isLive, game, myTeamId, onSelectTeam, loading }) {
  return (
    <div style={S.topBar}>
      <div style={S.scoreboard}>
        <div style={{ ...S.teamName, color: 'var(--c-accent2)' }}>
          {gs.homeTeam}
          {isLive && myTeamId === game?.home?.id && <LiveBadge isLive />}
        </div>
        <div style={S.score}>
          {gs.homeScore} <span style={{ color: 'var(--c-muted)', fontSize: '22px' }}>–</span> {gs.awayScore}
        </div>
        <div style={{ ...S.teamName, color: 'var(--c-muted)', textAlign: 'right' }}>
          {gs.awayTeam}
          {isLive && myTeamId === game?.away?.id && <LiveBadge isLive />}
        </div>
      </div>
      <div style={S.gameMeta}>
        <span>Q{gs.quarter} &nbsp; {gs.timeRemaining} {loading && <span>· syncing…</span>}</span>
        <span>TO: {gs.homeTeam} {gs.timeouts.home} | {gs.awayTeam} {gs.timeouts.away}</span>
      </div>
      {game && <TeamSelector game={game} myTeamId={myTeamId} onSelect={onSelectTeam} />}
    </div>
  )
}

// ── Fatigue Screen ────────────────────────────────────────────
function FatigueScreen({ apiKey, roster, gameState, onToggleFloor }) {
  const { loading, result, error, confidence, getRecommendation, clear } = useClaudeAdvisor()
  const sorted = [...roster].sort((a, b) => computeFatigueScore(b) - computeFatigueScore(a))
  const onFloor = sorted.filter(p => p.onFloor)
  const bench   = sorted.filter(p => !p.onFloor)
  const highRisk = onFloor.filter(p => computeFatigueScore(p) >= 55)

  return (
    <div style={S.content}>
      <div style={{ fontSize: '11px', color: 'var(--c-muted)', marginBottom: '10px' }}>
        Tap a jersey number to mark a player on/off the floor after substitutions.
      </div>
      {highRisk.length > 0 && (
        <div style={S.alertCard}>
          <span style={{ fontSize: '18px' }}>⚠️</span>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--c-danger)', marginBottom: '2px' }}>Fatigue Alert</div>
            <div style={{ fontSize: '12px', color: 'var(--c-muted)' }}>
              {highRisk.map(p => p.name.split(' ')[0]).join(', ')} showing elevated fatigue. Consider rotation.
            </div>
          </div>
        </div>
      )}
      <div style={S.sectionTitle}>On Floor</div>
      {onFloor.length ? onFloor.map(p => <PlayerCard key={p.id} player={p} highlight={computeFatigueScore(p) >= 55} onToggleFloor={() => onToggleFloor(p.id)} />) : <div style={{ color: 'var(--c-muted)', fontSize: '13px' }}>No on-floor data yet.</div>}
      <div style={S.sectionTitle}>Bench</div>
      {bench.map(p => <PlayerCard key={p.id} player={p} onToggleFloor={() => onToggleFloor(p.id)} />)}
      <button
        style={{ ...S.btn, background: loading ? 'var(--c-surface2)' : 'var(--c-accent)', color: 'white', marginTop: '16px', opacity: loading ? 0.7 : 1 }}
        onClick={() => getRecommendation(roster, gameState, 'substitution', apiKey)}
        disabled={loading}
      >
        {loading ? '⏳ Analyzing...' : '🤖 Get Sub Recommendation'}
      </button>
      <AIPanel loading={loading} result={result} error={error} confidence={confidence} onClear={clear} />
    </div>
  )
}

// ── Timeout Screen ────────────────────────────────────────────
function TimeoutScreen({ apiKey, roster, gameState }) {
  const { loading, result, error, confidence, getRecommendation, clear } = useClaudeAdvisor()
  const trailingBy = gameState.awayScore - gameState.homeScore

  return (
    <div style={S.content}>
      <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: '10px', padding: '20px', textAlign: 'center', marginBottom: '16px' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '48px', fontWeight: 800, color: 'var(--c-accent)' }}>
          {gameState.timeouts.home}
        </div>
        <div style={{ color: 'var(--c-muted)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Timeouts Remaining</div>
        <div style={{ marginTop: '12px', fontSize: '13px', color: trailingBy > 0 ? 'var(--c-danger)' : 'var(--c-success)' }}>
          {trailingBy > 0 ? `Trailing by ${trailingBy}` : trailingBy < 0 ? `Leading by ${Math.abs(trailingBy)}` : 'Tied'} with {gameState.timeRemaining} in Q{gameState.quarter}
        </div>
      </div>
      <button
        style={{ ...S.btn, background: loading ? 'var(--c-surface2)' : 'var(--c-accent2)', color: 'white', opacity: loading ? 0.7 : 1 }}
        onClick={() => getRecommendation(roster, gameState, 'timeout', apiKey)}
        disabled={loading}
      >
        {loading ? '⏳ Analyzing...' : '🤖 Should I Call Timeout?'}
      </button>
      <AIPanel loading={loading} result={result} error={error} confidence={confidence} onClear={clear} />
    </div>
  )
}

// ── Play Call Screen ──────────────────────────────────────────
function PlayCallScreen({ apiKey, roster, gameState }) {
  const { loading, result, error, confidence, getRecommendation, clear } = useClaudeAdvisor()
  const plays = [
    { key: 'iso',    label: 'ISO',         icon: '🏀', desc: 'Isolation for your scorer' },
    { key: 'pnr',    label: 'Pick & Roll', icon: '🔄', desc: 'Ball handler + big screen' },
    { key: 'motion', label: 'Motion',      icon: '↔️', desc: 'Continuity ball movement' },
    { key: 'set',    label: 'Set Play',    icon: '📋', desc: 'Designed out-of-bounds play' },
    { key: 'zone',   label: 'Zone Attack', icon: '🎯', desc: 'Attack gap in zone defense' },
  ]

  return (
    <div style={S.content}>
      <div style={S.sectionTitle}>Play Types</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
        {plays.map(p => (
          <div key={p.key} style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: '8px', padding: '12px' }}>
            <div style={{ fontSize: '22px', marginBottom: '4px' }}>{p.icon}</div>
            <div style={{ fontWeight: 700, fontSize: '13px' }}>{p.label}</div>
            <div style={{ fontSize: '11px', color: 'var(--c-muted)', marginTop: '2px' }}>{p.desc}</div>
          </div>
        ))}
      </div>
      <button
        style={{ ...S.btn, background: loading ? 'var(--c-surface2)' : 'var(--c-success)', color: 'white', opacity: loading ? 0.7 : 1 }}
        onClick={() => getRecommendation(roster, gameState, 'playCall', apiKey)}
        disabled={loading}
      >
        {loading ? '⏳ Analyzing...' : '🤖 Recommend a Play'}
      </button>
      <AIPanel loading={loading} result={result} error={error} confidence={confidence} onClear={clear} />
    </div>
  )
}

// ── Settings Screen ───────────────────────────────────────────
function SettingsScreen({ apiKey, setApiKey }) {
  const [draft, setDraft] = useState(apiKey)
  const [saved, setSaved] = useState(false)

  function save() {
    setApiKey(draft)
    localStorage.setItem('hm_api_key', draft)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div style={S.content}>
      <div style={{ ...S.sectionTitle, marginTop: 0 }}>API Configuration</div>
      <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
        <div style={S.labelText}>Anthropic API Key</div>
        <input style={S.input} type="password" placeholder="sk-ant-..." value={draft} onChange={e => setDraft(e.target.value)} />
        <div style={{ fontSize: '11px', color: 'var(--c-muted)', marginTop: '8px' }}>
          Get your key at{' '}
          <a href="https://console.anthropic.com" target="_blank" rel="noreferrer" style={{ color: 'var(--c-accent2)' }}>
            console.anthropic.com
          </a>
          . Stored locally, never sent anywhere except the Anthropic API.
        </div>
        <button style={{ ...S.btn, background: saved ? 'var(--c-success)' : 'var(--c-accent)', color: 'white', marginTop: '12px' }} onClick={save}>
          {saved ? '✓ Saved!' : 'Save Key'}
        </button>
      </div>

      <div style={S.sectionTitle}>Live Data</div>
      <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: '10px', padding: '16px', fontSize: '13px', color: 'var(--c-muted)', lineHeight: 1.6 }}>
        <p>Live scores and box scores come from ESPN's public API — no key needed. Stats update every 30 seconds during live games.</p>
        <p style={{ marginTop: '8px' }}>Data available: minutes, points, fouls, FG, assists, turnovers, rebounds. Heart rate and sprint load require wearables (Catapult, WHOOP, Polar).</p>
      </div>

      <div style={{ ...S.sectionTitle, marginTop: '20px' }}>About HoopMind</div>
      <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: '10px', padding: '16px', fontSize: '13px', color: 'var(--c-muted)', lineHeight: 1.6 }}>
        <p>HoopMind is an AI sideline assistant for basketball coaches. AI recommendations are decision-support tools — always apply your coaching judgment.</p>
      </div>
    </div>
  )
}

// ── Tabs ──────────────────────────────────────────────────────
const TABS = [
  { key: 'fatigue',  label: 'Fatigue',  icon: '⚡' },
  { key: 'timeout',  label: 'Timeout',  icon: '⏱' },
  { key: 'plays',    label: 'Plays',    icon: '📋' },
  { key: 'board',    label: 'Board',    icon: '✏️' },
  { key: 'camera',   label: 'Camera',   icon: '📷' },
  { key: 'settings', label: 'Settings', icon: '⚙️' },
]

// ── Root App ──────────────────────────────────────────────────
export default function App() {
  const [tab,    setTab]    = useState('fatigue')
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('hm_api_key') || '')

  const { game, loading: liveLoading, myTeam, oppTeam, myTeamId, setMyTeamId } = useLiveGame()

  // Coach can manually toggle on/off floor after substitutions
  const [floorOverrides, setFloorOverrides] = useState({})
  function toggleFloor(playerId) {
    setFloorOverrides(prev => ({ ...prev, [playerId]: !(prev[playerId] ?? true) }))
  }

  // Reset overrides when team changes
  const prevTeamId = React.useRef(myTeamId)
  if (prevTeamId.current !== myTeamId) { prevTeamId.current = myTeamId; setFloorOverrides({}) }

  // Build unified data — live preferred, mock fallback; apply floor overrides
  const rawRoster = myTeam?.players?.length ? myTeam.players : ROSTER
  const roster = rawRoster.map(p => ({
    ...p,
    onFloor: floorOverrides.hasOwnProperty(p.id) ? floorOverrides[p.id] : p.onFloor,
  }))
  const gameState = game ? {
    homeTeam:      myTeam?.abbr  || game.home?.abbr || 'HOME',
    awayTeam:      oppTeam?.abbr || game.away?.abbr || 'AWAY',
    homeScore:     myTeam?.score  ?? 0,
    awayScore:     oppTeam?.score ?? 0,
    quarter:       game.quarter,
    timeRemaining: game.clock,
    possession:    'home',
    timeouts: {
      home: myTeam?.timeouts  ?? 3,
      away: oppTeam?.timeouts ?? 3,
    },
  } : GAME_STATE

  return (
    <div style={S.layout}>
      <Scoreboard
        gs={gameState}
        isLive={game?.isLive}
        game={game}
        myTeamId={myTeamId}
        onSelectTeam={setMyTeamId}
        loading={liveLoading}
      />

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {tab === 'fatigue'  && <FatigueScreen  apiKey={apiKey} roster={roster} gameState={gameState} onToggleFloor={toggleFloor} />}
        {tab === 'timeout'  && <TimeoutScreen  apiKey={apiKey} roster={roster} gameState={gameState} />}
        {tab === 'plays'    && <PlayCallScreen apiKey={apiKey} roster={roster} gameState={gameState} />}
        {tab === 'board'    && <CoachBoard roster={roster} />}
        {tab === 'camera'   && <VideoOverlay />}
        {tab === 'settings' && <SettingsScreen apiKey={apiKey} setApiKey={setApiKey} />}
      </div>

      <div style={S.tabBar}>
        {TABS.map(t => (
          <button key={t.key} style={{ ...S.tab, ...(tab === t.key ? S.tabActive : {}) }} onClick={() => setTab(t.key)}>
            <span style={{ fontSize: '18px' }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>
    </div>
  )
}
