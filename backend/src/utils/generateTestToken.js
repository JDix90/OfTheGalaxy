/**
 * Generate Test Token
 * Development utility to generate a JWT token for testing
 * 
 * Usage: node src/utils/generateTestToken.js
 */

require('dotenv').config();
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

if (!JWT_SECRET) {
  console.error('Error: JWT_SECRET not set in environment variables');
  process.exit(1);
}

// Generate a test user token
const testUser = {
  userId: '00000000-0000-0000-0000-000000000000', // Test user ID
  email: 'test@example.com'
};

const token = jwt.sign(testUser, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

console.log('\n=== Test JWT Token ===');
console.log(token);
console.log('\n=== Instructions ===');
console.log('1. Open browser console (F12)');
console.log('2. Run: localStorage.setItem("auth_token", "' + token + '")');
console.log('3. Refresh the page');
console.log('\nOr use this in your frontend code:');
console.log('import { setAuthToken } from "./services/api/client";');
console.log('setAuthToken("' + token + '");');
console.log('\n');


