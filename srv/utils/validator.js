'use strict'

/**
 * validator.js
 * All input validation logic in one place.
 * Every agent and the router calls this before processing.
 */

const { ValidationError } = require('./errors')
const { VALIDATION }      = require('./constants')

/**
 * Validate the incoming chat message
 * Throws ValidationError if invalid
 * Returns sanitized message if valid
 */
function validateMessage(message) {
    // Must exist
    if (message === null || message === undefined) {
        throw new ValidationError('Message is required')
    }

    // Must be a string
    if (typeof message !== 'string') {
        throw new ValidationError('Message must be a string')
    }

    // Trim whitespace
    const sanitized = message.trim()

    // Min length
    if (sanitized.length < VALIDATION.MESSAGE_MIN_LENGTH) {
        throw new ValidationError(
            `Message must be at least ${VALIDATION.MESSAGE_MIN_LENGTH} characters`,
            { received: sanitized.length }
        )
    }

    // Max length
    if (sanitized.length > VALIDATION.MESSAGE_MAX_LENGTH) {
        throw new ValidationError(
            `Message must not exceed ${VALIDATION.MESSAGE_MAX_LENGTH} characters`,
            { received: sanitized.length }
        )
    }

    return sanitized
}

/**
 * Validate the agentHint parameter
 * Throws ValidationError if not in allowed list
 */
function validateAgentHint(agentHint) {
    // Optional field — null/undefined is fine
    if (!agentHint) return ''

    const normalized = agentHint.toLowerCase().trim()

    if (!VALIDATION.AGENT_HINT_ALLOWED.includes(normalized)) {
        throw new ValidationError(
            `Invalid agentHint. Allowed values: ${VALIDATION.AGENT_HINT_ALLOWED.filter(Boolean).join(', ')}`,
            { received: agentHint }
        )
    }

    return normalized
}

/**
 * Validate a full chat request
 * Returns sanitized { message, agentHint }
 */
function validateChatRequest(data) {
    const message   = validateMessage(data?.message)
    const agentHint = validateAgentHint(data?.agentHint)
    return { message, agentHint }
}

module.exports = {
    validateMessage,
    validateAgentHint,
    validateChatRequest
}