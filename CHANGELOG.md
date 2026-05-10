
# 0.2.1 (May 09th 2026)

- Update @dwtechs/winstan dependency to version 0.7.0
- Validate PORT environment variable (must be an integer in range 1–65535, defaults to 3000)
- Replace `process.on()` with `process.once()` for signal handlers to prevent duplicate handlers and double-close

# 0.2.0 (Sep 23th 2025)

- Add "SIGHUP" event to the list of supported events.
- expose **close()** function to close the server programmatically if needed

# 0.1.0 (Sep 22th 2025)

- Initial release
