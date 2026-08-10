
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

# 0.2.1 (May 09th 2026)

- Update @dwtechs/winstan dependency to version 0.7.0
- Validate PORT environment variable (must be an integer in range 1–65535, defaults to 3000)
- Replace `process.on()` with `process.once()` for signal handlers to prevent duplicate handlers and double-close

# 0.2.0 (Sep 23th 2025)

- Add "SIGHUP" event to the list of supported events.
- expose **close()** function to close the server programmatically if needed

# 0.1.0 (Sep 22th 2025)

- Initial release
