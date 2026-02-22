import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema/index";

export type Database = ReturnType<typeof drizzle<typeof schema>>;

export type TransactionType = Parameters<
  Parameters<Database["transaction"]>[0]
>[0];

export type DBContext = Database | TransactionType;
