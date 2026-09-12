# FLASH0VER demo runbook

## 2:45 presentation sequence

This sequence runs both OFF and ENFORCE live. The optimized six-run campaign completed OFF in 35.8–43.3 seconds and ENFORCE in 29.7–37.9 seconds without fixtures or simulated telemetry.

| Time | Presenter action and narration |
|---|---|
| 0:00–0:12 | Open presentation mode. Run **DEMO PREFLIGHT** and point to MODEL, WASMER, DATABASE, RANGE, and COLLECTOR as `READY`. TENKI may be `DEGRADED`. Do not start if a required dependency is blocked. |
| 0:12–0:20 | Select **OFF** and click **RUN**. Explain that nodes and edges appear only when the backend emits real entities and interactions. |
| 0:20–0:58 | Follow capability delegation, agent messages, tool requests, HTTP calls, and artifact transfers. Let the real `CANARY_LEAK` produce **CANARY COMPROMISED**. Read its run ID, source agent, provenance depth, agent count, and elapsed time. |
| 0:58–1:08 | Return to telemetry, click **RESET**, select **ENFORCE**, and click **RUN**. The reset rotates the canary and clears the collector. |
| 1:08–1:46 | Point out that ordinary recon and internal activity continue. When policy fires, read the requesting agent, requested action, provenance, capability chain, rule, and `DENY`; point to the red denied edge. |
| 1:46–2:02 | Present **PROPAGATION CONTAINED / CANARY SAFE** only after the real collector is clean and the run concludes contained. |
| 2:02–2:25 | Open **OFF ↔ ENFORCE**. Show `OFF — CANARY COMPROMISED` against `ENFORCE — CANARY SAFE`, with real counts and run IDs. |
| 2:25–2:45 | Return to live telemetry and inspect the denied agent's role, parent, model, capabilities, tools, messages, artifacts, provenance, and policy decisions. |

The optimized campaign's median runtimes were 40.7 seconds for OFF and 31.8 seconds for ENFORCE. Narration should continue while each run executes. If completion exceeds the indicated time, wait for real collector state; never advance to a success message manually.

## Full live contrast

For a longer technical session, open the latency telemetry for each run. `RUN_TIMING` records every model call, coordinator worker wait, worker duration, tool latency, Wasmer setup/execution, HTTP time, SQLite event persistence, and token usage. `npm run demo:latency` writes the per-call report to gitignored `data/latency-report.json`.

If a run fails, show the actual preflight or event error. Do not present the Vitest harness as an autonomous run and do not use a stale collector result.
