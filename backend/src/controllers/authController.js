/**
 * Auth Controller
 * HTTP request handlers for authentication
 */

const userService = require('../services/userService');
const { authLimiter } = require('../middleware/rateLimiter');

class AuthController {
  /**
   * Register a new user
   * POST /api/auth/register
   */
  async register(req, res, next) {
    try {
      const { email, password } = req.body;

      // Validate input
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Email and password are required'
        });
      }

      // Register user
      const result = await userService.register(email, password);

      res.status(201).json({
        success: true,
        data: result
      });
    } catch (error) {
      // Handle duplicate email error
      if (error.message.includes('already exists')) {
        return res.status(409).json({
          success: false,
          error: error.message
        });
      }

      // Handle validation errors
      if (error.message.includes('required') || 
          error.message.includes('Invalid') || 
          error.message.includes('must be')) {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }

      next(error);
    }
  }

  /**
   * Login user
   * POST /api/auth/login
   */
  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      // Validate input
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Email and password are required'
        });
      }

      // Login user
      const result = await userService.login(email, password);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      // Handle authentication errors
      if (error.message.includes('Invalid email or password')) {
        return res.status(401).json({
          success: false,
          error: error.message
        });
      }

      // Handle validation errors
      if (error.message.includes('required')) {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }

      next(error);
    }
  }

  /**
   * Get current user
   * GET /api/auth/me
   */
  async getCurrentUser(req, res, next) {
    try {
      const userId = req.user.id;
      const user = await userService.getUserById(userId);

      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      if (error.message === 'User not found') {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }
      next(error);
    }
  }

  /**
   * Verify token
   * POST /api/auth/verify
   */
  async verifyToken(req, res, next) {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({
          success: false,
          error: 'Token is required'
        });
      }

      const decoded = await userService.verifyToken(token);

      res.json({
        success: true,
        data: {
          valid: true,
          userId: decoded.userId,
          email: decoded.email
        }
      });
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = new AuthController();


