'use strict'

/**
 * inventory-prompt.js
 * ────────────────────
 * Builds the complete prompt for the Inventory Status Agent.
 *
 * Responsibilities:
 *   - Define agent identity and domain expertise
 *   - Format DB context into readable prompt text
 *   - Provide few-shot examples for consistent responses
 *   - Build final messages array for GenAI Hub
 *
 * Does NOT:
 *   - Fetch data (that is db-helper's job)
 *   - Call AI (that is remote-call-helper's job)
 *   - Handle errors (that is base-agent's job)
 */

const { buildMessages, formatSection, formatSummary } = require('./base-prompt')

// ── Agent identity ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `
You are the Inventory Status Agent for Aptiv's Supply Chain Management system.

YOUR EXPERTISE:
- Real-time stock level monitoring across all warehouses
- Identifying items at or below reorder points
- Calculating inventory value and coverage
- Recommending reorder quantities and priorities
- Flagging stockout risks before they impact production

YOUR DOMAIN:
- You have visibility into ALL products across ALL warehouses
- You understand the difference between reorder point (trigger) and max stock (ceiling)
- You know that stockLevel = 0 means production impact is immediate
- You prioritize by: stockouts first, then low stock, then healthy

WHAT YOU DO NOT KNOW:
- Delivery timelines (ask the Delivery Agent)
- Supplier reliability (ask the Supplier Risk Agent)
- Purchase order status (ask the Delivery Agent)
`

// ── Few-shot examples ─────────────────────────────────────────────────────────
// These teach the model the exact response style we want

const FEW_SHOT_EXAMPLES = [
    {
        user: 'What products are critically low on stock?',
        assistant: `**Inventory Alert Summary**

3 products require immediate attention.

⚠️ **LOW STOCK — Below Reorder Point:**

- **Intel Core i9 Processor** (EL-CPU-001)
  Stock: 45 units | Reorder Point: 50 units | Warehouse: WH-Berlin
  Coverage: 90% of reorder threshold

**Recommended Actions:**
1. Raise PO for EL-CPU-001 immediately — lead time applies
2. Monitor daily until replenishment arrives`
    },
    {
        user: 'What is the total inventory value?',
        assistant: `**Total Inventory Value**

Current value across all warehouses: **$24,600.00**

Breakdown by category:
- Electronics: $18,400.00 (74.8%)
- Raw Materials: $6,200.00 (25.2%)

**Recommended Actions:**
No action required — this is an informational summary.`
    }
]

// ── Context builder ───────────────────────────────────────────────────────────

/**
 * Format DB context into structured text for the prompt
 * @param {object} context - from db-helper.getInventoryContext()
 * @returns {string} formatted context string
 */
function buildContext(context) {
    const { products, critical, low, healthy, totalValue } = context

    const criticalSection = formatSection(
        'OUT OF STOCK — IMMEDIATE ACTION',
        critical,
        p => `  • ${p.sku} | ${p.name}
    Warehouse: ${p.warehouse} | Reorder Qty: ${p.reorderPoint} units | Unit Cost: $${p.unitCost}`
    )

    const lowSection = formatSection(
        'LOW STOCK — BELOW REORDER POINT',
        low,
        p => {
            const coverage = ((p.stockLevel / p.reorderPoint) * 100).toFixed(0)
            return `  • ${p.sku} | ${p.name}
    Stock: ${p.stockLevel}/${p.reorderPoint} units (${coverage}% of reorder point)
    Warehouse: ${p.warehouse} | Unit Cost: $${p.unitCost}`
        }
    )

    const healthySection = formatSection(
        'HEALTHY STOCK',
        healthy,
        p => `  • ${p.sku} | ${p.name} | Stock: ${p.stockLevel}/${p.maxStock} | Warehouse: ${p.warehouse}`
    )

    const summary = formatSummary({
        'Total SKUs':        products.length,
        'Out of Stock':      critical.length,
        'Low Stock':         low.length,
        'Healthy':           healthy.length,
        'Total Value':       `$${totalValue.toFixed(2)}`
    })

    return [criticalSection, lowSection, healthySection, summary].join('\n')
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Build complete messages array for GenAI Hub
 * @param {string} userMessage - sanitized user question
 * @param {object} context     - from db-helper.getInventoryContext()
 * @returns {Array} messages ready for AI call
 */
function buildInventoryPrompt(userMessage, context) {
    return buildMessages({
        systemPrompt:     SYSTEM_PROMPT,
        contextData:      buildContext(context),
        fewShotExamples:  FEW_SHOT_EXAMPLES,
        userMessage
    })
}

module.exports = { buildInventoryPrompt, buildContext }