# PostgreSQL Troubleshooting Guide

## Issue: `brew services start postgresql` Error

If you encounter:
```
Error: Failure while executing; `/bin/launchctl bootstrap gui/501 /Users/jefe/Library/LaunchAgents/homebrew.mxcl.postgresql@14.plist` exited with 5.
```

## Quick Fix

The service was in an error state but PostgreSQL was actually running. Here's how to fix it:

### Solution 1: Restart the Service (Recommended)

```bash
# Stop the service
brew services stop postgresql@14

# Start it again
brew services start postgresql@14
```

### Solution 2: Check if PostgreSQL is Already Running

Sometimes PostgreSQL is running but brew services shows an error state:

```bash
# Check if PostgreSQL is accepting connections
pg_isready -h localhost

# Check running processes
ps aux | grep postgres
```

If `pg_isready` shows "accepting connections", PostgreSQL is working fine. You can ignore the brew services error.

### Solution 3: Clean Up and Restart

If the above doesn't work:

```bash
# Stop the service
brew services stop postgresql@14

# Unload the launch agent (may show error, that's okay)
launchctl unload ~/Library/LaunchAgents/homebrew.mxcl.postgresql@14.plist 2>/dev/null || true

# Remove the plist if corrupted
rm ~/Library/LaunchAgents/homebrew.mxcl.postgresql@14.plist 2>/dev/null || true

# Start fresh
brew services start postgresql@14
```

### Solution 4: Manual Start (Alternative)

If brew services continues to have issues, you can start PostgreSQL manually:

```bash
# Start PostgreSQL manually
pg_ctl -D /usr/local/var/postgresql@14 start

# Or if using a different path
pg_ctl -D /opt/homebrew/var/postgresql@14 start
```

To find your PostgreSQL data directory:
```bash
brew info postgresql@14 | grep "Data directory"
```

## Verify PostgreSQL is Working

```bash
# Check connection
pg_isready -h localhost

# Test connection (will prompt for password)
psql -U postgres -c "SELECT version();"
```

## Common Issues

### Issue: "Password for user postgres"

If you're prompted for a password, you may need to:

1. **Use your macOS user account:**
   ```bash
   psql -U $(whoami) -d postgres
   ```

2. **Set up a password:**
   ```bash
   psql -U $(whoami) -d postgres
   ALTER USER postgres WITH PASSWORD 'your_password';
   ```

3. **Use trust authentication** (development only):
   Edit `/usr/local/var/postgresql@14/pg_hba.conf` (or `/opt/homebrew/var/postgresql@14/pg_hba.conf`) and change:
   ```
   # Change from:
   local   all             all                                     md5
   # To:
   local   all             all                                     trust
   ```
   Then restart PostgreSQL.

### Issue: Port Already in Use

If port 5432 is already in use:

```bash
# Find what's using the port
lsof -i :5432

# Kill the process if needed
kill -9 <PID>
```

### Issue: Database Doesn't Exist

Create the database:
```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE of_the_galaxy_dev;

# Exit
\q
```

## For This Project

Once PostgreSQL is running, you can proceed with:

```bash
# Create the database
createdb of_the_galaxy_dev

# Or using psql
psql -U postgres -c "CREATE DATABASE of_the_galaxy_dev;"

# Then run migrations
cd backend
npm run migrate
```

## Status Check Commands

```bash
# Check brew services status
brew services list | grep postgresql

# Check if PostgreSQL is accepting connections
pg_isready -h localhost

# Check PostgreSQL version
psql --version

# List databases
psql -U postgres -l
```

---

**Current Status:** ✅ PostgreSQL is running and accepting connections on localhost:5432

You can now proceed with setting up the application database!


