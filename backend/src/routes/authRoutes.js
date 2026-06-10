/**
 * Auth Routes
 * API routes for authentication
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

// Rate limiting for auth endpoints (stricter than general API)
router.use(authLimiter);

// Public routes (no authentication required)
router.post('/register', authController.register.bind(authController));
router.post('/login', authController.login.bind(authController));
router.post('/verify', authController.verifyToken.bind(authController));

// Protected routes (require authentication)
router.get('/me', authenticate, authController.getCurrentUser.bind(authController));

module.exports = router;


