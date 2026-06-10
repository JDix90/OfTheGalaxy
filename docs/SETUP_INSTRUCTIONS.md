# Setup Instructions

This document provides step-by-step instructions for setting up the *Of the Galaxy: RPG Foundation* package on your local development environment.

## Prerequisites

Before you begin, ensure you have the following installed on your system:

- **Node.js** (v18.0.0 or later): [Download Node.js](https://nodejs.org/)
- **npm** (v9.0.0 or later): Comes with Node.js
- **PostgreSQL** (v14 or later): [Download PostgreSQL](https://www.postgresql.org/download/)
- **Git**: [Download Git](https://git-scm.com/downloads)

## Step 1: Database Setup

1. **Install PostgreSQL** if you haven't already.

2. **Create a new database:**
   ```bash
   # Connect to PostgreSQL
   psql -U postgres
   
   # Create the database
   CREATE DATABASE of_the_galaxy_dev;
   
   # Exit psql
   \q
   ```

3. **Note your database credentials:**
   - Host: `localhost` (default)
   - Port: `5432` (default)
   - Database name: `of_the_galaxy_dev`
   - Username: `postgres` (or your custom user)
   - Password: (your PostgreSQL password)

## Step 2: Backend Setup

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create environment file:**
   ```bash
   cp .env.example .env
   ```

4. **Edit the `.env` file** with your actual values:
   ```env
   NODE_ENV=development
   PORT=3001
   
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=of_the_galaxy_dev
   DB_USER=postgres
   DB_PASSWORD=your_actual_password_here
   
   JWT_SECRET=your_random_secret_key_here
   JWT_EXPIRES_IN=7d
   
   CORS_ORIGIN=http://localhost:5173
   
   OPENAI_API_KEY=your_openai_api_key_here
   ```

   **Important:**
   - Replace `your_actual_password_here` with your PostgreSQL password
   - Generate a random JWT secret (e.g., run `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
   - Add your OpenAI API key if you plan to use AI dialogue

5. **Run database migrations:**
   ```bash
   npm run migrate
   ```

6. **Seed the database with content:**
   ```bash
   npm run seed
   ```

   This will create all the necessary tables in your database.

6. **Start the backend server:**
   ```bash
   npm run dev
   ```

   You should see:
   ```
   ✓ Database connection established successfully
   ✓ Database synchronized
   ✓ Server running on port 3001
   ✓ Environment: development
   ```

## Step 3: Frontend Setup

1. **Open a new terminal** (keep the backend running).

2. **Navigate to the frontend directory:**
   ```bash
   cd frontend
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Create environment file (optional):**
   ```bash
   # Create .env file if you need custom API URL
   echo "VITE_API_URL=http://localhost:3001/api" > .env
   ```

5. **Start the frontend development server:**
   ```bash
   npm run dev
   ```

   You should see:
   ```
   VITE v5.0.8  ready in 500 ms
   
   ➜  Local:   http://localhost:5173/
   ➜  Network: use --host to expose
   ```

6. **Open your browser** and navigate to `http://localhost:5173`.

## Step 4: Verify Installation

1. **Check the backend health endpoint:**
   - Open `http://localhost:3001/health` in your browser
   - You should see: `{"success":true,"message":"Server is running","timestamp":"..."}`

2. **Test the frontend:**
   - Navigate to `http://localhost:5173`
   - You should see the application interface

## Step 5: Create Your First Character

1. **Navigate to the character creation page** (if not already there).

2. **Follow the character creation steps:**
   - Choose a species
   - Select a background
   - Allocate attribute points
   - Customize appearance (simplified in Phase 1)
   - Name your character

3. **Create the character** and verify it's saved to the database.

## Troubleshooting

### Database Connection Errors

**Error:** `ECONNREFUSED` or `password authentication failed`

**Solution:**
- Verify PostgreSQL is running: `pg_isready`
- Check your `.env` file has the correct database credentials
- Ensure the database exists: `psql -U postgres -l`

### Port Already in Use

**Error:** `EADDRINUSE: address already in use :::3001`

**Solution:**
- Kill the process using the port: `lsof -ti:3001 | xargs kill -9` (macOS/Linux)
- Or change the PORT in your `.env` file

### Module Not Found Errors

**Error:** `Cannot find module 'express'` or similar

**Solution:**
- Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Ensure you're in the correct directory (backend or frontend)

### CORS Errors

**Error:** `Access to XMLHttpRequest blocked by CORS policy`

**Solution:**
- Verify the backend is running on port 3001
- Check `CORS_ORIGIN` in backend `.env` matches the frontend URL
- Restart the backend server after changing `.env`

## Next Steps

After successful setup:

1. **Read the Integration Guide:** `docs/INTEGRATION_GUIDE.md`
2. **Explore the codebase** to understand the architecture
3. **Create sample content** (quests, NPCs) in the `content/` directory
4. **Begin integrating** with your existing *Of the Galaxy* codebase

## Development Workflow

**Daily development:**
1. Start PostgreSQL (if not running as a service)
2. Start backend: `cd backend && npm run dev`
3. Start frontend: `cd frontend && npm run dev`
4. Code, test, commit

**Running tests:**
```bash
# Backend tests
cd backend && npm test

# Frontend tests
cd frontend && npm test
```

**Building for production:**
```bash
# Backend (no build needed, just ensure env vars are set)
cd backend && NODE_ENV=production npm start

# Frontend
cd frontend && npm run build
```

## Support

If you encounter issues not covered here, check:
- The main `README.md` for project overview
- The `INTEGRATION_GUIDE.md` for integration-specific questions
- Database logs: `tail -f /var/log/postgresql/postgresql-14-main.log` (Linux)
- Backend logs: Check your terminal where the backend is running
