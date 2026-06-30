'use strict'

/**
 * base-prompt.js
 * ──────────────
 * Shared prompt building blocks used by all agents.
 *
 * Why this exists:
 *   - Consistent tone and format across all agents
 *   - One place to update global prompt rules
 *   - Agents compose prompts using these helpers
 */

// ── Shared output format instructions ────────────────────────────────────────

const OUTPUT_FORMAT = `
RESPONSE FORMAT:
- Use markdown formatting (bold for important items, bullet points for lists)
- Always start with a one-line summary
- Group information under clear headings
- End with a "Recommended Actions" section if action is needed
- Be specific — always include numbers, dates, names from the data
- Never make up data — only use what is provided in the context
- If data is missing or unclear, say so explicitly
`

// ── Shared rules all agents must follow ──────────────────────────────────────

const SHARED_RULES = `
RULES:
- Answer ONLY from the data provided — never from general knowledge
- Be concise but complete — no unnecessary filler text
- Use exact values from the data (stock numbers, dates, scores)
- Flag urgent items clearly with appropriate emoji (⚠️ 🔴 ✅)
- If the question is outside your domain, say so and suggest the right agent
`

// ── Date context — helps model understand "today" ─────────────────────────────

function getDateContext() {
    const now = new Date()
    return `
CURRENT DATE CONTEXT:
- Today: ${now.toISOString().split('T')[0]}
- Day of week: ${now.toLocaleDateString('en-US', { weekday: 'long' })}
`
}

// ── Build a standard message array for GenAI Hub ──────────────────────────────

/**
 * Build messages array in OpenAI format
 * (same format used by SAP GenAI Hub)
 *
 * @param {object} params
 * @param {string} params.systemPrompt   - agent identity + rules
 * @param {string} params.contextData    - DB data formatted as string
 * @param {Array}  params.fewShotExamples - [{user, assistant}] examples
 * @param {string} params.userMessage    - actual user question
 * @returns {Array} messages array
 */
function buildMessages({ systemPrompt, contextData, fewShotExamples = [], userMessage }) {
    const messages = []

    // 1. System message — agent identity, rules, format
    messages.push({
        role:    'system',
        content: [
            systemPrompt,
            SHARED_RULES,
            OUTPUT_FORMAT,
            getDateContext()
        ].join('\n')
    })

    // 2. Few-shot examples — teach the model how to respond
    for (const example of fewShotExamples) {
        messages.push({ role: 'user',      content: example.user      })
        messages.push({ role: 'assistant', content: example.assistant  })
    }

    // 3. Context injection — real DB data
    if (contextData) {
        messages.push({
            role:    'user',
            content: `Here is the current SCM data you must use to answer:\n\n${contextData}`
        })
        messages.push({
            role:    'assistant',
            content: 'I have reviewed the current SCM data. I am ready to answer your question based on this data only.'
        })
    }

    // 4. Actual user question
    messages.push({
        role:    'user',
        content: userMessage
    })

    return messages
}

/**
 * Format a data section for the context block
 * Makes context readable and consistent across agents
 */
function formatSection(title, items, formatter) {
    if (!items || items.length === 0) {
        return `\n=== ${title} ===\nNone found.\n`
    }
    return `\n=== ${title} (${items.length}) ===\n${items.map(formatter).join('\n')}\n`
}

/**
 * Format a summary block
 */
function formatSummary(stats) {
    const lines = ['\n=== SUMMARY ===']
    for (const [key, value] of Object.entries(stats)) {
        lines.push(`- ${key}: ${value}`)
    }
    return lines.join('\n')
}

module.exports = {
    buildMessages,
    formatSection,
    formatSummary,
    OUTPUT_FORMAT,
    SHARED_RULES
}