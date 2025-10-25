const express = require('express');
const router = express.Router();
const klaviyoService = require('../services/klaviyo');

/**
 * POST /track
 * Track anonymous user events and send to Klaviyo
 *
 * Body:
 * {
 *   "event": "Viewed Product",
 *   "properties": {
 *     "product_name": "Example Product",
 *     "product_id": "12345",
 *     "price": 29.99
 *   },
 *   "anonymousId": "uuid-generated-by-client"
 * }
 */
router.post('/', async (req, res) => {
  try {
    const { event, properties, anonymousId } = req.body;

    // Validation
    if (!event) {
      return res.status(400).json({
        error: 'Missing required field: event'
      });
    }

    if (!anonymousId) {
      return res.status(400).json({
        error: 'Missing required field: anonymousId'
      });
    }

    // Track the event with Klaviyo
    const result = await klaviyoService.trackEvent({
      event,
      properties: properties || {},
      anonymousId,
      timestamp: new Date().toISOString(),
      // Include user agent and IP for additional context
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.connection.remoteAddress
    });

    res.json({
      success: true,
      message: 'Event tracked successfully',
      eventId: result.eventId || anonymousId
    });

  } catch (error) {
    console.error('Track error:', error);
    res.status(500).json({
      error: 'Failed to track event',
      message: error.message
    });
  }
});

module.exports = router;
