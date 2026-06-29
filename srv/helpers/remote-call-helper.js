'use strict'

/**
 * remote-call-helper.js
 * ──────────────────────
 * Single entry point for ALL external AI calls.
 * Switches between Node.js and Python agentic stacks
 * based on AGENT_STACK environment variable.
 *
 * AGENT_STACK=node   → calls agent-node  (LangGraph JS + LiteLLM)
 * AGENT_STACK=python → calls agent-python (CrewAI + LangGraph + Pydantic AI)
 *
 * Both stacks expose the same REST API contract:
 *   POST /agent/run
 *   { agentName, message, context, prompt }
 *   → { reply, model, inputTokens, outputTokens, durationMs }
 */

const { AICallError }  = require('../utils/errors')
const { createLogger } = require('../utils/logger')
const { AGENTS }       = require('../utils/constants')

const logger = createLogger('RemoteCallHelper')

// ── Stack configuration ───────────────────────────────────────────────────────
const STACK_CONFIG = {
    node: {
        baseUrl: process.env.NODE_AGENT_URL    || 'http://localhost:3001',
        timeout: parseInt(process.env.NODE_AGENT_TIMEOUT || '30000')
    },
    python: {
        baseUrl: process.env.PYTHON_AGENT_URL  || 'http://localhost:8000',
        timeout: parseInt(process.env.PYTHON_AGENT_TIMEOUT || '60000')
    }
}

const ACTIVE_STACK = process.env.AGENT_STACK || 'node'

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Call an agent on the active agentic stack
 *
 * @param {object} params
 * @param {string} params.agentName  - e.g. 'InventoryAgent'
 * @param {string} params.message    - sanitized user message
 * @param {object} params.context    - DB context from db-helper
 * @param {string} params.prompt     - built prompt from prompts/
 * @param {object} params.req        - CAP request (for user context)
 * @returns {object} { reply, model, inputTokens, outputTokens, durationMs }
 */
async function callAgent({ agentName, message, context, prompt, req }) {
    const stack  = getActiveStack()
    const config = STACK_CONFIG[stack]

    logger.info('Calling agent', {
        stack,
        agentName,
        baseUrl: config.baseUrl,
        userId:  req?.user?.id || 'anonymous'
    })

    const payload = buildPayload({ agentName, message, context, prompt, req })

    try {
        const response = await fetchWithTimeout(
            `${config.baseUrl}/agent/run`,
            {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify(payload)
            },
            config.timeout
        )

        if (!response.ok) {
            const errorBody = await response.text()
            throw new AICallError(
                `Agent stack returned ${response.status}: ${errorBody}`,
                { stack, agentName, status: response.status }
            )
        }

        const result = await response.json()

        logger.info('Agent call successful', {
            stack,
            agentName,
            inputTokens:  result.inputTokens,
            outputTokens: result.outputTokens,
            durationMs:   result.durationMs
        })

        return result

    } catch (err) {
        // If agent stack is not running — fall back to simulation
        if (err.code === 'ECONNREFUSED' || err.name === 'AbortError') {
            logger.warn('Agent stack unavailable — using simulation fallback', {
                stack,
                agentName,
                reason: err.message
            })
            return simulationFallback(agentName, message)
        }

        if (err instanceof AICallError) throw err
        throw new AICallError(
            `Remote call failed for ${agentName}: ${err.message}`,
            { stack, agentName, originalError: err.message }
        )
    }
}

/**
 * Health check — verify active stack is reachable
 */
async function checkStackHealth() {
    const stack  = getActiveStack()
    const config = STACK_CONFIG[stack]

    try {
        const response = await fetchWithTimeout(
            `${config.baseUrl}/health`,
            { method: 'GET' },
            5000
        )
        return {
            stack,
            healthy: response.ok,
            url:     config.baseUrl,
            status:  response.status
        }
    } catch (err) {
        return {
            stack,
            healthy: false,
            url:     config.baseUrl,
            error:   err.message
        }
    }
}

/**
 * Get which stack is currently active
 */
function getActiveStack() {
    const stack = ACTIVE_STACK.toLowerCase()
    if (!STACK_CONFIG[stack]) {
        logger.warn(`Unknown AGENT_STACK '${stack}' — defaulting to 'node'`)
        return 'node'
    }
    return stack
}

// ── Private helpers ───────────────────────────────────────────────────────────

/**
 * Build request payload — same contract for both stacks
 */
function buildPayload({ agentName, message, context, prompt, req }) {
    return {
        agentName,
        message,
        context,
        prompt,
        user: {
            id:    req?.user?.id    || 'anonymous',
            email: req?.user?.email || ''
        },
        sessionId: req?.headers?.['x-session-id'] || '',
        timestamp: new Date().toISOString()
    }
}

/**
 * Fetch with timeout using AbortController
 */
async function fetchWithTimeout(url, options, timeoutMs) {
    const controller = new AbortController()
    const timeoutId  = setTimeout(() => controller.abort(), timeoutMs)

    try {
        return await fetch(url, { ...options, signal: controller.signal })
    } finally {
        clearTimeout(timeoutId)
    }
}

/**
 * Simulation fallback — used when agent stack is not running
 * Returns minimal valid response so CAP service keeps working
 */
function simulationFallback(agentName, message) {
    logger.info('Using simulation fallback', { agentName })

    const replies = {
        [AGENTS.INVENTORY]:     `[SIMULATION] Inventory agent response for: "${message}"`,
        [AGENTS.DELIVERY]:      `[SIMULATION] Delivery agent response for: "${message}"`,
        [AGENTS.SUPPLIER_RISK]: `[SIMULATION] Supplier risk agent response for: "${message}"`
    }

    return {
        reply:        replies[agentName] || `[SIMULATION] Response for: "${message}"`,
        model:        'simulation',
        inputTokens:  0,
        outputTokens: 0,
        durationMs:   0,
        simulated:    true
    }
}

module.exports = {
    callAgent,
    checkStackHealth,
    getActiveStack
}