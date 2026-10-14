# Performance results

Raw results of the runs against staging, one JSON file per run, named by the time it started and what it
measured (`seed`, `nfr-001`, `nfr-002`, `queue-load`). Each holds every sample, the summary, the outcome
against the target and the environment. They are written by the scripts in `perf/` and committed as they
were written; the interpretation is in `../README.md`.

Nothing enforces that a file is unedited, so each one records how to check it: `scriptsCommit` is the
commit the scripts ran at, `scriptsChanged` is `false` only if `perf/` had no uncommitted changes then, and
`server` is what the server's health check said, including the release it ran. A result is only evidence
if `scriptsChanged` is `false` and `server` names the release; its `evidence` field says which. Running
that commit's script with the options in its `method` against the same release reproduces the run.
