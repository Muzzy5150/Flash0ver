# Swarm expansion implementation map

Baseline: `tenki-verified-v1` at `45dc412`. Development branch: `swarm-expansion`.

The verified provider, policy engine, target runtimes, collector, Wasmer executor, event store, and SSE transport remain the security boundary. The expansion changes orchestration and event-derived presentation around them.

| Phase | Smallest architecture change | Verification boundary |
|---|---|---|
| Multi-worker runtime | Add a bounded batch-delegation tool so the coordinator can assign independent subtasks to multiple instances of the existing role classes. Keep unique IDs, immutable role manifests, the run-wide worker/tool/turn ceilings, and evidence-dependent sequencing between role classes. | Deterministic provider test proves 8 real agents, parallel independent workers, unique identities, worker ceiling, unchanged OFF/ENFORCE outcomes, and multi-hop provenance. |
| Telemetry | Add typed events for worker waiting/retirement, emergent capability formation, attack paths, Sentinel proposals, validated containment, and incident reports. Events contain measured or policy-derived facts only. | Schema and runtime tests prove every new event has a real trigger and no terminal narration is synthesized without a source event. |
| Incident tape and graph | Format persisted runtime events into concise narration; cluster multiple agents by role and derive permissions from each `AGENT_CREATED` capability manifest. | Pure formatter tests plus browser/build checks. |
| Sentinel and containment | Give a proposal-only Sentinel a bounded incident summary. Validate its structured proposal deterministically against an allowlist and the affected agent's original manifest before applying revocation or quarantine. | Tests prove Sentinel cannot grant capabilities, broaden scope, or affect unrelated agents. |
| Adaptive attempts | Count sensitive paths from real policy decisions and allow at most three coordinator-directed attempts using existing typed tools and target-relative paths. | Attempt ceiling and mode-isolation tests. |
| Reconstruction and replay | Build the incident report deterministically from stored events. Replay resets the selected owned range and launches a fresh model-driven run with a new run ID. | Accuracy tests and fresh-run identity test. |

Risk controls:

- The larger profile is selected through `SWARM_PROFILE=expanded`; `classic` preserves the verified four-agent path.
- `TARGET_RUNTIME=local` remains the default and Tenki remains explicit opt-in.
- No individual role gains a service, tool, host, URL, or policy privilege.
- A failed expansion feature reports a technical failure and never substitutes recorded telemetry.
