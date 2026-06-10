# PostgreSQL Password Guide

## Finding or Setting Your PostgreSQL Password

On macOS with Homebrew PostgreSQL, there are a few ways to handle authentication:

---

## Option 1: Check if You Have a Password Set

PostgreSQL doesn't store passwords in plain text, so you can't "see" your password. However, you can:

1. **Try connecting without a password** (if peer/trust auth is enabled)
2. **Reset the password** if you've forgotten it
3. **Use your macOS username** instead of "postgres"

---

## Option 2: Connect Using Your macOS Username

Often, Homebrew PostgreSQL is configured to allow your macOS user to connect without a password:

```bash
# Try connecting as your macOS user (jefe)
psql -U jefe -d postgres

# Or create a database as your user
createdb of_the_galaxy_dev
```

If this works, you don't need a password for local development!

---

## Option 3: Reset the PostgreSQL Password

If you need to set or reset the `postgres` user password:

### Step 1: Stop PostgreSQL
```bash
brew services stop postgresql@14
```

### Step 2: Start PostgreSQL in Single-User Mode
```bash
# Find your PostgreSQL data directory
brew info postgresql@14 | grep "Data directory"

# Start in single-user mode (replace path if different)
/opt/homebrew/opt/postgresql@14/bin/postgres --single -D /opt/homebrew/var/postgresql@14 postgres
```

### Step 3: Set the Password
In the PostgreSQL prompt, type:
```sql
ALTER USER postgres WITH PASSWORD 'your_new_password';
\q
```

### Step 4: Restart PostgreSQL Normally
```bash
brew services start postgresql@14
```

---

## Option 4: Use Trust Authentication (Development Only)

For local development, you can configure PostgreSQL to allow connections without passwords:

### Step 1: Edit pg_hba.conf
```bash
# Open the config file
nano /opt/homebrew/var/postgresql@14/pg_hba.conf
```

### Step 2: Find and Modify These Lines
Change from:
```
local   all             all                                     md5
host    all             all             127.0.0.1/32            md5
```

To:
```
local   all             all                                     trust
host    all             all             127.0.0.1/32            trust
```

### Step 3: Restart PostgreSQL
```bash
brew services restart postgresql@14
```

**⚠️ Warning:** This disables password authentication. Only use for local development!

---

## Option 5: Check Existing Users

To see what PostgreSQL users exist:

```bash
# If you can connect as your macOS user
psql -U jefe -d postgres -c "\du"

# This will show all users and their roles
```

---

## Recommended Approach for This Project

For local development, I recommend **Option 2** (using your macOS username):

1. **Create the database as your user:**
   ```bash
   createdb of_the_galaxy_dev
   ```

2. **Update your backend `.env` file:**
   ```env
   DB_USER=jefe
   DB_PASSWORD=
   # Or leave DB_PASSWORD empty if using trust auth
   ```

3. **Test the connection:**
   ```bash
   psql -U jefe -d of_the_galaxy_dev
   ```

---

## Quick Test Commands

```bash
# Test connection as your macOS user
psql -U jefe -d postgres

# Test connection as postgres user (will prompt for password)
psql -U postgres -d postgres

# List all databases
psql -U jefe -l

# Create database
createdb -U jefe of_the_galaxy_dev
```

---

## If You Need to Set a Password for the Application

If your application needs a specific password, set it:

```bash
# Connect as your user (no password needed)
psql -U jefe -d postgres

# Set password for postgres user
ALTER USER postgres WITH PASSWORD 'my_secure_password';

# Or create a new user for the app
CREATE USER of_galaxy_user WITH PASSWORD 'my_secure_password';
GRANT ALL PRIVILEGES ON DATABASE of_the_galaxy_dev TO of_galaxy_user;
```

Then update your `.env`:
```env
DB_USER=of_galaxy_user
DB_PASSWORD=my_secure_password
```

---

## Summary

**Most likely scenario:** You can connect using your macOS username (`jefe`) without a password. Try:

```bash
psql -U jefe -d postgres
```

If that works, use `DB_USER=jefe` in your `.env` file and leave `DB_PASSWORD` empty or set it to an empty string.


