import { useState, useEffect, useCallback } from 'react'

const ESPN = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba'
const POLL_MS = 30_000

function parseFraction(s) {
  const parts = String(s || '0-0').split('-').map(Number)
  return { made: parts[0] || 0, att: parts[1] || 0 }
}

// ESPN NBA box score stats array order (verified against live API):
// [0] MIN  [1] PTS  [2] FG  [3] 3PT  [4] FT
// [5] REB  [6] AST  [7] TO  [8] STL  [9] BLK
// [10] OREB [11] DREB [12] PF [13] +/-
function parseStats(arr) {
  if (!arr?.length) return {}
  const fg = parseFraction(arr[2])
  return {
    minutesPlayed: parseFloat(arr[0]) || 0,
    points:        parseInt(arr[1],  10) || 0,
    fgMade:        fg.made,
    fgAttempts:    fg.att,
    rebounds:      parseInt(arr[5],  10) || 0,
    assists:       parseInt(arr[6],  10) || 0,
    turnovers:     parseInt(arr[7],  10) || 0,
    fouls:         parseInt(arr[12], 10) || 0,
  }
}

async function fetchGame() {
  const sb = await fetch(`${ESPN}/scoreboard`).then(r => r.json())
  const events = sb.events || []
  if (!events.length) throw new Error('No NBA games today')

  const event = events.find(e => e.status?.type?.state === 'in') || events[0]
  const summary = await fetch(`${ESPN}/summary?event=${event.id}`).then(r => r.json())

  const comp = summary.header?.competitions?.[0]
  const status = comp?.status || {}

  const teams = (summary.boxscore?.teams || []).map(te => {
    const athletes = (te.athletes || [])
      .flatMap(g => Array.isArray(g.athletes) ? g.athletes : [g])
      .filter(a => a?.athlete?.id)

    const players = athletes.map((a, i) => ({
      id: a.athlete.id,
      name: a.athlete.displayName || `Player ${i + 1}`,
      number: a.athlete.jersey || String(i + 1),
      position: a.athlete.position?.abbreviation || 'G',
      onFloor: a.starter === true,
      restMinutes: 0,
      sprintCount: 0,
      heartRateProxy: 0,
      ...parseStats(a.stats),
    }))

    const competitor = comp?.competitors?.find(c => c.team?.id === te.team?.id)
    return {
      id: te.team?.id,
      name: te.team?.displayName || 'Team',
      abbr: te.team?.abbreviation || 'TM',
      score: parseInt(competitor?.score || 0, 10),
      homeAway: te.homeAway,
      timeouts: parseInt(competitor?.timeoutsRemaining ?? 3, 10),
      players,
    }
  })

  const home = teams.find(t => t.homeAway === 'home') || teams[0]
  const away = teams.find(t => t.homeAway === 'away') || teams[1]

  return {
    eventId: event.id,
    isLive: status.type?.state === 'in',
    isComplete: !!status.type?.completed,
    home,
    away,
    quarter: status.period || 1,
    clock: status.displayClock || '0:00',
    timeouts: { home: home?.timeouts ?? 3, away: away?.timeouts ?? 3 },
  }
}

export function useLiveGame() {
  const [game, setGame] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [myTeamId, setMyTeamId] = useState(null)

  const refresh = useCallback(async () => {
    try {
      const data = await fetchGame()
      setGame(data)
      setError(null)
      if (!myTeamId && data.home?.id) setMyTeamId(data.home.id)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [myTeamId])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, POLL_MS)
    return () => clearInterval(id)
  }, [refresh])

  const myTeam  = game ? (game.home?.id === myTeamId ? game.home  : game.away)  : null
  const oppTeam = game ? (game.home?.id === myTeamId ? game.away  : game.home)  : null

  return { game, loading, error, refresh, myTeamId, setMyTeamId, myTeam, oppTeam }
}
