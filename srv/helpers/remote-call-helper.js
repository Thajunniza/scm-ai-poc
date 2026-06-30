'use strict'

/**
 * remote-call-helper.js
 * ──────────────────────
 * Calls the GenAI Hub via a Python bridge script (genai-bridge/call_llm.py),
 * which uses litellm.completion(model="sap/gpt-4o") — proven working.
 *
 * Why a Python subprocess instead of direct Node.js HTTP:
 *   - litellm's SAP provider handles the full orchestration request shape
 *     (auth, streaming flags, module config) that we could not reliably
 *     replicate by hand in Node.js (confirmed via 404s on hand-rolled calls)
 *   - This keeps the CAP layer simple — agents don't need to know
 *     Python is involved at all
 *
 * Folder layout assumed (sibling of srv/):
 *   scm-ai-poc/
 *     ├── srv/helpers/remote-call-helper.js   <- this file
 *     └── genai-bridge/call_llm.py            <- the Python bridge
 */

const { spawn } = require('child_process')
const path       = require('path')
const { AICallError }  = require('../utils/errors')
const { createLogger } = require('../utils/logger')

const logger = createLogger('RemoteCallHelper')

// srv/helpers -> srv -> root -> genai-bridge
const BRIDGE_DIR      = path.join(__dirname, '..', '..', 'genai-bridge')
const BRIDGE_SCRIPT   = path.join(BRIDGE_DIR, 'call_llm.py')

// Prefer the venv's python directly — avoids PATH issues where
// 'python' on PATH might not be the venv with litellm installed
const PYTHON_BIN = process.env.GENAI_BRIDGE_PYTHON
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

    try {
        const result = await spawnBridge({ messages: prompt })

        if (!result.success) {
            logger.warn('GenAI bridge reported failure — falling back to simulation', {
                agentName,
                bridgeError: result.error
            })
            return {
                reply:        null,
                model:        'simulation',
                inputTokens:  0,
                outputTokens: 0,
                simulated:    true
            }
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
        logger.error('GenAI bridge spawn failed — falling back to simulation', err, { agentName })

        return {
            reply:        null,
            model:        'simulation',
            inputTokens:  0,
            outputTokens: 0,
            simulated:    true
        }
    }
}

/**
 * Spawn the Python bridge script, pipe messages in via stdin,
 * read JSON result from stdout.
 *
 * @param {object} params
 * @param {Array}  params.messages - OpenAI-format messages array
 * @returns {Promise<object>} parsed JSON result from call_llm.py
 */
function spawnBridge({ messages }) {
    return new Promise((resolve, reject) => {
        const child = spawn(PYTHON_BIN, [BRIDGE_SCRIPT], {
            cwd: BRIDGE_DIR,
            shell: false
        })

        let stdout = ''
        let stderr = ''
        let settled = false

        const timeout = setTimeout(() => {
            if (!settled) {
                settled = true
                child.kill()
                reject(new Error(`GenAI bridge timed out after ${CALL_TIMEOUT_MS}ms`))
            }
        }, CALL_TIMEOUT_MS)

        child.stdout.on('data', (data) => { stdout += data.toString() })
        child.stderr.on('data', (data) => { stderr += data.toString() })

        child.on('close', (code) => {
            if (settled) return
            settled = true
            clearTimeout(timeout)

            if (code !== 0 && !stdout) {
                return reject(new Error(`Bridge process exited with code ${code}: ${stderr}`))
            }

            try {
                const result = extractJsonFromOutput(stdout)
                resolve(result)
            } catch (parseErr) {
                reject(new Error(`Failed to parse bridge output: ${stdout} | stderr: ${stderr}`))
            }
        })

        child.on('error', (err) => {
            if (settled) return
            settled = true
            clearTimeout(timeout)
            reject(err)
        })

        child.stdin.write(JSON.stringify({ messages }))
        child.stdin.end()
    })
}

/**
 * Extract the JSON result line from stdout.
 * litellm prints debug/info noise before our JSON output
 * (e.g. "Give Feedback...", "LiteLLM.Info: ..."), so we scan
 * from the LAST line backwards and return the first one that
 * parses as valid JSON — our script always prints JSON last.
 */
function extractJsonFromOutput(stdout) {
    const lines = stdout.split(/\r?\n/).filter(Boolean)

    for (let i = lines.length - 1; i >= 0; i--) {
        try {
            return JSON.parse(lines[i])
        } catch {
            continue
        }
    }

    throw new Error('No valid JSON line found in bridge output')
}

/**
 * Health check — verify the Python bridge is reachable
 */
async function checkStackHealth() {
    try {
        const result = await spawnBridge({
            messages: [{ role: 'user', content: 'ping' }]
        })
        return { healthy: result.success === true, bridge: 'python-genai-bridge' }
    } catch (err) {
        return { healthy: false, bridge: 'python-genai-bridge', error: err.message }
    }
}

module.exports = { callAgent, checkStackHealth }