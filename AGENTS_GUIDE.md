# simple-plan-search — agent API reference

Read-only HTTP over Ideon's individual (ACA) market, cached in Postgres, priced
with Gravie's premium overlay. All endpoints are GET, all input is query-string,
all output is JSON except this document.

**Base URL: `https://simple-plan-search.vercel.app`** — the default for every
path below. Local development serves the same surface at
`http://localhost:4111`.

- Machine-readable endpoint index: `GET /api`
- This document: `GET /AGENTS_GUIDE.md` (`text/markdown`)

## Auth

Checked in order; first match passes.

1. Client IP in `ALLOWED_IPS`.
2. `Authorization: Bearer <token>` or `X-Api-Key: <token>`, token from `API_TOKENS`.
3. `session` cookie from the `/login` form.

Failure on `/api/*` and `/AGENTS_GUIDE.md`: **401 with a JSON body**. No redirect,
so a parse failure never means "you were sent an HTML login page". Other paths
redirect to `/login` as before.

Which rule applies depends on where the request comes from:

| caller | passes on |
|---|---|
| local dev on `http://localhost:4111` | rule 1 — loopback is allowlisted, no header needed |
| anything against the hosted base URL | rule 2 — send the bearer token; an arbitrary agent's IP is not on the allowlist |

A hosted 401 means the token is missing or wrong, not that the service is down.
`API_TOKENS` is set in the deployment's environment; obtain a token from whoever
owns it rather than guessing.

## Conventions

| rule | detail |
|---|---|
| money | integer cents, field suffix `Cents`. No dollar fields anywhere. `.premiumCents / 100` to display. |
| lists | comma-separated: `child_ages=10,8`. Exception: `carriers` repeats the parameter, because carrier names contain dots. |
| booleans | `true` `1` `yes` `on`, or the bare key (`&hsa_only`). Anything else is false. |
| unknown values | 400 with the valid list. `metals`, `sort` and `market` are validated; a typo never degrades to an empty result set. |
| case | `metals`, `sort`, `market`, `view`, `plan_types` and `carriers` are case-insensitive. |
| null | a field that has no value is `null`, never omitted and never `0`. |
| pagination | none. `limit` trims; filter to narrow. |

## Endpoints

| method | path | required | returns |
|---|---|---|---|
| GET | `/api` | — | endpoint index |
| GET | `/api/plans` | `zip` | `query`, `market`, `cache`, `plans[]` |
| GET | `/api/plans/{hiosPlanId}` | `zip` | `query`, `market`, `cache`, `plan` (full) |
| GET | `/api/market` | `zip` | `query`, `market`, `cache`, `summary` |
| GET | `/api/coverage` | `zip` + `providers` and/or `drugs` | `query`, `market`, `cache`, `requested`, `plans[]` |
| GET | `/api/providers` | `zip`, `q` | `hits[]` |
| GET | `/api/providers/{npi}` | — | `provider` |
| GET | `/api/drugs` | `q` | `hits[]` |
| GET | `/api/drugs/{rxcui}` | — | `drug` |
| GET | `/api/zip/{zip}` | — | `zip`, `fipsCode`, `state`, `countyName` |
| POST | `/api/resolve` | body `{kind,ids}` | `resolved[]`, `unresolved[]` |

`/api/plans`, `/api/plans/{id}`, `/api/market` and `/api/coverage` take the same
search parameters.

## Search parameters

| name | type | default | notes |
|---|---|---|---|
| `zip` | 5 digits | — | **required**; 400 without it |
| `market` | `individual` \| `small_group` | `individual` | |
| `age` | int 0–120 | `35` | alias `member_age` |
| `member_tobacco` | boolean | `false` | |
| `spouse_age` | int 0–120 | — | presence adds a spouse |
| `spouse_tobacco` | boolean | `false` | |
| `child_ages` | int list | — | one entry per child |
| `income` | int, dollars | — | household income |
| `allowance` | int, dollars | — | ICHRA allowance; display and sort only |
| `enrollment_date` | `YYYY-MM-DD` | first of next month | |
| `providers` | NPI list | — | 10 digits each |
| `drugs` | selector list | — | `medId_ndc`, or `r<rxcui>` for an unresolved id |
| `q` | string | — | substring of plan name, carrier or HIOS id |
| `metals` | enum list | all | `bronze` `expanded_bronze` `silver` `gold` `platinum` `catastrophic` |
| `plan_types` | string list | all | e.g. `hmo,ppo,epo,pos`; `/api/market` reports what a zip actually has |
| `carriers` | repeated string | all | `&carriers=Oscar&carriers=Ambetter` |
| `max_premium` | int, dollars | — | ceiling on `premiumCents` |
| `max_deductible` | int, dollars | — | ceiling on `deductibleIndividualCents` |
| `hsa_only` | boolean | `false` | |
| `provider_coverage` | `all` \| `any` | off | `all` = every NPI in network; `any` = at least one |
| `drug_coverage` | `all` \| `any` | off | same, over `drugs` |
| `sort` | enum | `premium-asc` | `premium-asc` `premium-desc` `deductible-asc` `deductible-desc` `oopMax-asc` `oopMax-desc` `name` `free-floor` |
| `limit` | int 1–200 | `200` | trims **after** filtering and sorting |
| `view` | `summary` \| `full` | `summary` | `/api/plans` only |
| `refresh` | boolean | `false` | bypass the 24 h cache, re-fetch, overwrite |

The web UI's short keys are also accepted: `z a k i w d p x q f t r mp md hsa cd
pn o`. A URL copied from the browser runs against the API by swapping `/` for
`/api/plans`.

## Response envelope

Present on `/api/plans`, `/api/plans/{id}`, `/api/market`, `/api/coverage`.

### `query` — the search after defaults and validation

`zip`, `market`, `household[] {age, tobacco, relation}` (`relation` is
`primary` \| `spouse` \| `child`), `householdIncome`, `allowanceCents`,
`enrollmentDate`, `providers[] {npi, name}`, `drugs[] {medId, ndc, rxcui, name}`,
`filters {…}`, `view`, `limit`.

### `market` — four distinct counts

| field | meaning |
|---|---|
| `fipsCode`, `state`, `countyName` | resolved county; a multi-county zip resolves to the first |
| `totalAvailable` | plans Ideon reports for this zip and household |
| `fetched` | plans pulled and cached by this search |
| `matched` | plans surviving the filters |
| `returned` | plans in this response body, after `limit` |
| `modifiersApplied` | plans that matched a Gravie overlay row |

### `cache`

`hit` (boolean), `fetchedAt` (ISO 8601), `ageSeconds`.

## `plans[]` — summary view

| field | type | notes |
|---|---|---|
| `hiosPlanId` | string | key for `/api/plans/{hiosPlanId}` |
| `planName`, `carrierName`, `carrierId` | string \| null | |
| `metalLevel` | string \| null | lowercase |
| `planType` | string \| null | as the carrier files it, e.g. `HMO` |
| `hsaEligible`, `offMarket` | boolean | |
| `effectiveYear` | int \| null | |
| `enrollmentType` | string | `EASY_ENROLL` \| `SELF_ENROLL`; from the Gravie overlay, not Ideon |
| `premiumCents` | int \| null | **quote this** — Ideon premium with the overlay applied |
| `ideonPremiumCents` | int \| null | before the overlay |
| `netPremiumCents` | int \| null | `max(0, premium − allowance)`; `null` unless `allowance` was sent |
| `gravieMultiplier` | number | `1` when no overlay row matched |
| `gravieFlatCents` | int | |
| `deductibleIndividualCents`, `deductibleFamilyCents` | int \| null | in network |
| `outOfPocketMaxIndividualCents`, `outOfPocketMaxFamilyCents` | int \| null | in network |
| `providerCoverage`, `drugCoverage` | `{covered, total, match}` | `match` is `match` \| `partial` \| `none`, or `null` when `total` is 0 |

## `plans[]` — full view (`view=full`, and `/api/plans/{id}`)

Summary fields plus:

| field | type |
|---|---|
| `logoUrl`, `formularyUrl` | string \| null |
| `documents[]` | `{type, url}` |
| `compositeRated` | boolean — true when Ideon prices the plan by household tier |
| `applicantPremiums[]` | `{age, child, premiumCents, waived}`; `waived` is the ACA three-oldest-children cap |
| `coverage.providers[]` | `{npi, name, specialty, city, inNetwork}` |
| `coverage.drugs[]` | `{medId, ndc, rxcui, name, covered, tier, tierLabel, priorAuthorization, quantityLimit, stepTherapy}` |
| `benefits.careServices[]` | `{label, inNetwork, outOfNetwork}` |
| `benefits.prescriptionCoverage[]` | same shape |
| `benefits.additionalCoverages[]` | same shape |

Full plans are several KB each. Pair `view=full` with `limit`.

## `/api/market` — `summary`

| field | shape |
|---|---|
| `planCount` | int, after filters |
| `hsaEligibleCount` | int |
| `premium` | `{lowestCents, medianCents, highestCents}` |
| `deductibleIndividual` | same shape |
| `metalLevels[]` | `{level, planCount, lowestPremiumCents}`, benefit order |
| `carriers[]` | `{name, carrierId, planCount, lowestPremiumCents}`, biggest first |
| `planTypes[]` | `{type, planCount, lowestPremiumCents}`, biggest first |
| `coverage` | `null` unless `providers` or `drugs` was sent; else `{providersRequested, drugsRequested, plansCoveringAllProviders, plansCoveringAllDrugs, plansCoveringEverything}` |

`limit` does not affect `summary` — aggregates cover every matched plan.

## `/api/coverage`

`requested` echoes `providers[] {npi, name}` and `drugs[] {medId, ndc, name}`.
Each entry of `plans[]` carries `hiosPlanId`, `planName`, `carrierName`,
`metalLevel`, `premiumCents`, `providerCoverage`, `drugCoverage`, and the
`providers[]` / `drugs[]` rows described under the full view.

400 when neither `providers` nor `drugs` is supplied.

## Identifier resolution

- `GET /api/providers?zip=&q=` — geographic; searches 25 miles around the zip,
  widening to 100 only if that finds nothing. `q` must be ≥3 characters.
  Returns `hits[] {npi, name, specialty, type, city}`.
- `GET /api/providers/{npi}` — 10 digits. 404 if Ideon does not know it.
- `GET /api/drugs?q=` — national, formulary-listed drugs only. Returns
  `hits[] {medId, name, packages[] {ndc, label}}`.
- `GET /api/drugs/{rxcui}` — RxCUI is the only drug identifier Ideon resolves; a
  bare `med_id` cannot be looked up. Returns `drug` plus `drug.selector`, the
  `medId_ndc` string the `drugs` parameter expects.
- `POST /api/resolve` — batch, max 50 ids:
  `{"kind":"provider"|"drug","ids":["…"]}` → `{resolved, unresolved}`.

## Errors

Body is always `{"error": string, "hint": string}`.

| status | cause |
|---|---|
| 400 | missing or malformed parameter; unknown `metals` / `sort` / `market` / `view`; `limit` out of range; `/api/coverage` with nothing to check |
| 401 | no allowlisted IP, valid token or session |
| 404 | plan not in this search; unknown NPI, RxCUI or zip |
| 500 | `AGENTS_GUIDE.md` missing from the deployment |
| 502 | Ideon or the plan cache unavailable |

## Constraints

- `premiumCents` is the member-facing number. `ideonPremiumCents` is upstream's
  figure before the Gravie overlay; do not quote it.
- Sending `providers` or `drugs` switches the upstream call to Ideon v7, the only
  version returning coverage. Different request, different cache entry, slower.
  Omit both when only prices are needed.
- `limit` never changes what is searched. The search always pulls 200 plans, so
  `limit=5` and `limit=50` share one cache entry, and `sort=premium-desc&limit=3`
  really is the three most expensive matching plans.
- The plan cache is 24 h. Read `cache.hit` and `cache.ageSeconds`. `refresh=true`
  costs one Ideon call per page of the result set; use it deliberately.
- `allowance` never changes a premium. It drives `netPremiumCents` and the
  `free-floor` sort, and is excluded from the cache key.
- `free-floor` without an `allowance` degrades to `premium-asc`. With one, it
  orders the richest plan available at zero cost first, then plans costing
  something, cheapest first.
- Coverage is counted off the submitted list, not off the rows Ideon returned. A
  provider or drug with no row counts as not in network / not covered; the
  denominator never shrinks.
- A drug supplied as `r<rxcui>` has no NDC, so it is always counted as not
  covered.
- A plan exists only inside a search. `/api/plans/{id}` needs the same
  parameters, and 404 means "not available for this search", not "no such id".
- A zip spanning several counties resolves to the first. Check `market.fipsCode`
  and `market.countyName` before trusting a surprising result.
- Plans Ideon could not price carry `premiumCents: null` and sort last in every
  direction.

## Recipes

```bash
BASE=https://simple-plan-search.vercel.app
AUTH=(-H "Authorization: Bearer $TOKEN")   # required against the hosted URL;
                                           # omit for local dev on :4111

# endpoint index
curl -s "${AUTH[@]}" "$BASE/api" | jq

# market shape for a zip
curl -s "${AUTH[@]}" "$BASE/api/market?zip=11201&age=40" \
  | jq '.summary | {planCount, premium, metalLevels, carriers}'

# ten cheapest, one line each
curl -s "${AUTH[@]}" "$BASE/api/plans?zip=11201&age=40&sort=premium-asc&limit=10" \
  | jq -r '.plans[] | "\(.hiosPlanId)\t\(.carrierName)\t\(.metalLevel)\t\(.premiumCents)"'

# family, income, allowance; what the member actually pays
curl -s "${AUTH[@]}" "$BASE/api/plans?zip=75201&age=40&spouse_age=38&child_ages=10,8&income=80000&allowance=400&sort=free-floor&limit=5" \
  | jq -r '.plans[] | "\(.planName)\tgross=\(.premiumCents)\tnet=\(.netPremiumCents)"'

# resolve identifiers, then feed them back in
NPI=$(curl -s "${AUTH[@]}" "$BASE/api/providers?zip=11201&q=smith" | jq -r '.hits[0].npi')
SEL=$(curl -s "${AUTH[@]}" "$BASE/api/drugs?q=lipitor" | jq -r '"\(.hits[0].medId)_\(.hits[0].packages[0].ndc)"')

# plans covering every provider and every drug
curl -s "${AUTH[@]}" "$BASE/api/plans?zip=11201&age=40&providers=$NPI&drugs=$SEL&provider_coverage=all&drug_coverage=all" \
  | jq '{matched: .market.matched, plans: [.plans[] | {hiosPlanId, premiumCents}]}'

# why a plan does or does not cover them
curl -s "${AUTH[@]}" "$BASE/api/coverage?zip=11201&age=40&providers=$NPI&drugs=$SEL&limit=5" \
  | jq -r '.plans[] | "\(.planName): providers \(.providerCoverage.covered)/\(.providerCoverage.total), drugs \(.drugCoverage.covered)/\(.drugCoverage.total) [\(.drugs[0].tierLabel)]"'

# one plan in full
curl -s "${AUTH[@]}" "$BASE/api/plans/25303NY0610001?zip=11201&age=40" \
  | jq '.plan | {planName, premiumCents, documents, care: .benefits.careServices}'

# filter by carrier and metal, cheapest first
curl -s "${AUTH[@]}" "$BASE/api/plans?zip=11201&age=40&metals=silver,gold&carriers=HealthFirst&max_premium=1500&sort=premium-asc" \
  | jq '.market'
```
