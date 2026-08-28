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

The table is Gravie's per-plan **overlay**, not only a premium adjustment: a row
may also carry `enrollment_type` (`EASY_ENROLL` / `SELF_ENROLL`), which drives the
enrollment tag on the card. Ideon has no enrollment field, so this is the only
source for it. A row carrying just an enrollment type and no premium change is
valid.

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
point of the diff.

Three baseline sources. `--baseline-file` takes a saved `FetchPlansResponse`;
`--baseline-url` + `--interview` fetches `GET {base}/interviews/{id}/plans` live;
and `--baseline-hotwire <base>` posts this run's household to
`POST {base}/plans/hotwire-ranked`, which needs no persisted interview and is the
easiest way to check an arbitrary household:

```bash
npm run compare -- --zip 75201 --member-age 40 --spouse-age 38 \
  --child-age 10 --child-age 8 --enrollment-date 2026-10-01 \
  --baseline-hotwire https://ichra-shopping-develop.ichra.qa.gravie.us \
  --tolerance-cents 100
```

Needs the Gravie QA VPN. Shopping ships plans it could not price at `$0` rather
than dropping them; those are filtered out and the count reported.

Exit code is `0` when every matched plan is within `--tolerance-cents` and neither
side has orphan plans, `1` otherwise, so it drops into CI unchanged.

## Plan cards

Each card follows the member-facing ICHRA card: a header strip with the carrier
logo, plan name and a pre-tax note, then a tag stack (enrollment, tax treatment,
metal, plan type, HSA, and provider/prescription coverage counts), three money
columns, and links out to the plan documents.

Coverage tags have three states — all covered, partial, none — mirroring
member-client's `coverage-match-class`, so "1 of 3 covered" no longer looks
identical to "0 of 3".

**Details** opens a modal with the plan's Documents, Care Services, your
prescriptions and their tiers, Prescription Coverage and Additional Coverages,
each split In Network / Out of Network. Every external link opens in a new tab.

## ICHRA allowance

Setting an allowance on the search switches the card to the member's view: the net
premium (`max(0, premium − allowance)`) with the gross struck through and an
"after $X benefit" line. It also enables the **free floor** sort, which puts the
richest plan the member can take at no cost first, then plans costing something,
cheapest first — deliberately not `|premium − allowance|`, which would rank a plan
costing $10/mo above a free one $25 cheaper.

The allowance is display and sort only. Ideon has no allowance concept, so it stays
out of the request body and therefore out of the cache key — adjusting it
re-renders instantly instead of refetching.

## Caching

## Providers and prescriptions

The search form takes provider and drug selections, typeahead-backed by
`/api/providers` and `/api/drugs`. Selecting any of them switches the Ideon plan
search to `Accept-Version: v7`, the only version that returns coverage, and each
plan card then shows how many of your providers are in network and how many of
your drugs are on formulary. Results can be filtered down to plans that cover all
of both.

Two Ideon quirks the code works around, both verified live:

- v7 returns cost shares as one string (`"In-Network: $6,000 / …"`) where v8
  returns an object, so `ideon/coverage.ts` reads both.
- A plan's `coverages[]` rows repeat on **every** page of a paged search, so they
  are deduped on `(plan_id, drug_package_id)` before counting.

## Plan cards

Each card follows the member-facing ICHRA card: a header strip with the carrier
logo, plan name and a pre-tax note, then a tag stack (enrollment, tax treatment,
metal, plan type, HSA, and provider/prescription coverage counts), three money
columns, and links out to the plan documents.

Coverage tags have three states — all covered, partial, none — mirroring
member-client's `coverage-match-class`, so "1 of 3 covered" no longer looks
identical to "0 of 3".

**Details** opens a modal with the plan's Documents, Care Services, your
prescriptions and their tiers, Prescription Coverage and Additional Coverages,
each split In Network / Out of Network. Every external link opens in a new tab.

## ICHRA allowance

Setting an allowance on the search switches the card to the member's view: the net
premium (`max(0, premium − allowance)`) with the gross struck through and an
"after $X benefit" line. It also enables the **free floor** sort, which puts the
richest plan the member can take at no cost first, then plans costing something,
cheapest first — deliberately not `|premium − allowance|`, which would rank a plan
costing $10/mo above a free one $25 cheaper.

The allowance is display and sort only. Ideon has no allowance concept, so it stays
out of the request body and therefore out of the cache key — adjusting it
re-renders instantly instead of refetching.

## Caching

A search pulls 200 plans by default. Ideon caps a page at 50 however large
`per_page` is, so the service walks pages until it has enough or the result set
runs out, and caches the merged response.

An Ideon plan search is cached in `sps_plan_search_cache`, keyed by the sha256 of
the recursively key-sorted request body, and served for `PLAN_CACHE_TTL_SECONDS` (default
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
