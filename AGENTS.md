# Codex project instructions

## Windows command execution

- This project runs in PowerShell on Windows.
- Always invoke Node package-manager shims as `npm.cmd` and `npx.cmd`.
- Do not invoke bare `npm` or `npx`; PowerShell resolves their blocked `.ps1` wrappers before
  the usable `.cmd` wrappers on this machine.

## Project validation

- `npm.cmd run lint` can run normally inside the sandbox.
- Request narrowly scoped outside-sandbox execution (`require_escalated`) before running any of
  these commands; do not first run them inside the restricted sandbox:
  - `npm.cmd run build`
  - `npm.cmd run check`
  - `npm.cmd run test:e2e`
- When Vite or esbuild runs inside the restricted Windows sandbox, it may fail while loading
  `vite.config.ts` with `Cannot read directory "../../../..": Access is denied`.
- That access-denied message is an execution-environment failure, not a project diagnostic. Use
  the outside-sandbox result as authoritative and do not report the sandbox failure as a project
  error when that run succeeds.
- If outside-sandbox execution is not approved, report that validation could not be completed;
  do not reinterpret the sandbox access error as a source-code failure.
