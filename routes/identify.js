const express = require('express');
const router = express.Router();
const klaviyoService = require('../services/klaviyo');

/**
 * POST /identify
 * Identify a user and merge their anonymous activity with their profile
 *
 * Body:
 * {
 *   "email": "user@example.com",
 *   "anonymousId": "uuid-from-previous-tracking",
 *   "properties": {
 *     "firstName": "John",
 *     "lastName": "Doe",
 *     "phone": "+1234567890"
 *   }
 * }
 */
router.post('/', async (req, res) => {
  try {
    const { email, anonymousId, properties } = req.body;

    // Validation
    if (!email) {
      return res.status(400).json({
        error: 'Missing required field: email'
      });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Invalid email format'
      });
    }

    // Identify the user in Klaviyo
    const result = await klaviyoService.identifyUser({
      email,
      anonymousId,
      properties: properties || {},
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'User identified successfully',
      profileId: result.profileId
    });

  } catch (error) {
    console.error('Identify error:', error);
    res.status(500).json({
      error: 'Failed to identify user',
      message: error.message
    });
  }
});

module.exports = router;
