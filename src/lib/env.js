// Loads .env into process.env when the file exists. A missing file is fine:
// CI and production inject variables directly (NFR-007, no committed secrets).
try {
  process.loadEnvFile();
} catch (err) {
  if (err.code !== "ENOENT") throw err;
}