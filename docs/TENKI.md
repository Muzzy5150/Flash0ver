# Tenki TargetRuntime preparation

Tenki remains disabled. `TARGET_RUNTIME=local` is the default and the control plane always selects `LocalTargetRuntime`. If `TARGET_RUNTIME=tenki` is requested today, the factory returns the local runtime with an explicit fallback reason; it never attempts a cloud deployment.

The existing `TargetRuntime` contract is the integration boundary:

- `start`: create one disposable session, upload only the synthetic range bundle, start five loopback-bound range services, and establish authenticated data-plane access.
- `reset`: rotate the worthless canary and all synthetic recovery artifacts for a new run ID without changing capability boundaries.
- `request`: route only typed `RangeRequest` values to the named owned service. Preserve relative-path validation, broker authentication, role headers, run generation, timeouts, and abort signals.
- `health`: report all five range services plus current-run collector state.
- `stop`: close the session and verify termination. Emit lifecycle telemetry without credentials.

Implementation gates before Tenki may be enabled:

1. Use an explicit opt-in separate from `TARGET_RUNTIME`; credentials alone must never enable it.
2. Default inbound and outbound networking to disabled. Any required control tunnel must be narrowly scoped to the created session.
3. Prove stale generations, wrong canaries, path escapes, and role-boundary requests fail exactly as they do locally.
4. Add idempotent cleanup by recorded session ID and validate cleanup after cancellation, timeout, and process termination.
5. Run the full OFF/MONITOR/ENFORCE suite against Tenki while retaining localhost as the automatic presentation fallback.
6. Keep Tenki status `DEGRADED` until those checks pass; never report `READY` from credential presence alone.

No Tenki API calls, sessions, templates, tunnels, or cleanup operations are implemented or executed in the current phase.
