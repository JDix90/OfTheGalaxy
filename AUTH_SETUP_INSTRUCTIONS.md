# Authentication System Setup Instructions

## Quick Start

### Step 1: Run Database Migration

The authentication system requires a `users` table. Run the migration:

```bash
cd backend
npm run migrate
```

This will create the `users` table if it doesn't exist.

### Step 2: Verify Environment Variables

Ensure your `backend/.env` file has:

```env
JWT_SECRET=your_random_secret_here
JWT_EXPIRES_IN=7d
```

If `JWT_SECRET` is not set, generate one:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and add it to your `.env` file.

### Step 3: Start the Application

**Backend:**
```bash
cd backend
npm run dev
```

**Frontend:**
```bash
cd frontend
npm run dev
```

### Step 4: Test Authentication

1. Navigate to `http://localhost:5173`
2. Click "Sign Up"
3. Enter an email and password (min 8 characters)
4. Click "Sign Up"
5. You should be redirected to the landing page
6. Click "Start Game" to create a character

---

## Troubleshooting

### Migration Fails

If the migration fails with "users table already exists":
- The table may have been created manually
- You can skip this migration or drop the table and re-run

### Authentication Errors

If you see "Authentication required" errors:
1. Check that you've registered/logged in
2. Check browser console for errors
3. Verify `JWT_SECRET` is set in backend `.env`
4. Clear localStorage and try again:
   ```javascript
   localStorage.clear();
   location.reload();
   ```

### Token Expired

If your token expires:
- Simply log in again
- Tokens expire after 7 days by default (configurable via `JWT_EXPIRES_IN`)

---

## Development Notes

- The dev auth helper (`devAuth.js`) is no longer needed
- All authentication is now handled through the proper system
- Users must register/login to access the game

---

## API Testing

You can test the API endpoints directly:

**Register:**
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

**Login:**
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

**Get Current User (requires token):**
```bash
curl -X GET http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```


