# Reset PostgreSQL Password - Quick Guide

## The Problem
PostgreSQL is asking for a password, but you don't know what it is. PostgreSQL doesn't store passwords in plain text, so you can't "see" them.

## Solution: Reset the Password

### Option 1: Reset Password for Your macOS User (Recommended)

1. **Stop PostgreSQL:**
   ```bash
   brew services stop postgresql@14
   ```

2. **Start PostgreSQL in single-user mode:**
   ```bash
   /opt/homebrew/opt/postgresql@14/bin/postgres --single -D /opt/homebrew/var/postgresql@14 postgres
   ```

3. **In the PostgreSQL prompt, type:**
   ```sql
   ALTER USER jefe WITH PASSWORD 'your_new_password';
   \q
   ```

4. **Restart PostgreSQL normally:**
   ```bash
   brew services start postgresql@14
   ```

5. **Test the connection:**
   ```bash
   psql -U jefe -d postgres
   # Enter your new password when prompted
   ```

### Option 2: Use Empty Password (Development Only)

If you want no password for local development:

1. **Stop PostgreSQL:**
   ```bash
   brew services stop postgresql@14
   ```

2. **Start in single-user mode:**
   ```bash
   /opt/homebrew/opt/postgresql@14/bin/postgres --single -D /opt/homebrew/var/postgresql@14 postgres
   ```

3. **Remove password requirement:**
   ```sql
   ALTER USER jefe WITH PASSWORD NULL;
   \q
   ```

4. **Restart PostgreSQL:**
   ```bash
   brew services start postgresql@14
   ```

### Option 3: Create a New User for the Application

Instead of using your macOS user, create a dedicated database user:

1. **Connect as superuser (if you can):**
   ```bash
   # Try this first - might work without password
   psql -U postgres -d postgres
   ```

2. **If that doesn't work, use single-user mode:**
   ```bash
   brew services stop postgresql@14
   /opt/homebrew/opt/postgresql@14/bin/postgres --single -D /opt/homebrew/var/postgresql@14 postgres
   ```

3. **Create new user:**
   ```sql
   CREATE USER of_galaxy_user WITH PASSWORD 'your_password_here';
   ALTER USER of_galaxy_user CREATEDB;
   \q
   ```

4. **Restart PostgreSQL:**
   ```bash
   brew services start postgresql@14
   ```

5. **Use this user in your `.env` file:**
   ```env
   DB_USER=of_galaxy_user
   DB_PASSWORD=your_password_here
   ```

## Recommended: Use a Simple Password for Development

For local development, I recommend using a simple password like `postgres` or `dev123`:

```sql
ALTER USER jefe WITH PASSWORD 'postgres';
```

Then in your backend `.env`:
```env
DB_USER=jefe
DB_PASSWORD=postgres
```

## After Resetting

Once you've reset the password:

1. **Create the database:**
   ```bash
   createdb -U jefe of_the_galaxy_dev
   # Enter your new password
   ```

2. **Or use psql:**
   ```bash
   psql -U jefe -d postgres
   CREATE DATABASE of_the_galaxy_dev;
   \q
   ```

3. **Update your `.env` file** with the new password

4. **Run migrations:**
   ```bash
   cd backend
   npm run migrate
   ```

---

**Note:** If single-user mode doesn't work, you may need to check PostgreSQL logs or try connecting as the `postgres` superuser with a different method.


