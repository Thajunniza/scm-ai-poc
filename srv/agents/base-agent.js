'use strict'

/**
 * base-agent.js
 * ─────────────
 * Abstract base class — orchestrates the full agent flow.
 * Every concrete agent (Inventory, Delivery, Supplier) extends this
 * and only provides: name, entities, fetchContext(), buildPrompt(), parseResponse()
 *
 * Flow:
 *   1. fetchContext()   → calls db-helper.js
 *   2. buildPrompt()    → calls prompts/*.js
 *   3. callAI()         → calls remote-call-helper.js (which calls cds-ai-tracker)
 *   4. parseResponse()  → extracts final reply text
 */

const { createLogger }                = require('../utils/logger')
const { successResponse }             = require('../utils/formatter')
const { DataFetchError, AICallError } = require('../utils/errors')
const { CONFIDENCE }                  = require('../utils/constants')
const { callAgent }                   = require('../helpers/remote-call-helper')

class BaseAgent {

    constructor() {
        if (new.target === BaseAgent) {
            throw new Error('BaseAgent is abstract — extend it, do not instantiate directly')
        }
        this.logger = createLogger(this.name)
    }

    // ── Abstract properties — must be implemented by subclass ─────────────────

    get name() {
        throw new Error(`${this.constructor.name} must implement get name()`)
    }

    get entities() {
        throw new Error(`${this.constructor.name} must implement get entities()`)
    }

    get modelName() {
        return 'gpt-4o'   // default — subclass can override
    }

    // ── Abstract methods — must be implemented by subclass ────────────────────

    /**
     * Fetch DB context — subclass calls db-helper functions here
     */
    async fetchContext(message) {
        throw new Error(`${this.constructor.name} must implement fetchContext()`)
    }

    /**
     * Build AI prompt — subclass calls prompts/*.js here
     * @returns {Array} messages array in OpenAI format
     */
    buildPrompt(message, context) {
        throw new Error(`${this.constructor.name} must implement buildPrompt()`)
    }

    /**
     * Parse the AI response into a final reply string
     * Subclass can also provide simulateResponse() as a fallback
     */
    parseResponse(aiResult, context) {
        throw new Error(`${this.constructor.name} must implement parseResponse()`)
    }

    // ── Main orchestration — same for every agent ──────────────────────────────

    /**
     * Run the agent for a given message
     * @param {object} req     - CAP request object
     * @param {string} message - sanitized user message
     * @returns {object}       - formatted successResponse
     */
    async run(req, message) {
        const startTime = Date.now()
        const userId    = req?.user?.id || 'anonymous'

        this.logger.requestStart(userId, message, { agent: this.name })

        try {
            // Step 1 — fetch context from DB (via db-helper)
            const context = await this.safeFetchContext(message)

            // Step 2 — build prompt (via prompts/*.js)
            const messages = this.buildPrompt(message, context)

            // Step 3 — call AI (via remote-call-helper → cds-ai-tracker → GenAI Hub)
            const aiResult = await this.safeAICall(req, messages, message)

            // Step 4 — parse into final reply
            const reply = this.parseResponse(aiResult, context)

            const duration = Date.now() - startTime
            this.logger.requestEnd(userId, duration, {
                agent:        this.name,
                inputTokens:  aiResult?.inputTokens,
                outputTokens: aiResult?.outputTokens,
                simulated:    aiResult?.simulated || false
            })

            return successResponse({
                reply,
                agentUsed:  this.name,
                confidence: CONFIDENCE.HIGH,
                sources:    this.entities,
                meta: {
                    durationMs:   duration,
                    inputTokens:  aiResult?.inputTokens  || 0,
                    outputTokens: aiResult?.outputTokens || 0,
                    model:        aiResult?.model         || this.modelName,
                    simulated:    aiResult?.simulated     || false
                }
            })

        } catch (err) {
            const duration = Date.now() - startTime
            this.logger.error('Agent run failed', err, {
                agent:      this.name,
                userId,
                durationMs: duration
            })
            throw err
        }
    }

    // ── Protected helpers ───────────────────────────────────────────────────────

    /**
     * Safe context fetch — wraps fetchContext with DataFetchError
     */
    async safeFetchContext(message) {
        try {
            return await this.fetchContext(message)
        } catch (err) {
            if (err instanceof DataFetchError) throw err
            throw new DataFetchError(
                `Failed to fetch context for ${this.name}: ${err.message}`,
                { originalError: err.message }
            )
        }
    }

    /**
     * Safe AI call — delegates to remote-call-helper
     * remote-call-helper internally routes through cds-ai-tracker
     * for automatic usage tracking
     */
    async safeAICall(req, messages, message) {
        try {
            return await callAgent({
                agentName: this.name,
                message,
                context:   null,            // already baked into messages
                prompt:    messages,
                req
            })
        } catch (err) {
            if (err instanceof AICallError) throw err
            throw new AICallError(
                `AI call failed for ${this.name}: ${err.message}`,
                { originalError: err.message }
            )
        }
    }
}

module.exports = { BaseAgent }