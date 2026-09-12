# Tenki TargetRuntime

Status: **PARTIALLY VERIFIED**. The adapter, selection rules, fail-closed preflight, lifecycle telemetry, URL confinement, redaction, and cleanup paths are covered by local tests. A real Tenki account lifecycle has not run because `TENKI_API_KEY` is not configured. The verified localhost demo remains available.

## Architecture

`TargetRuntime` remains the only target boundary used by the swarm. `TARGET_RUNTIME=local` selects the verified `LocalTargetRuntime`; `TARGET_RUNTIME=tenki` selects `TenkiTargetRuntime`. The model, coordinator, workers, policy engine, provenance handling, Wasmer executor, collector truth rules, and dashboard do not branch on the selected runtime.

The Tenki adapter uses the official `@tenkicloud/sandbox` SDK to create a fresh project-labeled session. It uploads one dependency-free Node range service containing the same five logical services as the local range: entry, internal, privileged, vault, and collector. The service creates only synthetic recovery artifacts and a worthless rotating canary.

The sandbox is created with outbound networking disabled. Inbound networking is enabled only so Tenki can expose the single range port through an ephemeral HTTPS preview URL. That endpoint requires a random per-session broker bearer token. The token is generated locally, registered with the event bus redactor, passed only to the range process and adapter requests, and never sent to the model.

The model can select only an existing service, relative path, and GET/POST operation through the existing typed tool. The adapter validates the relative path, constructs the URL from its pinned Tenki origin, rejects redirects, and applies the same role, agent, and run-generation headers as the local runtime. Agents cannot supply a hostname or escape to another origin.

Wasmer remains the fine-grained execution boundary for agent-controlled computation. Tenki supplies disposable target infrastructure; it does not replace or bypass Wasmer.

## Configuration

Keep credentials only in the ignored `.env` file:

```dotenv
TARGET_RUNTIME=local
TENKI_API_KEY=
```

Local is the default even when a Tenki credential exists. To opt in, set `TARGET_RUNTIME=tenki` and provide `TENKI_API_KEY`. Explicit Tenki selection fails closed when the credential, authentication, provisioning, health check, or endpoint validation fails. It never silently substitutes localhost.

To return immediately to the guaranteed demo path, set `TARGET_RUNTIME=local` and restart the command or development server. Credential presence alone never enables Tenki.

## Lifecycle

1. **AUTH** calls the Tenki identity API and emits `TENKI_AUTH_OK` or a redacted `TENKI_AUTH_FAILED`.
2. **CREATE** creates a non-sticky disposable sandbox with a 30-minute maximum duration and emits `TENKI_SANDBOX_CREATED` with its ID.
3. **PROVISION** runs a harmless Node version check, uploads the range service, launches it, exposes one authenticated port, validates the returned HTTPS origin, and waits for range and collector health. It emits `TENKI_PROVISION_STARTED`, `TENKI_PROVISION_READY`, or `TENKI_HEALTH_FAILED` from actual results.
4. **USE** routes existing range requests through the adapter. Existing policy evaluation, provenance telemetry, Wasmer gates, and collector-derived outcomes remain unchanged.
5. **RESET** rotates the canary and every synthetic recovery artifact, clears collector state, updates the accepted run ID, and emits `TENKI_RESET`. A stale canary from the previous generation must be rejected.
6. **DESTROY** removes the exposed port, closes the session, refreshes its state where supported, emits `TENKI_SANDBOX_DESTROYED`, and closes the SDK client. Repeated destroy calls are idempotent.

## Verification and cleanup

Run local checks first, then the explicitly labeled live integration harness:

```bash
TARGET_RUNTIME=local npm run verify
TARGET_RUNTIME=local npm run demo:verify
npm run test:tenki-live
```

Without `TENKI_API_KEY`, the live harness prints `TENKI LIVE SKIPPED` and makes no cloud call. With both Tenki and model credentials, it follows the required order: auth, create, harmless command/provision, health, reset and stale-canary rejection, confirmed destroy, one model-driven agent, full OFF run, full ENFORCE run, and confirmed final destroy. Redacted evidence is written to ignored `data/tenki-live-report.json`.

The harness and control plane call destroy in `finally`/shutdown paths. Allow those commands to finish. If the host process is forcibly terminated, use the recorded sandbox ID in local telemetry or the Tenki console to terminate that project-labeled session; the non-sticky session also has a 30-minute maximum duration. Do not report the live integration as verified until the SDK confirms the session is terminal or absent and no orphan remains.

## Current evidence and limitations

- **VERIFIED:** local factory default, explicit Tenki selection, missing-credential failure, invalid-credential redaction, strict preview URL validation, origin-pinned requests, outbound-disabled creation options, broker authentication, provision-failure cleanup, reset telemetry, destroy idempotency, and lifecycle event schema.
- **PARTIALLY VERIFIED:** remote range deployment semantics are implemented and syntax checked; mock lifecycle tests exercise create/provision/health/reset/request/destroy without a cloud account.
- **BLOCKED:** real Tenki auth, sandbox create, remote command, endpoint reachability, canary rotation, stale-canary rejection, model-driven agent interaction, OFF compromise, ENFORCE containment, and orphan-free cloud cleanup. These require `TENKI_API_KEY`.

The local demo does not depend on this external boundary and remains the presentation fallback.
