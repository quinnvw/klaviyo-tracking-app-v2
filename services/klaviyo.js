const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const KLAVIYO_API_BASE = 'https://a.klaviyo.com/api';
const PRIVATE_API_KEY = process.env.KLAVIYO_PRIVATE_API_KEY;
const PUBLIC_API_KEY = process.env.KLAVIYO_PUBLIC_API_KEY;

/**
 * Track an event for an anonymous or identified user
 */
async function trackEvent({ event, properties, anonymousId, userAgent, ip, timestamp }) {
  try {
    // Build the event payload for Klaviyo
    const eventData = {
      data: {
        type: 'event',
        attributes: {
          profile: {
            data: {
              type: 'profile',
              attributes: {
                anonymous_id: anonymousId
              }
            }
          },
          metric: {
            data: {
              type: 'metric',
              attributes: {
                name: event
              }
            }
          },
          properties: {
            ...properties
          },
          time: timestamp,
          unique_id: anonymousId + '_' + Date.now()
        }
      }
    };

    // Add user context if available
    if (userAgent) {
      eventData.data.attributes.properties.$user_agent = userAgent;
    }
    if (ip) {
      eventData.data.attributes.properties.$ip = ip;
    }
    if (properties.value !== undefined) {
      eventData.data.attributes.value = properties.value;
    }

    console.log('Tracking event to Klaviyo:', JSON.stringify(eventData, null, 2));

    const response = await fetch(`${KLAVIYO_API_BASE}/events/`, {
      method: 'POST',
      headers: {
        'Authorization': `Klaviyo-API-Key ${PRIVATE_API_KEY}`,
        'Content-Type': 'application/json',
        'revision': '2024-10-15'
      },
      body: JSON.stringify(eventData)
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Klaviyo API error: ${response.status} - ${errorBody}`);
    }

    // Handle empty response body (202 Accepted)
    const responseText = await response.text();
    let result = null;
    if (responseText) {
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        console.log('Could not parse response as JSON:', responseText);
      }
    }

    console.log('Klaviyo event tracked successfully:', result);

    return {
      eventId: result?.data?.id || anonymousId,
      success: true
    };

  } catch (error) {
    console.error('Error tracking event to Klaviyo:', error);
    throw error;
  }
}

/**
 * Identify a user and update/create their profile
 */
async function identifyUser({ email, anonymousId, properties, timestamp }) {
  try {
    // Ensure properties is an object
    const props = properties || {};

    // Build the profile payload for Klaviyo
    const profileData = {
      data: {
        type: 'profile',
        attributes: {
          email: email,
          properties: {
            ...props
          }
        }
      }
    };

    // Add anonymous_id if provided
    if (anonymousId) {
      profileData.data.attributes.anonymous_id = anonymousId;
    }

    // Add first name and last name to root level if provided
    if (props.firstName) {
      profileData.data.attributes.first_name = props.firstName;
    }
    if (props.lastName) {
      profileData.data.attributes.last_name = props.lastName;
    }
    if (props.phone) {
      profileData.data.attributes.phone_number = props.phone;
    }

    console.log('Identifying user in Klaviyo:', JSON.stringify(profileData, null, 2));

    const response = await fetch(`${KLAVIYO_API_BASE}/profiles/`, {
      method: 'POST',
      headers: {
        'Authorization': `Klaviyo-API-Key ${PRIVATE_API_KEY}`,
        'Content-Type': 'application/json',
        'revision': '2024-10-15'
      },
      body: JSON.stringify(profileData)
    });

    // Handle 409 conflict (profile already exists)
    if (response.status === 409) {
      const errorBody = await response.text();
      const errorData = JSON.parse(errorBody);
      const existingProfileId = errorData.errors[0]?.meta?.duplicate_profile_id;

      if (existingProfileId) {
        console.log(`Profile already exists with ID: ${existingProfileId}, updating instead...`);

        // Update the existing profile - need to add id to the payload
        const updatePayload = {
          data: {
            type: 'profile',
            id: existingProfileId,
            attributes: profileData.data.attributes
          }
        };

        const updateResponse = await fetch(`${KLAVIYO_API_BASE}/profiles/${existingProfileId}/`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Klaviyo-API-Key ${PRIVATE_API_KEY}`,
            'Content-Type': 'application/json',
            'revision': '2024-10-15'
          },
          body: JSON.stringify(updatePayload)
        });

        if (!updateResponse.ok) {
          const updateErrorBody = await updateResponse.text();
          throw new Error(`Klaviyo API update error: ${updateResponse.status} - ${updateErrorBody}`);
        }

        const updateResponseText = await updateResponse.text();
        let updateResult = null;
        if (updateResponseText) {
          try {
            updateResult = JSON.parse(updateResponseText);
          } catch (e) {
            console.log('Could not parse update response as JSON:', updateResponseText);
          }
        }

        console.log('Klaviyo profile updated successfully:', updateResult);

        return {
          profileId: existingProfileId,
          success: true,
          updated: true
        };
      }
    }

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Klaviyo API error: ${response.status} - ${errorBody}`);
    }

    // Handle empty response body (202 Accepted)
    const responseText = await response.text();
    let result = null;
    if (responseText) {
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        console.log('Could not parse response as JSON:', responseText);
      }
    }

    console.log('Klaviyo user identified successfully:', result);

    return {
      profileId: result?.data?.id,
      success: true
    };

  } catch (error) {
    console.error('Error identifying user in Klaviyo:', error);
    throw error;
  }
}

module.exports = {
  trackEvent,
  identifyUser
};
