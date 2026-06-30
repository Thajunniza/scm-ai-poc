'use strict'

/**
 * remote-call-helper.js
 * ──────────────────────
 * Calls SAP GenAI Hub via the Python bridge (genai-bridge/call_llm.py),
 * using file-based I/O instead of stdin/stdout piping — simpler,
 * easier to debug, no buffering/encoding edge cases.
 *
 * Flow:
 *   1. Write the messages array to a temp input file
 *   2. Run: python call_llm.py input.json output.json
 *   3. Read the result from the output file
 */

const { execFileSync } = require('child_process')
const fs   = require('fs')
const path = require('path')
const os   = require('os')
const { createLogger } = require('../utils/logger')

const logger = createLogger('RemoteCallHelper')

const BRIDGE_DIR    = path.join(__dirname, '..', '..', 'genai-bridge')
const BRIDGE_SCRIPT = path.join(BRIDGE_DIR, 'call_llm.py')
const PYTHON_BIN    = process.env.GENAI_BRIDGE_PYTHON
    || path.join(BRIDGE_DIR, 'venv', 'Scripts', 'python.exe')
const CALL_TIMEOUT_MS = parseInt(process.env.GENAI_BRIDGE_TIMEOUT || '60000')

/**
 * Call the LLM via the Python bridge
 *
 * @param {object} params
 * @param {string} params.agentName - e.g. 'InventoryAgent'
 * @param {Array}  params.prompt    - messages array (built by prompts/*.js)
 * @param {object} params.req       - CAP request (for user context, logging only)
 * @returns {object} { reply, model, inputTokens, outputTokens, simulated }
 */
async function callAgent({ agentName, prompt, req }) {
    const userId = req?.user?.id || 'anonymous'

    logger.info('Calling GenAI bridge', { agentName, userId, messageCount: prompt?.length })

    const callId      = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const inputPath    = path.join(os.tmpdir(), `genai-input-${callId}.json`)
    const outputPath   = path.join(os.tmpdir(), `genai-output-${callId}.json`)

    try {
        fs.writeFileSync(inputPath, JSON.stringify({ messages: prompt }), 'utf-8')

        execFileSync(
            PYTHON_BIN,
            [BRIDGE_SCRIPT, inputPath, outputPath],
            { cwd: BRIDGE_DIR, timeout: CALL_TIMEOUT_MS }
        )

        const result = JSON.parse(fs.readFileSync(outputPath, 'utf-8'))

        if (!result.success) {
            logger.warn('GenAI bridge reported failure — falling back to simulation', {
                agentName,
                bridgeError: result.error
            })
            return { reply: null, model: 'simulation', inputTokens: 0, outputTokens: 0, simulated: true }
        }

        logger.info('GenAI bridge call successful', {
            agentName,
            inputTokens:  result.input_tokens,
            outputTokens: result.output_tokens
        })

        return {
            reply:        result.content,
            model:        result.model,
            inputTokens:  result.input_tokens,
            outputTokens: result.output_tokens,
            simulated:    false
        }

    } catch (err) {
        logger.error('GenAI bridge call failed — falling back to simulation', err, { agentName })
        return { reply: null, model: 'simulation', inputTokens: 0, outputTokens: 0, simulated: true }

    } finally {
        // Clean up temp files regardless of outcome
        try { fs.unlinkSync(inputPath) } catch {}
        try { fs.unlinkSync(outputPath) } catch {}
    }
}

/**
 * Health check — verify the Python bridge is reachable
 */
async function checkStackHealth() {
    try {
        const result = await callAgent({
            agentName: 'HealthCheck',
            prompt: [{ role: 'user', content: 'ping' }],
            req: {}
        })
        return { healthy: result.simulated === false, bridge: 'python-genai-bridge' }
    } catch (err) {
        return { healthy: false, bridge: 'python-genai-bridge', error: err.message }
    }
}

module.exports = { callAgent, checkStackHealth }