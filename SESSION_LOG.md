# DYNA OS - Session Log

## Project Overview
**DYNA OS** is a fitness/life tracking PWA (Progressive Web App) with a retro CRT terminal aesthetic, inspired by Fallout terminals.

**Live URL:** https://dyna-os.vercel.app
**GitHub:** https://github.com/Dylithub/dyna-os

---

## Tech Stack
| Component | Technology |
|-----------|------------|
| Framework | Next.js 16 (App Router) |
| Database | Turso (cloud SQLite) |
| ORM | Drizzle |
| Auth | NextAuth v5 (GitHub + Google OAuth) |
| PWA | Serwist (service worker) |
| Styling | Tailwind CSS |
| Hosting | Vercel |

---

## Features / Tabs

### TODAY
- Daily overview dashboard
- Philosophy quote of the day
- Weekly contract progress (exercise sessions)
- Weekly nutrition summary
- Weekly check-in averages
- Action items (check-in, calories, weigh-in status)

### CONTRACTS
- Weekly exercise tracking
- Zone 2 cardio: 4 sessions x 40 min
- Strength training: 3 sessions
  - Arms
  - Legs
  - Core / Back / Chest

### WEIGH-IN
- Log weight entries with date
- Weekly trend calculation
- Recent entries list with delete

### CALORIES
- Daily calories and protein tracking
- Weekly grid (Mon-Sun)
- Weekly averages vs targets (2000 kcal, 180g protein)

### FINANCES
- Daily spending tracker
- Targets: $50/day Mon-Fri, $75/day Sat-Sun ($400/week)
- Weekly summary with over/under budget
- Remaining budget recalculation based on overspend
- Adjusted daily allowance for remaining days

### CHECK-IN
- Daily mood/energy/calm rating (1-5 scale)
- Optional notes
- Today's summary

### SETTINGS
- Account info (signed-in user)
- Sync now button
- Data summary (version, day logs, week logs, etc.)
- Export/Import JSON data
- Sign out

---

## Visual Design
- CRT monitor effect (Fallout-style):
  - Vignette (darker corners)
  - Scanlines overlay
  - Ambient phosphor glow that pulses
- Green terminal colors (#20c20e)
- No text glow/shadows (removed for cleaner look)
- Monospace font (Courier New)

---

## Cloud Infrastructure

### Database (Turso)
- URL: `libsql://dyna-os-dylithub.aws-ap-northeast-1.turso.io`
- Tables: users, accounts, sessions, verification_tokens, day_logs, week_logs, weight_entries, daily_selections

### Authentication
- **GitHub OAuth:** Configured in GitHub Developer Settings
- **Google OAuth:** Configured in Google Cloud Console
- Callback URLs:
  - `https://dyna-os.vercel.app/api/auth/callback/github`
  - `https://dyna-os.vercel.app/api/auth/callback/google`
  - Also localhost versions for local dev

### Vercel Environment Variables
- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`
- `AUTH_SECRET`
- `AUTH_URL` (https://dyna-os.vercel.app)
- `AUTH_GITHUB_ID`
- `AUTH_GITHUB_SECRET`
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`

---

## Data Sync
- Data saves to localStorage first (offline support)
- When logged in, syncs to Turso cloud database
- Offline changes queue and sync when back online
- Each user has their own separate data

---

## Files Structure
```
src/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/  # NextAuth handler
│   │   ├── sync/                # Data sync endpoint
│   │   ├── day-logs/
│   │   ├── week-logs/
│   │   ├── weight-entries/
│   │   └── daily-selections/
│   ├── login/page.tsx           # Login page
│   ├── page.tsx                 # Main app (tabs)
│   ├── layout.tsx
│   └── globals.css              # CRT effects, theme
├── components/
│   ├── tabs/
│   │   ├── TodayTab.tsx
│   │   ├── ContractsTab.tsx
│   │   ├── WeighInTab.tsx
│   │   ├── CaloriesTab.tsx
│   │   ├── FinancesTab.tsx      # Added this session
│   │   ├── CheckInTab.tsx
│   │   └── SettingsTab.tsx
│   ├── TerminalButton.tsx
│   ├── TerminalCard.tsx
│   ├── SyncIndicator.tsx
│   └── InstallPrompt.tsx
├── db/
│   ├── index.ts                 # Drizzle client
│   └── schema.ts                # Database schema
└── lib/
    ├── auth.ts                  # NextAuth config
    ├── types.ts                 # TypeScript types
    ├── storage.ts               # localStorage + helpers
    ├── useLifeOS.ts             # Main data hook
    ├── sync-transform.ts        # DB <-> Client transforms
    ├── api-client.ts
    ├── api-auth.ts
    └── dates.ts
```

---

## Changes Made This Session

1. **Fixed GitHub OAuth** - Added client ID and secret to .env.local
2. **Fixed Google OAuth** - Added client ID and secret to .env.local
3. **Fixed Auth Database** - Updated DrizzleAdapter to use correct table mappings
4. **CRT Monitor Effect** - Replaced text glow with ambient Fallout-style CRT effect (vignette, scanlines, phosphor glow)
5. **Added Finances Tab** - Daily spending tracker with weekly targets and overspend recalculation
6. **Set up Turso Cloud** - Migrated from local SQLite to Turso cloud database
7. **Deployed to Vercel** - App is live at https://dyna-os.vercel.app
8. **Updated OAuth callbacks** - Added production URLs to GitHub and Google OAuth
9. **Fixed strength labels** - Changed to "Arms", "Legs", "Core / Back / Chest"

---

## To Add Other Users (Google)
Google OAuth is in "Testing" mode. Options:
1. Add test users in Google Cloud Console → OAuth consent screen → Test users
2. Publish the app (users will see "unverified app" warning but can proceed)

GitHub login works for anyone already.

---

## Local Development
```bash
cd "C:\Users\chees\.claude\projects\DYNA OS\dyna-os"
npm run dev
# Open http://localhost:3000
```

## Pushing Changes
```bash
git add -A
git commit -m "Your message"
git push
# Vercel auto-deploys from main branch
```

---

## Potential Future Enhancements
- Custom domain
- Finance categories/monthly reports
- Push notifications
- Data visualization/charts
- Dark/light theme toggle
- More detailed reporting
