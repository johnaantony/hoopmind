import { useState } from 'react'
import { computeFatigueScore, getFatigueLabel } from '../data/roster'

// Builds a structured prompt for Claude — designed to produce calibrated, 
// uncertainty-aware recommendations rather than overconfident outputs.
function buildFatiguePrompt(players, gameState, queryType) {
  const playerSummaries = players.map((p) => {
    const fatigue = computeFatigueScore(p)
    const { label } = getFatigueLabel(fatigue)
    return `- ${p.name} (#${p.number}, ${p.position}): ${p.minutesPlayed} min played, ${p.fouls} fouls, fatigue score ${fatigue}/100 (${label}), rest last ${p.restMinutes} min, ${p.sprintCount} sprints`
  })

  const situationContext = `
Game: ${gameState.homeTeam} ${gameState.homeScore} vs ${gameState.awayTeam} ${gameState.awayScore}
Quarter: Q${gameState.quarter}, ${gameState.timeRemaining} remaining
Timeouts left — ${gameState.homeTeam}: ${gameState.timeouts.home}, ${gameState.awayTeam}: ${gameState.timeouts.away}
We are ${gameState.homeScore > gameState.awayScore ? 'leading' : 'trailing'} by ${Math.abs(gameState.homeScore - gameState.awayScore)} points.
`

  const prompts = {
    substitution: `You are an AI assistant helping a basketball coach make a substitution decision.

${situationContext}

On-floor players (current 5):
${playerSummaries.filter((_, i) => players[i].onFloor).join('\n')}

Available bench players:
${playerSummaries.filter((_, i) => !players[i].onFloor).join('\n')}

Analyze the fatigue and game situation. Provide:
1. Your top substitution recommendation (player OUT → player IN) with clear reasoning
2. A CONFIDENCE level: High / Medium / Low — and explain why
3. Any UNCERTAINTY factors that could change this recommendation
4. One alternative option if the coach disagrees

Be direct but honest about limitations. Do not guess at information you don't have. Keep it under 120 words.`,

    timeout: `You are an AI assistant helping a basketball coach decide whether to call a timeout.

${situationContext}

Timeouts remaining: ${gameState.timeouts.home}

Key considerations: score differential, time remaining, momentum, fatigue of on-floor players.

On-floor fatigue summary:
${playerSummaries.filter((_, i) => players[i].onFloor).join('\n')}

Provide:
1. CALL TIMEOUT or HOLD — with a one-sentence reason
2. CONFIDENCE: High / Medium / Low
3. What would change your recommendation

Under 80 words.`,

    playCall: `You are helping a basketball coach pick a play type for the next possession.

${situationContext}

Score: trailing by ${Math.abs(gameState.homeScore - gameState.awayScore)}, Q${gameState.quarter}, ${gameState.timeRemaining} left.

Recommend one of: ISO, Pick-and-Roll, Motion Offense, Set Play (SLOB/BLOB), Zone Attack.
Give a reason, confidence level (High/Medium/Low), and what you'd do if primary option fails.

Under 80 words. Be direct.`,
  }

  return prompts[queryType] || prompts.substitution
}

export function useClaudeAdvisor() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [confidence, setConfidence] = useState(null)

  async function getRecommendation(players, gameState, queryType = 'substitution', apiKey) {
    if (!apiKey) {
      setError('No API key provided. Add your Anthropic API key in Settings.')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    const prompt = buildFatiguePrompt(players, gameState, queryType)

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-allow-browser': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 400,
          messages: [{ role: 'user', content: prompt }],
        }),
      })

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData?.error?.message || `API error ${response.status}`)
      }

      const data = await response.json()
      const text = data.content?.[0]?.text || ''

      // Parse confidence level from response
      const confMatch = text.match(/confidence[:\s]+(high|medium|low)/i)
      if (confMatch) {
        setConfidence(confMatch[1].toLowerCase())
      } else {
        setConfidence('medium') // default when not stated
      }

      setResult(text)
    } catch (err) {
      setError(err.message || 'Something went wrong. Check your API key and try again.')
    } finally {
      setLoading(false)
    }
  }

  function clear() {
    setResult(null)
    setError(null)
    setConfidence(null)
  }

  return { loading, result, error, confidence, getRecommendation, clear }
}
