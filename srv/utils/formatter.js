'use strict'

/**
 * formatter.js
 * Standardizes all response shapes leaving the srv layer.
 * Frontend always gets a consistent structure.
 */

const { AGENTS, CONFIDENCE } = require('./constants')

/**
 * Successful agent response
 */
function successResponse({
    reply,
    agentUsed  = AGENTS.ROUTER,
    confidence = CONFIDENCE.MEDIUM,
    sources    = [],
    meta       = {}
}) {
    return {
        status:    'success',
        reply,
        agentUsed,
        confidence,
        sources,             // e.g. ['scm.Products', 'scm.Suppliers']
        meta,                // any extra data the frontend might need
        timestamp: new Date().toISOString()
    }
}

/**
 * Clarification response — when intent is unknown
 */
function clarificationResponse() {
    return successResponse({
        reply: `I am your SCM AI Assistant. I can help you with:

**Inventory** — stock levels, reorder alerts, warehouse status
   Try: "What products are critically low on stock?"

**Deliveries** — shipment tracking, delays, carrier updates
   Try: "Are there any delayed shipments?"

**Suppliers** — risk scores, performance, reliability
   Try: "Which suppliers are high risk?"

Please rephrase your question or use one of the examples above.`,
        agentUsed:  AGENTS.ROUTER,
        confidence: CONFIDENCE.HIGH
    })
}

/**
 * Error response — user-friendly, never exposes internals
 */
function errorResponse(error) {
    // Map internal error codes to user-friendly messages
    const userMessages = {
        'VALIDATION_ERROR':  error.message,
        'INTENT_NOT_FOUND':  'I could not understand your request. Please try rephrasing.',
        'DATA_FETCH_ERROR':  'I could not retrieve the data right now. Please try again.',
        'AI_CALL_ERROR':     'The AI service is temporarily unavailable. Please try again.',
        'AGENT_NOT_FOUND':   'The requested agent is not available.',
    }

    return {
        status:    'error',
        reply:     userMessages[error.code] || 'Something went wrong. Please try again.',
        agentUsed: AGENTS.ROUTER,
        confidence: null,
        sources:   [],
        meta:      { errorCode: error.code || 'UNKNOWN_ERROR' },
        timestamp: new Date().toISOString()
    }
}

module.exports = {
    successResponse,
    clarificationResponse,
    errorResponse
}