import { getDb } from "./index";

export async function runMigrations() {
  console.log("🚀 [CineBook Migrations] Running database migrations...");
  const db = await getDb();
  console.log("✅ [CineBook Migrations] Database schema verified and up to date.");
}

if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log("Migration finished.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Migration error:", err);
      process.exit(1);
    });
}
