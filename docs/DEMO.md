# FLASH0VER live demo runbook

The primary sequence is 3:05 using the final measured OFF runtime of 35.11s and ENFORCE runtime of 23.72s. The screen remains driven by the current run's real backend telemetry and collector state.

## Before the audience arrives

Run:

```bash
TARGET_RUNTIME=local npm run demo:rehearse
TARGET_RUNTIME=local npm run dev
```

Open `http://127.0.0.1:3000`. On **DEMO PREFLIGHT**, press **RUN CHECKS**. Proceed only when MODEL, WASMER, DATABASE, RANGE, and COLLECTOR show **READY** and the page displays **DEMO READY**. TENKI may remain **DEGRADED**. Press **RESET RANGE** once, return to **PREFLIGHT**, rerun the checks, and leave the readiness page projected. Use 1280×720 or 1920×1080 at 100% browser zoom.

The local runtime remains the guaranteed presentation path. Use Tenki only after `npm run test:tenki-live` has completed every live phase and confirmed both sandbox destructions. Then start a fresh demo control plane with `TARGET_RUNTIME=tenki npm run dev` and require TENKI, RANGE, and COLLECTOR to show **READY**. A configured key or a sandbox-create event alone is not sufficient evidence. If Tenki is unavailable, stop the server, set `TARGET_RUNTIME=local`, restart, and rerun preflight.

The 2026-09-12 live Tenki rehearsal completed the full two-sandbox lifecycle. OFF compromised the current remote canary in 42.78s; ENFORCE contained propagation with a clean remote collector in 25.87s. Both sandboxes were confirmed destroyed and the final active FLASH0VER sandbox count was 0. The post-cloud local check then completed OFF in 30.14s and ENFORCE in 26.78s with the same expected collector outcomes.

## Exact 3:05 presentation

| Time | Button / screen | Exact presenter words |
|---|---|---|
| 0:00–0:15 | Show **DEMO PREFLIGHT**. | “FLASH0VER is running against our disposable local AI-security range. These are live checks: the model provider, Wasmer sandbox, database, range, and collector are ready. Tenki is optional and is not part of this local guarantee.” |
| 0:15–0:25 | Press **ENTER STAGE**. Select **OFF**, then press **RUN**. | “First I’ll remove runtime enforcement. Nothing on this graph is staged: an agent, service, or edge appears only when the backend emits the corresponding event.” |
| 0:25–0:45 | Point to new worker nodes and the progression strip. | “The coordinator is choosing constrained workers. Each worker has its own identity, parent, role, model, and capability set. The system is composing their results without a hard-coded solution path.” |
| 0:45–1:00 | Follow the newest animated edge and service nodes. | “Purple is an agent message, amber is a tool request, cyan is a real HTTP call, white carries provenance, and green delegates capability. The graph is showing the current run only.” |
| 1:00–1:15 | Wait for the real collector event and show **CANARY COMPROMISED**. | “The real collector received the current rotating canary. FLASH0VER was off, so individually limited capabilities composed into a compromise. This evidence is from this run: four agents, eighteen model calls, fourteen tool calls, thirty-five seconds, and twelve provenance hops.” |
| 1:15–1:27 | Press **RESET RANGE**. Select **ENFORCE**, then press **RUN**. | “Reset rotates the canary, clears the collector, and removes the previous run from the live view. Now I’ll repeat the model-driven run with deterministic enforcement.” |
| 1:27–1:47 | Follow ordinary agent and HTTP activity. | “Recon and analysis continue. FLASH0VER does not stop ordinary permitted work. It evaluates the requested operation together with the agent, capability chain, and provenance path.” |
| 1:47–2:00 | On **POLICY BLOCK**, point to action, agent, rule, and denied edge. | “Here is the exact decision: this operator requested privileged authorization. The `SWARM_CAPABILITY_COMPOSITION` rule saw the composed chain and denied that edge. The collector has not been declared safe yet; the screen is still waiting for confirmation.” |
| 2:00–2:15 | Wait for **PROPAGATION CONTAINED / CANARY SAFE**. | “Now the run has concluded and the current collector is confirmed clean. Propagation was contained after fourteen model calls and ten tool calls. This success state cannot appear from the block alone.” |
| 2:15–2:42 | Press **RETURN TO TELEMETRY**, then **OFF ↔ ENFORCE**. | “These are two persisted real run IDs. OFF reached the collector. ENFORCE allowed the same ordinary stages but denied the dangerous composition, and the collector remained safe.” |
| 2:42–2:58 | Press **LIVE STAGE** and select the operator node. | “If you want the technical record, every agent is inspectable: identity, role, parent, model, capabilities, tools, messages, artifacts, provenance, and policy decisions.” |
| 2:58–3:05 | Leave the graph or comparison visible. | “FLASH0VER makes cross-agent capability composition visible and enforces it at runtime, while the model and sandboxed execution remain real.” |

If a live run takes longer than the measured window, continue describing the active agent, latest real edge, or progression strip. Wait for the actual collector result. Never dismiss a technical failure as a successful outcome.

## Emergency recovery

- **Preflight is not ready:** Do not press RUN. Read the failing component aloud, press **RUN CHECKS** once, and continue only after every mandatory local component is **READY**. TENKI may be **DEGRADED**.
- **Explicit Tenki mode is blocked:** Do not press RUN and do not describe localhost as cloud execution. Restart with `TARGET_RUNTIME=local npm run dev`, rerun checks, and use the verified local presentation path.
- **Telemetry link lost:** The dashboard shows **TELEMETRY LINK LOST** and disables RUN. Wait for **TELEMETRY LIVE**. If it does not reconnect, restart `npm run dev`, reload the page, press **RUN CHECKS**, then **RESET RANGE**.
- **Model, target, collector, Wasmer, or timeout failure:** Leave the **TECHNICAL FAILURE** or **RUN STOPPED / NO SUCCESS STATE DISPLAYED** panel visible. Press **RESET RANGE**, return to **PREFLIGHT**, and rerun checks. Do not use a prior run as the current result.
- **Run is active but must stop:** Press **KILL SWARM**. Confirm **RUN STOPPED**, then press **RESET RANGE**. The current event tape should return to 0 and the header should show **NO ACTIVE RUN**.
- **Immediately after compromise or a policy block:** Press **RESET RANGE** on the modal. This stops any active work, rotates the canary, clears the collector, and clears the current live view.
- **Native fullscreen fails:** The presentation layout remains active. Use the browser or projector fullscreen control; the demo behavior is unchanged.

## Technical follow-up

`RUN_TIMING` records model calls, coordinator wait, worker duration, tool latency, Wasmer execution, HTTP time, SQLite persistence, and token usage. Run `npm run demo:latency` to write the redacted per-call report to gitignored `data/latency-report.json`. Keep the existing reliability evidence available with `npm run demo:reliability`.
