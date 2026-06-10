# Troubleshooting Guide

## Common Issues and Solutions

This guide addresses common issues you may encounter when setting up or running the Of the Galaxy RPG Foundation.

---

## Database Issues

### Issue: "Database connection refused"

**Symptoms:**
```
✗ Unable to connect to the database
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solutions:**

1. **Check if PostgreSQL is running:**
   ```bash
   # On Ubuntu/Debian
   sudo systemctl status postgresql
   
   # On macOS
   brew services list
   ```

2. **Start PostgreSQL if it's not running:**
   ```bash
   # On Ubuntu/Debian
   sudo systemctl start postgresql
   
   # On macOS
   brew services start postgresql
   ```

3. **Verify database credentials in `.env`:**
   - Ensure `DB_HOST`, `DB_PORT`, `DB_USER`, and `DB_PASSWORD` are correct
   - Default PostgreSQL port is `5432`

4. **Test connection manually:**
   ```bash
   psql -h localhost -U postgres -d of_the_galaxy_dev
   ```

---

### Issue: "Database does not exist"

**Symptoms:**
```
✗ Database "of_the_galaxy_dev" does not exist
```

**Solution:**

Create the database manually:
```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE of_the_galaxy_dev;

# Exit
\q
```

---

### Issue: "Users table not found during migration"

**Symptoms:**
```
✗ ERROR: The 'users' table was not found.
```

**Explanation:**

The RPG foundation assumes you have an existing `users` table from your main application's authentication system.

**Solutions:**

1. **If you have an existing auth system:**
   - Run your main application's migrations first
   - Then run the RPG foundation migrations

2. **If you don't have a users table:**
   - Create a minimal users table:
   ```sql
   CREATE TABLE users (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     email VARCHAR(255) UNIQUE NOT NULL,
     password_hash VARCHAR(255) NOT NULL,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );
   ```

3. **For standalone testing:**
   - Comment out the users table check in `backend/src/migrations/run.js` (lines 60-67)
   - Modify the migration to create a users table first

---

## Backend Issues

### Issue: "JWT_SECRET must be set"

**Symptoms:**
```
FATAL: JWT_SECRET environment variable must be set
```

**Solution:**

1. **Generate a secure JWT secret:**
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **Add it to your `.env` file:**
   ```env
   JWT_SECRET=your_generated_secret_here
   ```

3. **Restart the backend server**

---

### Issue: "Port 3001 is already in use"

**Symptoms:**
```
Error: listen EADDRINUSE: address already in use :::3001
```

**Solutions:**

1. **Find and kill the process using port 3001:**
   ```bash
   # On Linux/macOS
   lsof -ti:3001 | xargs kill -9
   
   # On Windows
   netstat -ano | findstr :3001
   taskkill /PID <PID> /F
   ```

2. **Or change the port in `.env`:**
   ```env
   PORT=3002
   ```

---

### Issue: "express-validator not found"

**Symptoms:**
```
Error: Cannot find module 'express-validator'
```

**Solution:**

Install missing dependencies:
```bash
cd backend
npm install
```

If the issue persists:
```bash
npm install express-validator express-rate-limit --save
```

---

## Frontend Issues

### Issue: "Failed to fetch"

**Symptoms:**
- Frontend loads but API calls fail
- Console shows: `Failed to fetch` or `Network Error`

**Solutions:**

1. **Verify backend is running:**
   ```bash
   curl http://localhost:3001/health
   ```

2. **Check CORS configuration:**
   - Ensure `CORS_ORIGIN` in backend `.env` matches your frontend URL
   - Default: `http://localhost:5173`

3. **Check API URL in frontend `.env`:**
   ```env
   VITE_API_URL=http://localhost:3001/api
   ```

4. **Restart both servers after changing environment variables**

---

### Issue: "Cannot find module './App'"

**Symptoms:**
```
Error: Cannot find module './App'
```

**Solution:**

Ensure all frontend entry files exist:
- `frontend/index.html`
- `frontend/src/main.jsx`
- `frontend/src/App.jsx`

If missing, extract the updated package (v2).

---

### Issue: "Blank page after starting frontend"

**Solutions:**

1. **Check browser console for errors** (F12)

2. **Verify Vite dev server is running:**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Clear browser cache and reload**

4. **Check if React Router is working:**
   - Try navigating to `http://localhost:5173/`

---

## Authentication Issues

### Issue: "No token provided"

**Symptoms:**
```json
{
  "success": false,
  "message": "No token provided"
}
```

**Explanation:**

The API routes require authentication, but no JWT token was sent.

**Solutions:**

1. **For development/testing:**
   - Temporarily remove `authenticate` middleware from routes
   - Or create a test user and generate a token

2. **To generate a test token:**
   ```javascript
   const jwt = require('jsonwebtoken');
   const token = jwt.sign(
     { userId: 'test-user-id', email: 'test@example.com' },
     process.env.JWT_SECRET,
     { expiresIn: '7d' }
   );
   console.log(token);
   ```

3. **Use the token in API requests:**
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3001/api/characters
   ```

---

## Migration Issues

### Issue: "Migration already executed"

**Symptoms:**
```
✨ Database is already up to date. No migrations to run.
```

**Explanation:**

Migrations have already been run. This is normal.

**To re-run migrations:**

1. **Drop all tables** (WARNING: This deletes all data):
   ```sql
   DROP TABLE IF EXISTS player_characters, quests, quest_progress, npcs, npc_relationships, player_inventory, "SequelizeMeta" CASCADE;
   ```

2. **Run migrations again:**
   ```bash
   npm run migrate
   ```

---

### Issue: "Sequelize model not found"

**Symptoms:**
```
Error: Cannot find module '../models/PlayerCharacter'
```

**Solution:**

Ensure all model files exist in `backend/src/models/`:
- `PlayerCharacter.js`
- `Quest.js`
- `QuestProgress.js`
- `NPC.js`
- `NPCRelationship.js`
- `PlayerInventory.js`
- `index.js`

---

## Seeding Issues

### Issue: "Quest file not found"

**Symptoms:**
```
Error: ENOENT: no such file or directory
```

**Solution:**

Ensure content files exist:
```bash
ls -la content/factions/independent_investigators/main_quests/
ls -la content/factions/independent_investigators/npcs/
```

If missing, extract the full package.

---

### Issue: "Duplicate key value violates unique constraint"

**Symptoms:**
```
Error: duplicate key value violates unique constraint "quests_pkey"
```

**Explanation:**

Seeds have already been run. The seeder uses `findOrCreate`, so this shouldn't happen unless there's a data conflict.

**Solution:**

Seeds are idempotent. If you see this error, it means the quest already exists. This is safe to ignore.

---

## Performance Issues

### Issue: "Slow API responses"

**Solutions:**

1. **Check database indexes:**
   - Migrations should create indexes automatically
   - Verify with: `\d player_characters` in psql

2. **Enable query logging:**
   ```javascript
   // In backend/config/database.js
   logging: console.log
   ```

3. **Check for N+1 queries:**
   - Use Sequelize `include` for eager loading

---

### Issue: "High memory usage"

**Solutions:**

1. **Limit query results:**
   ```javascript
   Character.findAll({ limit: 100 })
   ```

2. **Use pagination:**
   ```javascript
   Character.findAll({ 
     limit: 20, 
     offset: page * 20 
   })
   ```

---

## Integration Issues

### Issue: "Cannot integrate with existing codebase"

**Symptoms:**
- Model conflicts
- Route conflicts
- State management conflicts

**Solutions:**

1. **Read the Integration Guide:**
   - `docs/INTEGRATION_GUIDE.md` has detailed instructions

2. **Namespace your routes:**
   ```javascript
   app.use('/api/rpg/characters', characterRoutes);
   ```

3. **Use separate state stores:**
   - The RPG uses Zustand, which won't conflict with Redux

4. **Merge database migrations carefully:**
   - Review migration files before running
   - Adjust foreign keys to match your schema

---

## Still Having Issues?

If you're still experiencing problems:

1. **Check the logs:**
   - Backend: Console output where you ran `npm run dev`
   - Frontend: Browser console (F12)
   - Database: PostgreSQL logs

2. **Enable debug mode:**
   ```env
   NODE_ENV=development
   LOG_LEVEL=debug
   ```

3. **Verify all dependencies are installed:**
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```

4. **Try a fresh install:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

5. **Check environment variables:**
   ```bash
   # In backend directory
   cat .env
   
   # In frontend directory
   cat .env
   ```

---

## Getting Help

If none of these solutions work:

1. **Check the error message carefully** - It usually tells you exactly what's wrong
2. **Search for the error message** online
3. **Review the code** where the error occurs
4. **Create a minimal reproduction** of the issue
5. **Document the steps** that led to the error

---

**Last Updated:** November 24, 2025
