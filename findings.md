# Findings & Decisions

## Requirements
- Maintain two repositories:
  - Private Development: `https://github.com/faizanebahoochaudhry/portfolio.git`
  - Public Showcase: `https://github.com/faizanebahoochaudhry/my-portfolio.git`
- Private Repository:
  - Development and Vercel deployment.
  - Branches: `main`, `development`, `feature/*`.
  - Include: Full source, all branches/commits, internal docs, plans, design assets, lock files.
  - Do NOT commit: `.env`, API keys, credentials, private certificates.
- Public Repository:
  - Showcase for recruiters/clients.
  - Clean production-ready code.
  - Branches: `main` only.
  - Include: Clean source code, components, pages, public assets, README.md, screenshots, setup instructions.
  - Remove: Internal notes, planning documents (like task_plan.md, findings.md, progress.md), experimental branches, draft content, dev scripts, secrets.
- Public README.md Requirements:
  - About: Short intro about Faizan e Bahoo Chaudhry.
  - Live Website: Vercel deployment link.
  - Tech Stack: Next.js, React, TypeScript, Tailwind CSS, Vercel.
  - Features: List major portfolio features.
  - Local Setup: Installation instructions (`git clone`, `npm install`, `npm run dev`).
  - Contact: Portfolio link, LinkedIn link, Email.

## Research Findings
- The directory `/home/technotaurus/Public/My Portfolio/Website` is NOT a Git repository yet.
- Target Private Remote: `https://github.com/faizanebahoochaudhry/portfolio.git`
- Target Public Remote: `https://github.com/faizanebahoochaudhry/my-portfolio.git`

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| Sibling directory `my-portfolio` | Prevents local contamination of git configurations and ensures public repository folder is clean of planning docs |

## Issues Encountered
| Issue | Resolution |
|-------|------------|
|       |            |

## Resources
- Workspace: `/home/technotaurus/Public/My Portfolio/Website`
