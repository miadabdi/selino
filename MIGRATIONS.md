# Drizzle Database Migrations Guide

## Overview

This project uses Drizzle ORM and Drizzle Kit for database schema management and migrations. All configuration is in `drizzle.config.ts`.

## Prerequisites

Ensure you have a `DATABASE_URL` environment variable set in your `.env` file:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
```

## Available Commands

### 1. Generate Migrations

Generate SQL migration files from your schema changes:

```bash
npm run db:generate
```

This command:

- Compares your schema files in `src/database/schema/` with the database state
- Generates SQL migration files in the `drizzle/` directory
- Creates a migration with a unique name (e.g., `0000_omniscient_blue_blade.sql`)

### 2. Apply Migrations

Apply all pending migrations to your database:

```bash
npm run db:migrate
```

This command:

- Runs the TypeScript migration script at `src/database/migrate.ts`
- Applies all SQL files from the `drizzle/` directory that haven't been applied yet
- Tracks applied migrations in the database

### 3. Push Schema (Development Only)

Push schema changes directly to the database without generating migration files:

```bash
npm run db:push
```

⚠️ **Warning**: This is useful for rapid prototyping but should **NOT** be used in production. It doesn't create migration history.

### 4. Drizzle Studio

Launch the Drizzle Studio GUI to browse and edit your database:

```bash
npm run db:studio
```

This opens a web interface at `https://local.drizzle.studio` where you can:

- View all tables and their data
- Run queries
- Edit records
- Visualize relationships

### 5. Check Migrations

Check for migration conflicts or issues:

```bash
npm run db:check
```

### 6. Drop Migration

Drop the last migration (useful if you made a mistake):

```bash
npm run db:drop
```

## Workflow

### Development Workflow

1. **Make schema changes** in `src/database/schema/`

   ```typescript
   // Example: Add a new column to users table
   export const users = pgTable("users", {
     id: serial("id").primaryKey(),
     name: varchar("name", { length: 255 }),
     // Add new column
     age: integer("age"),
   });
   ```

2. **Generate migration**

   ```bash
   npm run db:generate
   ```

   This creates a new SQL file in `drizzle/` directory.

3. **Review the generated SQL**

   Check `drizzle/XXXX_migration_name.sql` to ensure it's correct.

4. **Apply migration**

   ```bash
   npm run db:migrate
   ```

5. **Commit both schema and migration files** to version control

### Production Workflow

1. Pull latest code with migrations
2. Run migrations:
   ```bash
   npm run db:migrate
   ```
3. Start your application

## Migration Files Structure

```
drizzle/
├── 0000_first_migration.sql
├── 0001_second_migration.sql
├── 0002_third_migration.sql
└── meta/
    ├── _journal.json
    └── 0000_snapshot.json
```

- Each `.sql` file contains the DDL statements
- The `meta/` directory contains snapshots and migration journal
- Migrations are applied in order

## Best Practices

### ✅ Do's

- **Always generate migrations** for schema changes in production
- **Review generated SQL** before applying
- **Commit migration files** to version control
- **Test migrations** in a development/staging environment first
- **Use `db:push`** only in local development for quick prototyping

### ❌ Don'ts

- **Never use `db:push` in production** - it doesn't create migration history
- **Don't manually edit** applied migration files
- **Don't delete** migration files that have been applied
- **Don't skip migrations** - they must be applied in sequence

## Common Scenarios

### Adding a New Table

1. Create schema file: `src/database/schema/my-table.schema.ts`
2. Export from `src/database/schema/index.ts`
3. Run `npm run db:generate`
4. Run `npm run db:migrate`

### Adding a Column

1. Edit the table schema file
2. Add the new column definition
3. Run `npm run db:generate`
4. Review the generated ALTER TABLE statement
5. Run `npm run db:migrate`

### Renaming a Column

⚠️ Be careful! Drizzle might interpret this as a DROP + ADD.

Option 1: Manual migration

```sql
-- Edit the generated migration file
ALTER TABLE "users" RENAME COLUMN "old_name" TO "new_name";
```

Option 2: Use two-step migration

1. Add new column
2. Migrate data
3. Remove old column

### Rolling Back

Drizzle doesn't have built-in rollback. To revert:

1. Create a new migration that reverses the changes
2. Or restore from a database backup

## Troubleshooting

### "Module not found" errors

Ensure all imports in `src/database/schema/` use relative paths **without** `.js` extensions:

```typescript
// ✅ Correct
import { users } from "./users.schema";

// ❌ Wrong for Drizzle Kit
import { users } from "./users.schema.js";
```

### Migration conflicts

If you have conflicts:

```bash
npm run db:check   # Check for issues
npm run db:drop    # Drop last migration if needed
npm run db:generate # Regenerate
```

### Database connection issues

Verify your `DATABASE_URL` in `.env`:

```bash
echo $DATABASE_URL  # Check if set
```

## Integration with Application

The migrations are applied programmatically via `src/database/migrate.ts`, which:

1. Loads environment variables
2. Creates a database connection
3. Runs the `migrate()` function from `drizzle-orm/postgres-js/migrator`
4. Reads SQL files from the `drizzle/` directory
5. Applies them in order

You can also run this as part of your application startup or deployment process.

## Additional Resources

- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Drizzle Kit Documentation](https://orm.drizzle.team/kit-docs/overview)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
