
# 0.3.1 (Aug 10th 2026)

- **`listen()` now handles bind failures cleanly.** Previously
  `EADDRINUSE` / `EACCES` / `EADDRNOTAVAIL` fired on the underlying
  `http.Server`'s async `error` event, which had no listener attached — Node's
  default handler produced an unprefixed stack trace and a non-zero exit.
  A listener is now installed that routes pre-bind errors through `failFast`
  (`App cannot start: ...`) and post-bind runtime errors as
  `Server error after listening: ...`, both with a deferred `process.exit(1)`
  for stderr-flush parity. The pre-vs-post-bind phrasing lets operators grep
  post-incident logs to answer "did the app ever start?" cleanly.
- **`close()` now has a shutdown timeout.** `server.close()` waits for all
  existing connections (including HTTP keep-alive, SSE, WebSocket, and
  long-polling) before invoking its callback — indefinitely, in practice.
  Long-lived connections would previously block the callback until the
  orchestrator's grace period expired and SIGKILL landed, producing dirty
  exits with no diagnostic log. A force-exit timer (default `10000` ms,
  configurable via `SHUTDOWN_TIMEOUT_MS`) now guarantees a clean self-exit
  within your own grace window with an explanatory log line. The timer is
  `unref`'d so it does not itself keep the event loop alive.
- **`close()`'s success exit is now deferred via `setImmediate`.** The final
  `Service closed` log line was being truncated on piped stderr/stdout
  (Docker, systemd-journald, PM2) by a synchronous `process.exit(0)`. Same
  fix as `failFast`, applied to the shutdown path for consistency.
- **`close()` now surfaces the callback's `err` argument.** The Node API
  `server.close(cb)` can invoke `cb` with an error (typically
  `ERR_SERVER_NOT_RUNNING` after a double-close). Previously ignored; now
  logged distinctly as `Service close reported error: ...` and exit 1.
- Internal: extracted a private `logAndExit(prefix, err, code)` helper that
  now backs `failFast`, the `listen()` error path, and both failure paths
  in `close()`. Single source of truth for the error-log-plus-deferred-exit
  ceremony (`err.message` / `err.msg` / `String(err)` fallback + optional
  stack line + `setImmediate` guard). No public API changes.

# 0.3.0 (Aug 09th 2026)

- Expose **failFast(err)** function: a terminal `.catch` handler for the
  pre-`listen()` initialization pipeline (`Promise.all([...init()]).catch(failFast)`).
- Encapsulates the correct boot-failure exit sequence — logs the error (message
  + stack) with the `[servpico-express]` prefix, then defers `process.exit(1)`
  via `setImmediate` so the log line can flush to stderr on piped destinations
  (Docker, systemd-journald, PM2).
- Fixes a class of zombie-process bug where a rejected `init()` promise would
  leave the Node runtime alive (open handles from DB pools, etc.) with no HTTP
  port bound — because `listen()`'s SIGTERM/SIGINT/SIGHUP handlers had never
  been registered on that path.
- Accepts `{ message }`, `{ msg }`, string, and null/undefined error shapes so
  it composes with mixed-shape error sources (e.g. `@dwtechs/antity-pgsql`'s
  `Select.execute` throws `{ status, message }` while other paths throw `Error`).
- Return type is `never` — TypeScript recognizes calls to `failFast` as
  terminating, keeping downstream unreachable-code diagnostics accurate.
- Update @dwtechs/winstan dependency to version 0.7.1

# 0.2.1 (May 09th 2026)

- Update @dwtechs/winstan dependency to version 0.7.0
- Validate PORT environment variable (must be an integer in range 1–65535, defaults to 3000)
- Replace `process.on()` with `process.once()` for signal handlers to prevent duplicate handlers and double-close

# 0.2.0 (Sep 23th 2025)

- Add "SIGHUP" event to the list of supported events.
- expose **close()** function to close the server programmatically if needed

# 0.1.0 (Sep 22th 2025)

- Initial release
