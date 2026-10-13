# Tests

The tests use Node's built-in `node:test`: `node --test tests/*.test.js` from the repository root runs them all.

## Fixtures come from the registers

`fixtures/access-matrix.json` and `fixtures/status-model.json` are exported from the Access Matrix and
Status Model sheets of `docs/requirements/CivicConnect_M1_Registers.xlsx`. The authorisation policy
(ADR-006) and the transition table (ADR-005) are tested against them, so every cell of those two sheets
is a test case. They are never edited by hand:

    python tools/export_register_fixtures.py          # rewrite both fixtures from the workbook
    python tools/export_register_fixtures.py --check  # exit 1 if either differs from the workbook

**The source line changes on every workbook edit.** Each fixture's `source` line ends with the first
twelve characters of the workbook's SHA-256, so a fixture can be traced to the exact file it was exported
from. The hash covers the whole workbook, so editing any sheet, the Decision Log or the Risk Register
included, changes it in both fixtures even when no matrix or status cell changed. `--check` then reports
both fixtures as out of date. This is intended, not a fault: re-run the export in the same Pull Request as
the workbook edit and commit the two fixtures with it (RSK-16).
