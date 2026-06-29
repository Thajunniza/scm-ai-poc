'use strict'

/**
 * errors.js
 * Custom error classes for the SCM AI application.
 * Always throw these instead of generic Error objects
 * so callers can handle errors precisely.
 */

/**
 * Base error class — all custom errors extend this
 */
class SCMError extends Error {
    constructor(message, code, details = {}) {
        super(message)
        this.name    = this.constructor.name
        this.code    = code
        this.details = details
        // Captures proper stack trace in Node.js
        Error.captureStackTrace(this, this.constructor)
    }
}

/**
 * Thrown when user input fails validation
 * e.g. empty message, message too long
 */
class ValidationError extends SCMError {
    constructor(message, details = {}) {
        super(message, 'VALIDATION_ERROR', details)
    }
}

/**
 * Thrown when agent cannot be determined from message
 */
class IntentNotFoundError extends SCMError {
    constructor(message, details = {}) {
        super(message, 'INTENT_NOT_FOUND', details)
    }
}

/**
 * Thrown when DB query fails
 */
class DataFetchError extends SCMError {
    constructor(message, details = {}) {
        super(message, 'DATA_FETCH_ERROR', details)
    }
}

/**
 * Thrown when AI model call fails
 */
class AICallError extends SCMError {
    constructor(message, details = {}) {
        super(message, 'AI_CALL_ERROR', details)
    }
}

/**
 * Thrown when agent is not registered or not found
 */
class AgentNotFoundError extends SCMError {
    constructor(agentName) {
        super(`Agent '${agentName}' is not registered`, 'AGENT_NOT_FOUND', { agentName })
    }
}

module.exports = {
    SCMError,
    ValidationError,
    IntentNotFoundError,
    DataFetchError,
    AICallError,
    AgentNotFoundError
}