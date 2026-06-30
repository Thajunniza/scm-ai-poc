'use strict'

/**
 * inventory-agent.js
 * ───────────────────
 * Inventory Status Agent.
 * Composes: db-helper (data) + inventory-prompt (prompt) + base-agent (orchestration)
 */

const { BaseAgent }              = require('./base-agent')
const { ENTITIES, AGENTS }       = require('../utils/constants')
const dbHelper                   = require('../helpers/db-helper')
const { buildInventoryPrompt }   = require('../prompts/inventory-prompt')

class InventoryAgent extends BaseAgent {

    get name()     { return AGENTS.INVENTORY }
    get entities() { return [ENTITIES.PRODUCTS] }

    /**
     * Fetch inventory context from DB
     * Delegates entirely to db-helper — no raw queries here
     */
    async fetchContext(message) {
        this.logger.info('Fetching inventory context via db-helper')
        return dbHelper.getInventoryContext()
    }

    /**
     * Build the AI prompt
     * Delegates entirely to prompts/inventory-prompt.js
     */
    buildPrompt(message, context) {
        return buildInventoryPrompt(message, context)
    }

    /**
     * Parse AI response into final reply text
     * Falls back to simulation if AI stack returned simulated=true
     */
    parseResponse(aiResult, context) {
        if (aiResult?.reply) return aiResult.reply
        return this.simulateResponse(context)
    }

    /**
     * Simulation fallback — used when no real AI stack is connected.
     * Mirrors the structure a real AI response would have,
     * built purely from DB context (no AI call needed).
     */
    simulateResponse(context) {
        const { products, critical, low, healthy, totalValue } = context

        const lines = [
            `**Inventory Status Report**\n`,
            `**Overview:**`,
            `- Total SKUs Tracked: ${products.length}`,
            `- Out of Stock: ${critical.length} items`,
            `- Low Stock (below reorder point): ${low.length} items`,
            `- Healthy Stock: ${healthy.length} items`,
            `- Total Inventory Value: $${totalValue.toFixed(2)}\n`
        ]

        if (critical.length > 0) {
            lines.push(`⛔ **OUT OF STOCK — Immediate Action Required:**`)
            critical.forEach(p => {
                lines.push(`- **${p.name}** (${p.sku})`)
                lines.push(`  Warehouse: ${p.warehouse} | Reorder Qty: ${p.reorderPoint} units`)
            })
            lines.push('')
        }

        if (low.length > 0) {
            lines.push(`⚠️ **LOW STOCK — Reorder Soon:**`)
            low.forEach(p => {
                const coverage = ((p.stockLevel / p.reorderPoint) * 100).toFixed(0)
                lines.push(`- **${p.name}** (${p.sku})`)
                lines.push(`  Stock: ${p.stockLevel}/${p.reorderPoint} (${coverage}% of reorder point)`)
                lines.push(`  Warehouse: ${p.warehouse} | Unit Cost: $${p.unitCost}`)
            })
            lines.push('')
        }

        if (critical.length === 0 && low.length === 0) {
            lines.push(`✅ All items are above reorder point. No immediate action required.`)
        }

        return lines.join('\n')
    }
}

// Export singleton instance — same pattern across all agents
module.exports = new InventoryAgent()