import { closeRepository, getDatabaseUrl, initializeDatabase } from "./repository.js";

try {
  await initializeDatabase();
  console.log(`Database schema is ready: ${redactDatabaseUrl(getDatabaseUrl())}`);
} finally {
  await closeRepository();
}

function redactDatabaseUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.password) url.password = "****";
    return url.toString();
  } catch {
    return value.replace(/:\/\/([^:]+):([^@]+)@/, "://$1:****@");
  }
}
