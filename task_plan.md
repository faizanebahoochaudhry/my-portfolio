# Task Plan: Portfolio Repository Structure & Deployment Workflow

## Goal
Establish a two-repository Git and deployment system for the portfolio website: a private development repository (`portfolio.git`) and a public showcase repository (`my-portfolio.git`), keeping planning documents, credentials, and development-only details private.

## Current Phase
Phase 2: Remote Configuration & Private Push

## Phases

### Phase 1: Discovery & Local Git Setup
- [x] Inspect existing files in `Website/`
- [x] Initialize local Git repository in `Website/`
- [x] Set up `.gitignore` for private files (`.env`, planning files, node_modules)
- [x] Commit initial repository state on a `main` branch
- [x] Create `development` branch
- **Status:** complete

### Phase 2: Remote Configuration & Private Push
- [ ] Set private remote: `https://github.com/faizanebahoochaudhry/portfolio.git`
- [ ] Push local branches (`main` and `development`) to private repository
- - **Status:** in_progress

### Phase 3: Public Repository Setup & Prep
- [ ] Create `my-portfolio` sibling folder for clean public-facing version
- [ ] Copy all source code (components, pages, public, config files, package.json, etc.) except private/planning items
- [ ] Write a custom public README.md in the sibling folder
- [ ] Initialize Git in the sibling folder
- [ ] Set public remote: `https://github.com/faizanebahoochaudhry/my-portfolio.git`
- [ ] Commit and push clean `main` branch to the public repository
- - **Status:** pending

### Phase 4: Verification & Handoff
- [ ] Verify both private and public remote pushes are successful
- [ ] Double-check that no secrets or planning files were pushed to the public repo
- [ ] Create documentation on synchronization script or instructions for future deployments
- - **Status:** pending

## Key Questions
1. How to maintain private/planning files only in the private repo? (Add them to the public repo's ignore list, or keep them out of the sync process).
2. What are the public README credentials and links? (Will use templates/details provided by user).

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| Sibling directory for public repo | Keeps dev and public showcase completely separate, preventing accident commits/pushes of private credentials or plans |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
|       | 1       |            |

## Notes
- None.
