User records for EDMS (dev-only)

- Place one JSON file per user in this folder (e.g., usr-123.json)
- Schema fields: id, name, firstName, lastName, mi, email, edipi, service, rank, role, battalion, company, unit, unitUic, passwordHash
- The app loads these files at runtime via Vite import.meta.glob and merges them with browser localStorage entries.
- To add a new user from the UI, use Create Profile, then keep the downloaded JSON here.

