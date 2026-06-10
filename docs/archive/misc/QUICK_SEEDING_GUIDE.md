# Quick Seeding Guide

## Issue Fixed: Database Connection Error

The seeder script has been updated to correctly load the `.env` file from the `backend` directory.

## How to Run the Seeder

```bash
cd /Users/jefe/Downloads/of-the-galaxy-rpg-foundation
node backend/src/scripts/seed-phase1-content.js
```

## What the Script Does

1. **Loads Environment Variables** - Automatically finds and loads `.env` from `backend/.env`
2. **Checks Database Connection** - Verifies credentials before proceeding
3. **Seeds Content:**
   - NPCs (20+ across 6 factions)
   - Items (40+ quest items)
   - Quests (20+ quests)
   - Planet Data (POIs and resources for 4 planets)

## Expected Output

```
🚀 Seeding Phase 1 & Phase 2 Content...

✓ Loaded .env from: /path/to/backend/.env
🔌 Checking database connection...
   Host: localhost
   Port: 5432
   Database: of_the_galaxy_dev
   User: postgres
   Password: ***

✓ Database connection successful

✓ Database synced

📝 Seeding NPCs...
  [NPCs will be listed here]

✓ NPCs seeded: 20+ new NPCs

🎒 Seeding Items...
  [Items will be listed here]

✓ Items seeded: 40+ items

📜 Seeding Quests...
  [Quests will be listed here]

✓ Quests seeded: 20+ new quests

🌍 Updating Planet Content...
  [Planets will be updated]

✓ Planets updated: 4/4

✅ Phase 1 & Phase 2 content seeded successfully!

Summary:
  - NPCs: 20+ new
  - Items: 40+
  - Quests: 20+ new
  - Planets: 4 updated
```

## Troubleshooting

### If you still get "password authentication failed":

1. **Verify PostgreSQL is running:**
   ```bash
   brew services list  # macOS
   # Look for postgresql - should show "started"
   ```

2. **Test connection manually:**
   ```bash
   psql -h localhost -U postgres -d of_the_galaxy_dev
   ```
   If this fails, your password in `.env` is incorrect.

3. **Check your .env file:**
   - Location: `backend/.env`
   - Should contain: `DB_PASSWORD=your_password` (your actual local Postgres password)

4. **Verify database exists:**
   ```bash
   psql -U postgres -c "\l" | grep of_the_galaxy_dev
   ```
   If it doesn't exist, create it:
   ```bash
   psql -U postgres -c "CREATE DATABASE of_the_galaxy_dev;"
   ```

## Next Steps

After successful seeding:
1. Start the backend server: `cd backend && npm start`
2. Start the frontend: `cd frontend && npm run dev`
3. Follow the `TESTING_GUIDE.md` to test all features



