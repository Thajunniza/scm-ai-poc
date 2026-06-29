'use strict'

/**
 * agent-router.js
 * ────────────────
 * Pure routing logic — detects intent from message + hint.
 * Has zero knowledge of agents or business logic.
 * Only responsibility: figure out WHICH agent should handle the message.
 */

const { INTENT_CONFIG }                    = require('./intent-config')
const { INTENTS, CONFIDENCE }              = require('../utils/constants')
const { IntentNotFoundError }              = require('../utils/errors')
const { createLogger }                     = require('../utils/logger')

const logger = createLogger('AgentRouter')

/**
 * Detect intent from message and optional hint
 *
 * @param {string} message   - sanitized user message
 * @param {string} agentHint - optional hint from client
 * @returns {{ intent: string, confidence: string, scores: object }}
 */
function detectIntent(message, agentHint = '') {
    logger.info('Detecting intent', { agentHint, messageLength: message.length })

    // ── Step 1: Explicit hint — highest priority ──────────────────────────
    if (agentHint) {
        const matched = findIntentByHint(agentHint)
        if (matched) {
            logger.info('Intent resolved via hint', { intent: matched, agentHint })
            return {
                intent:     matched,
                confidence: CONFIDENCE.HIGH,
                scores:     { [matched]: 99 }
            }
        }
    }

    // ── Step 2: Score each intent by keyword/phrase matching ──────────────
    const lower  = message.toLowerCase()
    const scores = scoreIntents(lower)

    logger.info('Intent scores', { scores })

    // ── Step 3: Pick highest scoring intent ───────────────────────────────
    const best = getBestIntent(scores)

    if (!best) {
        logger.warn('No intent detected', { message })
        return {
            intent:     INTENTS.UNKNOWN,
            confidence: null,
            scores
        }
    }

    // ── Step 4: Determine confidence from score ───────────────────────────
    const confidence = getConfidence(best.score)

    logger.info('Intent detected', { intent: best.intent, confidence, score: best.score })

    return {
        intent: best.intent,
        confidence,
        scores
    }
}

// ── Private helpers ───────────────────────────────────────────────────────────

/**
 * Find intent that matches the given hint
 */
function findIntentByHint(hint) {
    const normalized = hint.toLowerCase().trim()

    for (const [intent, config] of Object.entries(INTENT_CONFIG)) {
        if (config.hints.includes(normalized)) {
            return intent
        }
    }
    return null
}

/**
 * Score all intents based on keyword and phrase matches
 * Phrases are worth 3 points (more specific)
 * Keywords are worth 1 point each
 */
function scoreIntents(lowerMessage) {
    const scores = {}

    for (const [intent, config] of Object.entries(INTENT_CONFIG)) {
        let score = 0

        // Check phrases first (higher weight)
        for (const phrase of config.phrases) {
            if (lowerMessage.includes(phrase)) {
                score += 3
            }
        }

        // Check individual keywords
        for (const keyword of config.keywords) {
            if (lowerMessage.includes(keyword)) {
                score += 1
            }
        }

        scores[intent] = score
    }

    return scores
}

/**
 * Find the highest scoring intent that meets its threshold
 */
function getBestIntent(scores) {
    let best = null

    for (const [intent, score] of Object.entries(scores)) {
        const config = INTENT_CONFIG[intent]

        // Must meet threshold
        if (score < config.threshold) continue

        // Must be higher than current best
        if (!best || score > best.score) {
            best = { intent, score }
        }
    }

    return best
}

/**
 * Map score to confidence level
 */
function getConfidence(score) {
    if (score >= 5) return CONFIDENCE.HIGH
    if (score >= 2) return CONFIDENCE.MEDIUM
    return CONFIDENCE.LOW
}

module.exports = { detectIntent }