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

Coordinator delegation is model-driven. The current recon → analyst → operator chain remains sequential because each worker requires artifacts returned by the prior role. Worker calls are bounded by per-agent turns, total tool calls, worker count, provider timeout, and run timeout. Events are emitted by actual state transitions and HTTP results.

The Wasmer engine is initialized before a demo run and reused to avoid repeated engine startup. Each command still creates and closes a fresh sandbox with disabled networking, an empty virtual workspace, and explicit safe environment values. `RUN_TIMING` and component events record model, worker, tool, Wasmer, HTTP, and SQLite persistence latency.

Target selection is isolated behind `TargetRuntime`. Local is the default and guaranteed fallback. The Tenki selection seam is present but disabled; it does not make cloud API calls.
