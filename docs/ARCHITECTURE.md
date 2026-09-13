# Architecture

The long-running TypeScript control plane owns a SQLite event bus, five localhost HTTP services, the model adapter, the agent orchestrator, deterministic policy, provenance, and Wasmer. Next.js reads state through JSON controls and a real SSE stream.

```text
Dashboard ← SSE/JSON ← Control plane ← model provider
                         │     │
                   policy     Wasmer capability gate
                         │     │
                         └── trusted range broker
                              entry → internal → privileged → vault → collector
```

The model never receives a shell, socket, hostname, port, or arbitrary URL tool. A validated request names one owned service and a relative path. The trusted broker adds an unguessable internal authorization header and the worker's role. Each range service enforces that role again.

Coordinator delegation is model-driven. `SWARM_PROFILE=classic` preserves the verified four-agent path. `SWARM_PROFILE=expanded` requires three recon, two analyst, and two operator workers, with independent same-role tasks executed concurrently and evidence-dependent role stages kept ordered. Every worker retains its existing service and tool manifest. Per-agent turns, total tool calls, expanded worker count, provider timeout, and run timeout remain bounded.

In expanded ENFORCE mode, a real proposal-only Sentinel may activate after a composition-policy denial. It receives a bounded event summary, has no target service or tool access, and returns one structured containment proposal. Deterministic validation restricts the proposal to one known agent and an existing capability, tool, or message path. The runtime can revoke that capability, quarantine or terminate that worker, block that path, or deny that tool class. Sentinel cannot grant access or alter policy.

The event store remains the source of truth for the stage graph, incident tape, metrics, emergent-capability reveal, and deterministic incident report. Every narration line retains the source event ID. `NEW LIVE REPLAY` resets the owned range and launches a fresh model-driven run with a new run ID; it never replays stored events as execution.

The Wasmer engine is initialized before a demo run and reused to avoid repeated engine startup. Each command still creates and closes a fresh sandbox with disabled networking, an empty virtual workspace, and explicit safe environment values. `RUN_TIMING` and component events record model, worker, tool, Wasmer, HTTP, and SQLite persistence latency.

Target selection is isolated behind `TargetRuntime`. Local is the default and guaranteed fallback. Tenki remains explicit opt-in and keeps its already verified create/use/destroy lifecycle; the swarm expansion does not change either target implementation.
