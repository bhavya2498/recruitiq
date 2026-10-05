# RecruitIQ: AI Resume Screening & Recruitment Platform (MERN)

Three backend-enforced roles on top of the original screening engine (resume parser, skill normalisation, matcher, scoring, ranking, re-scoring).

| Role | Can do |
|---|---|
| **Candidate** | Maintain a profile + resume, browse open jobs, apply (once per job), track **only their own** applications (stage + timeline). Never sees scores, rankings, notes or other candidates. |
| **Recruiter** | Create/edit/close **own** jobs, upload and screen resumes, see explainable matching and server-side ranking, add private notes, move applications through **Applied → Screening → Shortlisted → Interview → Hired / Rejected**, re-score. Cannot see other recruiters' jobs or candidates. |
| **Admin / HR** | Everything recruiters can do across the whole organisation, plus: manage users (create, change role, activate/deactivate, reset password), reassign jobs, org-wide applications and analytics, audit log. |

## Run it
1. Node 18+ and MongoDB (local, or an Atlas URI in `server/.env`).
2. `npm install` then `npm run install:all`
3. Edit `server/.env` (see `server/.env.example`). **`JWT_SECRET` must be a long random string** (32+ chars, enforced in production).
4. `npm run dev` → client http://localhost:5173, API http://localhost:5000

### Upgrading an existing database (automatic, non-destructive)
On start the server runs idempotent migrations (`server/migrations`). They only **add** fields; scores, resumes, passwords and jobs are untouched. Back up first (`mongodump`) as usual.
- Existing users become **recruiters**, active, with all their jobs/candidates intact.
- Existing jobs become `open`.
- Existing candidates get a pipeline `stage` mapped from the old status (shortlisted→Shortlisted, review→Screening, rejected→Rejected), a history entry, and a stored score explanation (back-filled **without recomputing scores**).
- Run manually any time: `npm run migrate --prefix server`.

### Create your first administrator
Nobody can self-register as admin. While no active admin exists, the server uses, in order: `ADMIN_EMAILS` (promotes existing accounts) → `ADMIN_EMAIL` + `ADMIN_PASSWORD` (creates one) → prints a warning. Or any time:
`npm run create-admin --prefix server -- you@company.com [password] ["Name"]` (promotes an existing account, or creates one when a password is given).

Existing sessions issued before this upgrade stop working; users simply sign in again.

## Security model
- **JWT** (HS256, issuer-checked, `1d` default). The user is re-loaded from the database on every request: role changes, deactivation and password resets apply **immediately**; the role is never trusted from the token. `tokenVersion` invalidates all tokens on password change/reset, role change or deactivation.
- **RBAC on the server** (`requireRole`), then **ownership**: recruiter queries are always scoped by `owner`; out-of-scope records return 404 (existence not revealed). Candidates are scoped by `applicant`.
- **No mass assignment / manipulation**: every input is validated by a strict allow-list (`utils/validate.js`); unknown fields (`role`, `score`, `rank`, `owner`, `isActive`...) are rejected with 400. Scores, breakdowns, explanations and ranks are computed only on the server by the matcher. Operator injection (`$ne`, dotted keys) is blocked.
- **Registration** can only create `candidate` or `recruiter` (set `ALLOW_RECRUITER_SIGNUP=false` to make recruiters admin-created). Passwords: 8+ chars with letter and number, bcrypt (cost 12). Login lockout (5 failures → 15 min), constant-time unknown-user check, rate limits, security headers, 100 KB JSON limit, CORS allow-list.
- **Uploads**: PDF/DOCX only, 5 MB, file signature verified, memory storage.
- **Duplicates**: a unique partial database index (`job` + `applicant`) plus an email check prevent duplicate applications, including races.
- **Stage validation**: transitions are enforced by a state machine (`utils/stages.js`) with compare-and-set updates; `hired` is final; rejected can be re-opened to Screening. Every change is recorded in the application history (who, when, note).
- Deactivating a user blocks sign-in and API use at once. The last active admin and your own account cannot be demoted/deactivated. Admin actions, lockouts and stage changes are written to the audit log.
- Deleting a job that has applications from registered candidates is refused for recruiters (close it instead); admins can force it.

## Scoring (out of 100) - unchanged
Skills 45 · Experience 30 · Education 10 · Projects 10 · JD keywords 5. The automatic verdict (`status`): 75+ shortlisted, 50-74 review, below 50 rejected. Weights live in `server/utils/matcher.js`, the skill dictionary in `server/utils/skills.js`. `matcher.explain()` adds the plain-language reasons shown in the UI without touching the score. Editing a job's skills/experience/education/description (or **Re-score**) re-runs the same matcher on stored resumes; stages, history and notes are preserved.

`status` is the matcher's automatic verdict; `stage` is the recruiter-managed pipeline position.

## API overview
- `POST /api/auth/register|login`, `GET|PATCH /api/auth/me`, `POST /api/auth/change-password`
- Candidate: `/api/portal/profile`, `/portal/profile/resume`, `/portal/jobs`, `/portal/jobs/:id/apply`, `/portal/applications`
- Recruiter/Admin: `/api/jobs` (CRUD, `/:id/rescore`, admin `/:id/reassign`), `/api/candidates/job/:jobId` (+`/upload`), `/api/candidates/:id` (+`/stage`, `/rescore`, `/notes`), `/api/analytics`
- Admin: `/api/admin/users` (+`/:id`, `/:id/reset-password`), `/api/admin/applications`, `/api/admin/audit`

## Structure
- `server/` Express API: `models/` (User, Job, Candidate, AuditLog), `routes/`, `middleware/` (auth/RBAC, security, errors), `services/screening.js`, `utils/` (parser, skills, matcher, validate, stages), `migrations/`, `scripts/`
- `client/` React + Vite: landing, auth, role-aware app shell; recruiter/admin dashboard, jobs, ranked pipeline drawer; candidate portal; admin users/applications/audit

## Tests
- `npm test --prefix server` - unit tests (validation, stage machine, matcher regression, rate limiter); no database needed.
- `TEST_MONGO_URI=mongodb://127.0.0.1:27017/recruitiq_test npm run test:integration --prefix server` - end-to-end RBAC/ownership/pipeline/migration tests against a **throwaway** database (it is dropped).

Note: scanned (image-only) PDFs have no text layer and are rejected with a message.
