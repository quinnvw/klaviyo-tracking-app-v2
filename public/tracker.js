/**
 * Klaviyo Anonymous Tracking Client
 *
 * This script tracks anonymous user events and sends them to your tracking server,
 * which then forwards them to Klaviyo.
 *
 * Usage:
 * Include this script on your website:
 * <script src="https://your-server.com/tracker.js"></script>
 *
 * Then use the global KlaviyoTracker object:
 * KlaviyoTracker.track('Viewed Product', { product_name: 'Example', price: 29.99 });
 * KlaviyoTracker.identify('user@example.com', { firstName: 'John', lastName: 'Doe' });
 */

(function(window) {
  'use strict';

  // Configuration
  const CONFIG = {
    trackEndpoint: window.KLAVIYO_TRACK_ENDPOINT || '/track',
    identifyEndpoint: window.KLAVIYO_IDENTIFY_ENDPOINT || '/identify',
    cookieName: '_klaviyo_anon_id',
    cookieExpireDays: 365
  };

  // Utility: Generate UUID v4
  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // Utility: Get or create cookie
  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return parts.pop().split(';').shift();
    }
    return null;
  }

  // Utility: Set cookie
  function setCookie(name, value, days) {
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
  }

  // Get or create anonymous ID
  function getAnonymousId() {
    let anonymousId = getCookie(CONFIG.cookieName);
    if (!anonymousId) {
      anonymousId = generateUUID();
      setCookie(CONFIG.cookieName, anonymousId, CONFIG.cookieExpireDays);
    }
    return anonymousId;
  }

  // Main Tracker object
  const KlaviyoTracker = {
    anonymousId: getAnonymousId(),

    /**
     * Track an event
     * @param {string} eventName - Name of the event (e.g., "Viewed Product")
     * @param {object} properties - Event properties (e.g., { product_name: "T-Shirt", price: 29.99 })
     * @returns {Promise}
     */
    track: function(eventName, properties) {
      if (!eventName) {
        console.error('KlaviyoTracker: Event name is required');
        return Promise.reject(new Error('Event name is required'));
      }

      const payload = {
        event: eventName,
        properties: properties || {},
        anonymousId: this.anonymousId
      };

      return fetch(CONFIG.trackEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Tracking failed: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        console.log('KlaviyoTracker: Event tracked successfully', data);
        return data;
      })
      .catch(error => {
        console.error('KlaviyoTracker: Error tracking event', error);
        throw error;
      });
    },

    /**
     * Identify a user (converts anonymous user to known user)
     * @param {string} email - User's email address
     * @param {object} properties - User properties (e.g., { firstName: "John", lastName: "Doe" })
     * @returns {Promise}
     */
    identify: function(email, properties) {
      if (!email) {
        console.error('KlaviyoTracker: Email is required');
        return Promise.reject(new Error('Email is required'));
      }

      const payload = {
        email: email,
        anonymousId: this.anonymousId,
        properties: properties || {}
      };

      return fetch(CONFIG.identifyEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Identification failed: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        console.log('KlaviyoTracker: User identified successfully', data);
        return data;
      })
      .catch(error => {
        console.error('KlaviyoTracker: Error identifying user', error);
        throw error;
      });
    },

    /**
     * Get the current anonymous ID
     * @returns {string}
     */
    getAnonymousId: function() {
      return this.anonymousId;
    },

    /**
     * Reset the anonymous ID (creates a new one)
     */
    resetAnonymousId: function() {
      this.anonymousId = generateUUID();
      setCookie(CONFIG.cookieName, this.anonymousId, CONFIG.cookieExpireDays);
      return this.anonymousId;
    }
  };

  // Auto-track page views (optional - can be disabled)
  if (window.KLAVIYO_AUTO_TRACK_PAGEVIEW !== false) {
    window.addEventListener('load', function() {
      KlaviyoTracker.track('Viewed Page', {
        url: window.location.href,
        path: window.location.pathname,
        title: document.title,
        referrer: document.referrer
      });
    });
  }

  // Expose to window
  window.KlaviyoTracker = KlaviyoTracker;

  console.log('KlaviyoTracker initialized with ID:', KlaviyoTracker.anonymousId);

})(window);
