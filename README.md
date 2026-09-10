# Sangam — full setup, step by step

## Recent changes (final round)

- **Only citizens raise issues** — unchanged from before, reconfirmed.
- **Students must pick a college, and it's the same list as institutions.**
  A student's `college` is now a reference to an `InstitutionProfile`
  (exactly the entities that engage with challenges and employ faculty),
  not free text. The register form shows a dropdown, fed by the same
  public `GET /api/institutions` endpoint faculty registration uses.
- **Team members must come from the faculty's own institution.**
  `POST /api/teams` and `PATCH /api/teams/:id/add-student` now reject any
  student whose `college` doesn't match the faculty's `institution`. The
  frontend already only shows students from that institution in the
  checkbox list, but the backend enforces it regardless of what the
  frontend sends. Selecting is via checkboxes, so any number of unique
  students can be picked (duplicates aren't possible through that UI).
- **Funding stays optional, after the team is formed** (unchanged) — a
  faculty member can `POST /api/funding-requests` or
  `PATCH /api/issues/:id/start` to skip it, exactly as before.
- **Progress updates.** The assigned faculty can post short text updates
  on an issue any time from `assigned` through `in_progress` (i.e. the
  entire time they're actively responsible for it) via
  `POST /api/issues/:id/updates`. Updates are stored directly on the issue
  document (`updates: [{ text, postedBy, at }]`) and shown to everyone who
  can see that issue, newest first.
- **Mark complete.** The assigned faculty can call
  `PATCH /api/issues/:id/complete` from any active status
  (`team_formed` / `seeking_funds` / `funded` / `in_progress`) to move the
  issue straight to `solved`. This is final immediately — no institution
  or admin confirmation step, per your call.
- Removed the unused `testing` / `ip_filed` / `deployed` statuses that
  were never wired to anything — `solved` is now the only terminal state,
  reached directly by the faculty's "mark complete" action.

---


This is the "proper" version: separate MongoDB collections per role
(students, institutions, faculty, funding orgs each have their own profile
collection linked to a shared `User` login record), and `Issue.status` as an
indexed field walking through your full pipeline (pending_review → approved
→ engaged → assigned → team_formed → seeking_funds → funded → testing →
ip_filed → deployed/solved).

The frontend is now served by the *same* backend process, on the same port,
so there's only one thing to start and no CORS to think about.

Do each step below **in order**, and check the "you should see" line before
moving to the next one. If a step doesn't match, stop there and tell me
exactly what you see — that's much faster to fix than debugging five steps
at once.

---

### Step 1 — Node.js

```bash
node -v
```
**You should see:** something like `v22.x` or `v24.x`. If you get
`command not found`, install it first (`nvm install --lts` if you set up
nvm earlier, or `brew install node`).

### Step 2 — MongoDB is running

Open a terminal tab and run:

```bash
mongod --dbpath ~/data/db
```

**You should see:** a bunch of log lines ending in something like
`Waiting for connections`. **Leave this tab open** — this is your database,
running in the foreground. Don't close it or run anything else in it.

Open a **second** terminal tab to check it's reachable:

```bash
mongosh
```
**You should see:** a `test>` prompt. Type `exit` to leave it. If this
connects, MongoDB is fine — move on.

### Step 3 — Install dependencies

In a **third** terminal tab, `cd` into this unzipped project folder, then:

```bash
npm install
```

**You should see:** it ends with something like `added 60 packages` and no
red `npm error` lines. If you see `403 Forbidden`, that's a network/registry
issue on your end (proxy, VPN, or npm auth) — not something in this project.

### Step 4 — Configure environment variables

```bash
cp .env.example .env
```

Open `.env` in any text editor. It already has sensible defaults for local
MongoDB. Only change `JWT_SECRET` — generate a random one with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Paste the output as the value of `JWT_SECRET` in `.env`.

### Step 5 — Start the server

Still in that third tab:

```bash
npm run dev
```

**You should see exactly two lines:**
```
MongoDB connected -> sangam
Sangam running at http://localhost:5000
```

If instead you see `Failed to connect to MongoDB`, go back to Step 2 — your
`mongod` tab probably isn't running anymore.

### Step 6 — Open it in a browser

Go to:
```
http://localhost:5000
```

**You should see:** the Sangam page, with "API connected" in the top bar. If
it says "API unreachable", the server from Step 5 isn't running — check that
tab for errors.

### Step 7 — Try the whole pipeline

Register accounts in **this order** — institutions have to exist first,
since both faculty and student registration need to pick one from a
dropdown:

1. Register as **institution** (fill in institution name + fields of
   expertise). This is also your students' "college."
2. Register as **faculty**, picking that institution from the dropdown.
3. Register as **student**, picking the *same* institution as their
   college (a faculty member can only add students from their own
   institution to a team, so they need to match).
4. Register as **citizen** → submit a challenge.
5. Register as **admin** → find that challenge, click **Approve**.
6. Log back in as the **institution** → click **Engage**, pick your
   faculty member from the dropdown, click **Assign faculty**.
7. Log back in as **faculty** → you'll see a progress-update box and,
   once you click **Form team**, only students from your own institution
   in the checkbox list. Pick any number, form the team, then either
   **Request funding** or **Skip funding — start solving**. Try posting a
   progress update at any point after assignment, and try **Mark project
   completed** once you're in an active status.
8. If you did request funding: register as **funding_org** → open the
   panel of open funding requests → enter an amount and **Pledge**. Once
   the pledge meets the amount requested, status flips to `funded`
   automatically.

Click **Refresh** on the challenge list at any point to see the status
and the latest updates.

---


## Why the data is organized this way

- **`User`** collection: only login data (email, bcrypt password hash, role,
  name). This is deliberately small and separate so the password hash never
  has to be loaded just to show someone's profile.
- **`StudentProfile` / `InstitutionProfile` / `FacultyProfile` /
  `FundingOrgProfile`**: one collection each, holding only the fields
  relevant to that role, linked back to `User` by a reference. This is what
  "different data stored differently" means in MongoDB — separate
  collections, not separate physical databases (MongoDB doesn't need that;
  indexes do the same job with far less operational overhead).
- **`Issue`**: one collection, with `status` as an indexed field walking
  through the whole approval → engagement → team → funding pipeline, plus a
  `statusHistory[]` array recording every transition. Querying
  `Issue.find({status: "approved"})` is exactly as fast as a dedicated
  "approved issues" collection would be, without the pain of moving
  documents between databases every time something changes state.
- **`Team`** and **`FundingRequest`**: their own collections, each linked to
  the `Issue` they belong to.

## If something goes wrong at any step

Copy the **exact** error text from your terminal (not a paraphrase) and tell
me which step number you were on. Almost every Node/Mongo error tells you
precisely what's wrong if you read it — port already in use, wrong
connection string, missing field — so the fastest fix is always pasting the
real message rather than describing the symptom.
