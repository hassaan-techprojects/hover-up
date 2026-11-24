import "dotenv/config";
import { defineConfig } from "prisma/config";

// `prisma generate` doesn't need a database URL, so avoid `env()` which throws
// when the variable is missing (e.g. Preview builds without DB credentials).
export default defineConfig({
  schema: "prisma/schema.prisma",

  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },

  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
});
