# Performance results

Raw results of the runs against staging, one JSON file per run, named by the time it started and what it
measured (`seed`, `nfr-001`, `nfr-002`, `queue-load`). Each holds every sample, the summary, the outcome
against the target and the environment. They are written by the scripts in `perf/` and committed as they
were written; the interpretation is in `../README.md`.

Nothing enforces that a file is unedited, so each one records how to check it: `scriptsCommit` is the
commit the scripts ran at, and `scriptsChanged` is `false` only if `perf/` had no uncommitted changes then.
A result is only evidence if `scriptsChanged` is `false`; running that commit's script with the options in
its `method` against the same target reproduces the run.
