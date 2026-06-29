'use strict'

/**
 * logger.js
 * Structured logging wrapper around CDS logger.
 * Adds consistent context (agent, userId, duration)
 * to every log entry automatically.
 */

const cds = require('@sap/cds')

/**
 * Create a named logger with structured context support
 * @param {string} name - logger name e.g. 'InventoryAgent'
 */
function createLogger(name) {
    const log = cds.log(name)

    return {
        /**
         * Log informational message with optional context
         */
        info: (message, context = {}) => {
            log.info(formatMessage(message, context))
        },

        /**
         * Log warning with optional context
         */
        warn: (message, context = {}) => {
            log.warn(formatMessage(message, context))
        },

        /**
         * Log error — always includes error details
         */
        error: (message, error, context = {}) => {
            log.error(formatMessage(message, {
                ...context,
                errorCode:    error?.code    || 'UNKNOWN',
                errorMessage: error?.message || String(error)
            }))
        },

        /**
         * Log start of an agent request
         */
        requestStart: (userId, message, context = {}) => {
            log.info(formatMessage('Request started', {
                userId,
                messagePreview: truncate(message, 80),
                ...context
            }))
        },

        /**
         * Log end of an agent request with duration
         */
        requestEnd: (userId, durationMs, context = {}) => {
            log.info(formatMessage('Request completed', {
                userId,
                durationMs,
                ...context
            }))
        }
    }
}

/**
 * Format a log message with structured context
 */
function formatMessage(message, context = {}) {
    const parts = [message]
    const keys  = Object.keys(context)

    if (keys.length > 0) {
        const ctx = keys
            .map(k => `${k}=${JSON.stringify(context[k])}`)
            .join(' | ')
        parts.push(`[${ctx}]`)
    }

    return parts.join(' ')
}

/**
 * Truncate a string for safe logging
 */
function truncate(str, maxLen) {
    if (!str) return ''
    return str.length <= maxLen ? str : str.slice(0, maxLen) + '...'
}

module.exports = { createLogger }