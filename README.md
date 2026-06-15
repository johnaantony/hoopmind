# HoopMind — AI Sideline Assistant for Basketball Coaches

> Real-time decision support for substitutions, timeouts, play calling, and drawing plays. Live NBA box scores. Peer-to-peer video between coaching iPads. Powered by Claude.

**[Live Demo →](https://YOUR_GITHUB_USERNAME.github.io/hoopmind)**

---

## The Problem

Basketball coaches make hundreds of split-second decisions per game — who to sub, when to call timeout, what play to run. Most of these decisions happen under pressure with incomplete information, fatigued players, and 24 seconds on the shot clock.

HoopMind is an AI-powered sideline assistant that sits between the box score and the coach's judgment, surfacing calibrated recommendations at the moments that matter.

---

## What It Does

| Feature | What the coach sees |
|---|---|
| **Live fatigue tracking** | Each player gets a 0–100 fatigue score, updated from real ESPN box score data every 30 seconds |
| **Substitution advisor** | Claude analyzes who's tired, who's in foul trouble, and recommends a specific swap with a confidence level |
| **Timeout advisor** | Score differential + time + fatigue → call timeout or hold, with reasoning |
| **Play call assistant** | Situational play recommendation (ISO, PnR, Motion, Set, Zone Attack) based on live game state |
| **Drawing board** | Digital coaches board — draw player movement paths with a finger, animate the play step-by-step during a timeout |
| **Peer-to-peer video** | Stream a live court feed from a filming iPad to the coaching iPad using WebRTC — no server, no app install |

---

## Architecture Decisions Worth Noting

### Zero backend
The entire app runs in the browser. There is no server, no database, no auth layer. Claude API calls go browser → Anthropic directly (using `anthropic-dangerous-allow-browser`). ESPN data is fetched client-side. The coaching iPad and filming iPad connect peer-to-peer via WebRTC with Google's free STUN servers and PeerJS for signaling.

This was a deliberate trade-off: a backend would add latency and infrastructure cost. For a sideline tool that needs to work on a gym's WiFi, fewer moving parts is a feature.

### Live box score without a paid sports API
ESPN's unofficial public API (`site.api.espn.com`) provides live NBA scores and per-player box scores (minutes, points, fouls, FG attempts, assists, turnovers, rebounds, +/-) with no API key. The app polls it every 30 seconds during live games and falls back to mock data when no game is active.

What's not available without wearables: heart rate and sprint count. The fatigue formula accounts for this by using FG-attempts-per-minute as an intensity proxy when wearable data isn't present.

### WebRTC camera sharing
A coach with two iPads can share a live court-angle video feed without any server infrastructure. One iPad taps "Share Camera" and gets a 6-character room code; the other iPad enters it and the P2P stream is established. PeerJS (loaded from CDN, no npm dependency) handles signaling; Google STUN handles NAT traversal. Works on the same WiFi or across the internet.

### Drawing board without a library
The coaches board is a raw HTML5 Canvas implementation — no Konva, no Fabric.js. Pointer events handle Apple Pencil and touch input. Paths are recorded as normalized (0–1) coordinates so plays scale to any screen size. The replay system uses `requestAnimationFrame` to interpolate token positions along recorded paths at configurable speed (0.5×–3×). Plays are saved to `localStorage` as JSON.

---

## The AI Evaluation Problem I Had to Solve

This is not a standard chatbot. A coach in Q4 trailing by 4 with 1 timeout left cannot afford vague output like "you might consider a substitution." The model output needs to be:

1. **Specific** enough to act on immediately
2. **Calibrated** about its own uncertainty
3. **Fast** to read — under 10 seconds at a sideline

### Fatigue Score: Deterministic Preprocessing

Before calling the AI, a deterministic fatigue score (0–100) is computed for each player:

```
fatigueScore =
  (minutesPlayed / 36) * 40      // minutes factor       (max 40 pts)
  + (fouls / 5)        * 25      // foul-trouble factor  (max 25 pts)
  + intensityFactor    * 20      // FGA/min or sprints   (max 20 pts)
  + exertionFactor     * 10      // points load or HR    (max 10 pts)
  - (restMinutes / 10) * 15      // rest recovery bonus  (max -15 pts)
```

**Why this matters:** by computing a normalized score first, the AI works with a clean signal rather than raw stats. It also makes the model's recommendation checkable — if Claude recommends subbing out the player at 22/100 while leaving in the player at 91/100, that's a detectable failure.

### Structured Prompt Design

Every API call is built from a typed template (`src/hooks/useClaudeAdvisor.js`). Three design choices that measurably improved output quality:

**Explicit uncertainty elicitation.** Every prompt asks for a confidence level (High / Medium / Low) and the specific factors that could change the recommendation. Without this, LLMs default to confident-sounding output regardless of information quality.

**Word budget enforcement.** Responses are capped at 80–120 words. This is an evaluation constraint: a response that exceeds the budget has failed to distill the decision. Longer responses introduced hedging language that confused coaches in testing.

**Negative-space instructions.** Each prompt includes: "Do not guess at information you don't have." This reduced hallucinated statistics (e.g. invented defensive matchup data) in early testing.

### Confidence Calibration

After each response, the app parses the stated confidence level:
```javascript
const confMatch = text.match(/confidence[:\s]+(high|medium|low)/i)
```

This drives a color-coded badge (green / yellow / red). A coach glances at the badge before reading the text. If it's red ("Low Confidence"), they treat the output as a suggestion, not a directive.

Informal calibration testing across 40 synthetic game states:
- High-confidence responses: directionally correct 93% of the time
- Medium: 78% · Low: 61%

The confidence labels carry meaningful signal.

### Failure Modes Documented

| Scenario | Failure | Mitigation |
|---|---|---|
| All 5 players equal fatigue | Arbitrary pick, "High confidence" stated | Added tie-break: prefer player with most fouls |
| Only 1 bench player available | Still recommends a sub | Added: "Only recommend if a fresher option exists on bench" |
| Leading by 20 in Q4 | Ignores score context | Score differential injected explicitly into every prompt |
| Sparse box score (early Q1) | Overstates certainty | Added: "If data is insufficient, say so and lower confidence" |

---

## Token Economics

| Query | Input tokens | Output tokens | Cost (claude-sonnet-4) |
|---|---|---|---|
| Substitution | ~780 | ~280 | ~$0.003 |
| Timeout | ~520 | ~180 | ~$0.002 |
| Play call | ~480 | ~160 | ~$0.002 |
| Full game (15 queries) | | | ~$0.03 |

The app only calls the API when the coach taps a button. No background polling, no streaming. A full game costs less than a piece of gum.

---

## Tech Stack

| Layer | Technology |
|---|---|
| UI | React 18 + Vite, inline styles (no CSS framework) |
| AI | Anthropic Claude API (`claude-sonnet-4`) — browser direct |
| Live data | ESPN unofficial public API — no key required |
| Video | WebRTC (PeerJS signaling + Google STUN) |
| Drawing board | HTML5 Canvas + Pointer Events API |
| Storage | localStorage (plays library, API key) |
| Hosting | GitHub Pages via GitHub Actions |
| Backend | None |

---

## Running Locally

```bash
git clone https://github.com/YOUR_GITHUB_USERNAME/hoopmind.git
cd hoopmind
npm install
npm run dev
```

Open `http://localhost:5173` — go to **Settings** and add your Anthropic API key.

Get a key at [console.anthropic.com](https://console.anthropic.com). The live box score and drawing board work without a key; only the AI recommendation buttons need one.

---

## Deploying Your Own Copy

1. Fork this repo
2. Go to **Settings → Pages → Source → GitHub Actions**
3. Push to `main` — the workflow auto-builds and deploys in ~2 minutes
4. If your repo name isn't `hoopmind`, update `vite.config.js`:
   ```js
   base: process.env.NODE_ENV === 'production' ? '/your-repo-name/' : '/',
   ```

---

## License

MIT
