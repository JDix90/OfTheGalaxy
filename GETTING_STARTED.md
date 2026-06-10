# Getting Started: Version 2

## Quick Start Guide

This guide will help you get the application running quickly.

---

## Prerequisites

✅ **Node.js** (v18.x or later) - You have v22.14.0  
✅ **npm** (v9.x or later)  
✅ **PostgreSQL** (v14 or later)  
✅ **Dependencies Installed** - ✅ Complete

---

## Step 1: Database Setup

1. **Start PostgreSQL** (if not already running):
   ```bash
   # macOS
   brew services start postgresql
   
   # Linux
   sudo systemctl start postgresql
   ```

2. **Create the database:**
   ```bash
   psql -U postgres
   CREATE DATABASE of_the_galaxy_dev;
   \q
   ```

---

## Step 2: Backend Configuration

1. **Navigate to backend:**
   ```bash
   cd backend
   ```

2. **Create `.env` file:**
   ```bash
   cp .env.example .env
   ```

3. **Edit `.env` with your database credentials:**
   ```env
   NODE_ENV=development
   PORT=3001
   
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=of_the_galaxy_dev
   DB_USER=postgres
   DB_PASSWORD=your_postgres_password_here
   
   JWT_SECRET=your_random_secret_here
   JWT_EXPIRES_IN=7d
   
   CORS_ORIGIN=http://localhost:5173
   ```

4. **Generate JWT Secret:**
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   Copy the output and paste it as `JWT_SECRET` in your `.env` file.

---

## Step 3: Run Database Migrations

```bash
cd backend
npm run migrate
```

You should see:
```
✓ Database connection established successfully
✓ Migration tracking table ready
▶  Running 001-create-rpg-tables.js...
✓ Completed 001-create-rpg-tables.js
✓ All migrations completed successfully
```

**Note:** If you get an error about the `users` table not existing, see `TROUBLESHOOTING.md` for solutions.

---

## Step 4: Seed Database (Optional)

```bash
cd backend
npm run seed
```

This loads quests and NPCs from the `content/` directory.

---

## Step 5: Start Backend Server

```bash
cd backend
npm run dev
```

You should see:
```
✓ Database connection established successfully
✓ Database synchronized
✓ Server running on port 3001
✓ Environment: development
```

**Test the backend:**
```bash
curl http://localhost:3001/health
```

Should return:
```json
{"success":true,"message":"Server is running","timestamp":"..."}
```

---

## Step 6: Frontend Configuration

1. **Navigate to frontend:**
   ```bash
   cd frontend
   ```

2. **Create `.env` file (optional):**
   ```bash
   cp .env.example .env
   ```

   The default API URL is already configured, but you can customize:
   ```env
   VITE_API_URL=http://localhost:3001/api
   ```

---

## Step 7: Start Frontend Server

```bash
cd frontend
npm run dev
```

You should see:
```
VITE v5.0.8  ready in 500 ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

---

## Step 8: Access the Application

1. **Open your browser:**
   Navigate to `http://localhost:5173`

2. **You should see:**
   - Landing page with "Of the Galaxy" title
   - "Start Game" button

3. **Note:** To create a character, you'll need:
   - A valid JWT token (from your existing auth system)
   - Or temporarily modify routes to skip authentication for testing

---

## Testing the Application

### Test Backend API:

```bash
# Health check
curl http://localhost:3001/health

# Get characters (requires auth token)
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3001/api/characters
```

### Test Frontend:

1. Open `http://localhost:5173`
2. You should see the landing page
3. Click "Start Game" to navigate to character selection

---

## Troubleshooting

If you encounter issues:

1. **Check `TROUBLESHOOTING.md`** for common solutions
2. **Verify environment variables** are set correctly
3. **Check database connection** - Ensure PostgreSQL is running
4. **Check ports** - Ensure 3001 (backend) and 5173 (frontend) are available

---

## Next Steps

1. **Set up authentication** - Connect to your existing auth system
2. **Create test character** - Test the character creation flow
3. **Test quest system** - Verify quest loading and progression
4. **Review integration guide** - `docs/INTEGRATION_GUIDE.md`

---

## Quick Reference

```bash
# Backend
cd backend
npm run dev          # Start development server
npm run migrate      # Run migrations
npm run seed         # Seed database

# Frontend
cd frontend
npm run dev          # Start development server
npm run build        # Build for production
```

---

**You're all set!** 🚀

For detailed information, see:
- `REVIEW_V2.md` - Comprehensive review of updates
- `RESPONSE_TO_CODE_REVIEW.md` - Consultant's response
- `TROUBLESHOOTING.md` - Common issues and solutions


