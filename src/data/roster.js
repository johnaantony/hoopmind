// Mock roster data — in production this would come from a wearables API or manual entry
export const ROSTER = [
  {
    id: 1,
    name: 'Marcus Williams',
    number: 3,
    position: 'PG',
    minutesPlayed: 28,
    fouls: 3,
    points: 14,
    assists: 7,
    turnovers: 2,
    fgAttempts: 12,
    fgMade: 6,
    restMinutes: 2,
    heartRateProxy: 88, // % of max HR (simulated from hustle stats)
    sprintCount: 41,
    onFloor: true,
  },
  {
    id: 2,
    name: 'DeShawn Carter',
    number: 11,
    position: 'SG',
    minutesPlayed: 24,
    fouls: 2,
    points: 19,
    assists: 2,
    turnovers: 1,
    fgAttempts: 16,
    fgMade: 8,
    restMinutes: 6,
    heartRateProxy: 72,
    sprintCount: 35,
    onFloor: true,
  },
  {
    id: 3,
    name: 'Tyrese Jordan',
    number: 24,
    position: 'SF',
    minutesPlayed: 30,
    fouls: 4,
    points: 8,
    assists: 1,
    turnovers: 3,
    fgAttempts: 10,
    fgMade: 3,
    restMinutes: 0,
    heartRateProxy: 95,
    sprintCount: 52,
    onFloor: true,
  },
  {
    id: 4,
    name: 'Khalil Brown',
    number: 32,
    position: 'PF',
    minutesPlayed: 22,
    fouls: 1,
    points: 11,
    assists: 3,
    turnovers: 0,
    fgAttempts: 9,
    fgMade: 5,
    restMinutes: 8,
    heartRateProxy: 65,
    sprintCount: 28,
    onFloor: true,
  },
  {
    id: 5,
    name: 'James Okafor',
    number: 45,
    position: 'C',
    minutesPlayed: 26,
    fouls: 3,
    points: 12,
    assists: 1,
    turnovers: 1,
    fgAttempts: 8,
    fgMade: 6,
    restMinutes: 4,
    heartRateProxy: 80,
    sprintCount: 22,
    onFloor: true,
  },
  {
    id: 6,
    name: 'Rico Sanchez',
    number: 7,
    position: 'PG',
    minutesPlayed: 8,
    fouls: 0,
    points: 4,
    assists: 2,
    turnovers: 1,
    fgAttempts: 4,
    fgMade: 2,
    restMinutes: 20,
    heartRateProxy: 45,
    sprintCount: 12,
    onFloor: false,
  },
  {
    id: 7,
    name: 'Trevor Hall',
    number: 21,
    position: 'SF',
    minutesPlayed: 6,
    fouls: 1,
    points: 2,
    assists: 0,
    turnovers: 0,
    fgAttempts: 2,
    fgMade: 1,
    restMinutes: 22,
    heartRateProxy: 40,
    sprintCount: 8,
    onFloor: false,
  },
]

export const GAME_STATE = {
  homeTeam: 'Hawks',
  awayTeam: 'Wolves',
  homeScore: 67,
  awayScore: 71,
  quarter: 4,
  timeRemaining: '4:23',
  possession: 'home',
  timeouts: { home: 1, away: 2 },
}

// Fatigue score: 0-100. Higher = more fatigued.
// Works with live ESPN data (no wearables) or full wearable data.
export function computeFatigueScore(player) {
  const minutesFactor = Math.min(player.minutesPlayed / 36, 1) * 40
  const foulFactor    = Math.min(player.fouls / 5, 1) * 25
  // Prefer sprint count (wearables); fall back to FGA-per-minute as intensity proxy
  const effortFactor  = player.sprintCount > 0
    ? Math.min(player.sprintCount / 55, 1) * 20
    : Math.min((player.fgAttempts / Math.max(player.minutesPlayed, 1)) * 6, 1) * 20
  // HR factor when wearable data available, else scoring load proxy
  const hrFactor      = player.heartRateProxy > 0
    ? (player.heartRateProxy / 100) * 15
    : Math.min(player.points / 30, 1) * 10
  const restBonus     = Math.min(player.restMinutes / 10, 1) * 15
  const raw = minutesFactor + foulFactor + effortFactor + hrFactor - restBonus
  return Math.round(Math.max(0, Math.min(100, raw)))
}

export function getFatigueLabel(score) {
  if (score < 30) return { label: 'Fresh', color: 'var(--c-low)', level: 0 }
  if (score < 55) return { label: 'Moderate', color: 'var(--c-med)', level: 1 }
  if (score < 75) return { label: 'High', color: 'var(--c-high)', level: 2 }
  return { label: 'Critical', color: 'var(--c-crit)', level: 3 }
}
