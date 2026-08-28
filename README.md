# simple-plan-search

Ideon individual-market plan search, cached in Postgres, priced with Gravie
premium modifiers on top of the Ideon premium.

```
final_premium_cents = round(ideon_premium_cents × multiplier) + flat_cents
```

## Run it

```bash
cp .env.example .env.local   # fill in DATABASE_URL, IDEON_API_KEY, SESSION_SECRET, APP_PASSWORDS
npm install
npm run migrate              # creates the sps_* tables
npm run dev                  # http://localhost:4100
```

`npm run migrate` is idempotent — everything is `CREATE TABLE IF NOT EXISTS`, so
it is safe to re-run.

## Access

Same gate as `sandbox-tools`: `proxy.ts` lets a request through when its client IP
matches `ALLOWED_IPS` (v4 or v6, CIDR supported), otherwise it needs a session
cookie, which the `/login` password form issues. `.env.example` allowlists
loopback so local dev never sees the login page.

## Gravie modifiers

A modifier row's key columns — `hios_plan_id`, `carrier_id`, `state`,
`rating_area`, `metal_level`, `effective_year` — are each optional. A blank one
matches anything, and the most specific matching row wins, so a statewide default
and a single-plan override can coexist:

| hios_plan_id | state | metal | year | multiplier | wins for |
|---|---|---|---|---|---|
| | NY | | 2026 | 1.020 | any NY plan |
| | NY | gold | 2026 | 1.035 | NY gold plans |
| 74289NY2770005 | | | 2026 | 1.055 | that one plan |

A plan with no matching row is shown **unmodified** rather than silently priced at
the raw Ideon premium.

Import from **Modifiers → Import**, or:

```bash
npx tsx --env-file=.env.local scripts/seed-sample-modifiers.ts samples/my-export.csv
```

Importing deactivates every earlier batch. Reactivate the previous one from the
Modifiers page to undo a bad import — nothing is destroyed on upload.

Column names are matched case-insensitively and ignore spaces, dashes and
underscores, and common aliases are accepted (`planId`, `metal`, `year`,
`factor`), so a Gravie MySQL export usually drops in unchanged. Anything the
importer could not map is listed back in the upload result. `samples/README.md`
carries the CSV shape and a starting `plancatalog` query.

## Comparing against ichra-shopping

`npm run compare` runs the same services the web UI uses and diffs the result
against ichra-shopping's premiums, joined on HIOS plan id.

```bash
npm run compare -- --zip 11201 --member-age 35 --baseline-file shopping-plans.json
npm run compare -- --zip 11201 --member-age 34 --spouse-age 32 \
                   --child-age 4 --child-age 7 --income 80000 \
                   --baseline-url https://shopping.qa.example --interview 1234 \
                   --header "Authorization: Bearer $TOKEN" \
                   --tolerance-cents 100 --csv diff.csv
```

The household is one member plus an optional spouse plus any number of children —
`--spouse-age` adds the spouse, and `--child-age` is repeated once per child.

Shopping does not call Ideon — it calls IMPC and computes the household premium
itself (Method A tiered rates, else Method B age-banded with the ACA
three-oldest-children cap). Its numbers are an independent baseline, which is the
point of the diff. `--baseline-file` takes a saved `FetchPlansResponse`;
`--baseline-url` + `--interview` fetches `GET {base}/interviews/{id}/plans` live.

Exit code is `0` when every matched plan is within `--tolerance-cents` and neither
side has orphan plans, `1` otherwise, so it drops into CI unchanged.

## Caching

An Ideon plan search is cached in `sps_plan_search_cache`, keyed by the sha256 of
the canonicalized request body, and served for `PLAN_CACHE_TTL_SECONDS` (default
24 h). **Refresh from Ideon** on the search page and `--refresh` on the CLI both
bypass it and overwrite the row. Zip → FIPS lookups are cached separately and
without expiry.

## Layout

```
proxy.ts                    IP allowlist → session → /login
app/actions/                server actions (thin — validate and dispatch)
app/lib/services/           orchestration
app/lib/repos/              every SQL statement
app/lib/ideon/              Ideon HTTP client + response mapper
app/lib/shopping/           reads ichra-shopping's FetchPlansResponse
app/lib/{money,modifier,modifierCsv}.ts   pure domain, unit tested
scripts/                    migrate, seed, compare
```

Money is integer cents everywhere past the Ideon mapper, with a `Cents` suffix on
every field. Ideon's decimal dollars are converted once, in `mapPlan`.

## Commands

| command | what it does |
|---|---|
| `npm run dev` | dev server on :4100 |
| `npm run build` | production build |
| `npm run migrate` | apply `app/lib/schema.sql` |
| `npm run compare` | diff premiums against ichra-shopping |
| `npm test` | unit tests |
| `npm run lint` / `npm run typecheck` | eslint / tsc |

## Notes

The Neon database is shared with an unrelated project whose tables are prefixed
`mk03_` / `mk04_`; everything here is prefixed `sps_`. The Neon HTTP driver is
used instead of `pg` because it talks over 443 — the VPN blocks outbound 5432.
