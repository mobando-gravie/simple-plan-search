# Sample data

`gravie-modifiers.sample.csv` — a modifier CSV in the canonical shape. Import it
from **Modifiers → Import**, or from a shell:

```bash
tsx --env-file=.env.local -e "
import { importModifierCsv } from './app/lib/services/modifierService'
import { readFileSync } from 'node:fs'
console.log(await importModifierCsv(
  'gravie-modifiers.sample.csv',
  readFileSync('samples/gravie-modifiers.sample.csv', 'utf8'),
  'sample data',
))"
```

## Where the real CSV comes from

The production shape is a query against Gravie's MySQL `plancatalog` schema. The
join from a HIOS plan id to a Gravie plan runs through `medical_plan_link`; rates
and rating-area geo live in `medical_rate`, `medical_rate_tiered` and
`medical_rating_area*`. A starting sketch:

```sql
SELECT  l.external_plan_id  AS hios_plan_id,
        c.hios_issuer_id    AS carrier_id,
        ra.state_code       AS state,
        ra.rating_area_id   AS rating_area,
        p.metal_level       AS metal_level,
        p.plan_year         AS effective_year,
        <your factor>       AS multiplier,
        0                   AS flat_cents,
        'plancatalog export' AS label
FROM        plancatalog.medical_plan       p
JOIN        plancatalog.medical_plan_link  l  ON l.medical_plan_id = p.id
JOIN        plancatalog.medical_carrier    c  ON c.id = p.medical_carrier_id
LEFT JOIN   plancatalog.medical_rating_area ra ON ra.id = p.medical_rating_area_id
WHERE   p.plan_year = 2026;
```

Column names are matched loosely on import (case, spaces, dashes and underscores
are ignored, and common aliases are accepted), so the export usually needs no
reshaping. Anything the importer could not map is listed back in the upload
result.
