# Security model

FLASH0VER assumes model output and range documents are untrusted. It constrains effects with typed tools, Zod schemas, fixed service names, relative paths, role manifests, request timeouts, and a broker token unavailable to agents.

Wasmer executes agent-supplied Python with only explicit virtual files and `FLASH0VER_SAFE_*` environment values. Networking is disabled. The host filesystem is never mounted. The initialized Wasmer engine is reused for latency, while every command receives a fresh sandbox so files, environment, and process state cannot cross calls. A worker thread provides a hard outer timeout around Wasmer initialization and execution.

Provenance forms a graph across target observations, derived artifacts, and agent messages. The prototype policy triggers when untrusted range information crosses agent boundaries and reaches `/authorize`, `/canary`, or `/collector`. OFF allows and records it. MONITOR allows and warns. ENFORCE denies it. Role and revoked-capability checks deny in every mode.

The canary is newly generated on reset. Telemetry redacts canary-shaped values and common API-key shapes. Provider errors disclose status and configuration guidance, not response bodies or credentials.

Known boundary: the Tenki `TargetRuntime` lifecycle is documented and the selection seam is prepared, but deployment remains disabled and unimplemented. SQLite uses Node's experimental built-in API. The information-flow model is a defensible prototype rather than language-level taint enforcement.
