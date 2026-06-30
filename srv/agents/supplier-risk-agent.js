'use strict'

/**
 * supplier-risk-agent.js
 * ───────────────────────
 * Supplier Risk Assessment Agent.
 * Composes: db-helper (data) + supplier-prompt (prompt) + base-agent (orchestration)
 */

const { BaseAgent }            = require('./base-agent')
const { ENTITIES, AGENTS,
        RISK_LEVELS,
        SUPPLIER_STATUS }      = require('../utils/constants')
const dbHelper                 = require('../helpers/db-helper')
const { buildSupplierPrompt }  = require('../prompts/supplier-prompt')

class SupplierRiskAgent extends BaseAgent {

    get name()     { return AGENTS.SUPPLIER_RISK }
    get entities() { return [ENTITIES.SUPPLIERS] }

    async fetchContext(message) {
        this.logger.info('Fetching supplier context via db-helper')
        return dbHelper.getSupplierContext()
    }

    buildPrompt(message, context) {
        return buildSupplierPrompt(message, context)
    }

    parseResponse(aiResult, context) {
        if (aiResult?.reply) return aiResult.reply
        return this.simulateResponse(context)
    }

    simulateResponse(context) {
        const { suppliers, critical, high, medium, low, probation, avgRisk } = context

        const lines = [
            `**Supplier Risk Assessment Report**\n`,
            `**Portfolio Overview:**`,
            `- Total Suppliers: ${suppliers.length}`,
            `- Average Risk Score: ${avgRisk}/100`,
            `- Critical Risk: ${critical.length}`,
            `- High Risk: ${high.length}`,
            `- Medium Risk: ${medium.length}`,
            `- Low Risk: ${low.length}`,
            `- On Probation: ${probation.length}\n`
        ]

        const highPriority = [...critical, ...high]
        if (highPriority.length > 0) {
            lines.push(`🔴 **High Risk Suppliers — Immediate Review Required:**`)
            highPriority.forEach(s => {
                const level = s.riskScore >= RISK_LEVELS.CRITICAL.min ? '🔴 CRITICAL' : '🟠 HIGH'
                lines.push(`\n- **${s.name}** (${s.country}) ${level}`)
                lines.push(`  Risk Score: ${s.riskScore}/100 | Status: ${s.status}`)
                lines.push(`  On-Time Delivery: ${s.onTimeDelivery}% | Quality: ${s.qualityScore}%`)
                if (s.status === SUPPLIER_STATUS.PROBATION) {
                    lines.push(`  ⚠️ Currently on PROBATION — monitor closely`)
                }
            })
            lines.push('')
        }

        if (medium.length > 0) {
            lines.push(`🟡 **Medium Risk — Monitor Quarterly:**`)
            medium.forEach(s => {
                lines.push(`- **${s.name}** (${s.country}) | Score: ${s.riskScore}/100 | OTD: ${s.onTimeDelivery}%`)
            })
            lines.push('')
        }

        if (low.length > 0) {
            lines.push(`🟢 **Low Risk — Reliable Partners:**`)
            low.forEach(s => {
                lines.push(`- **${s.name}** (${s.country}) | Score: ${s.riskScore}/100 | OTD: ${s.onTimeDelivery}%`)
            })
        }

        return lines.join('\n')
    }
}

module.exports = new SupplierRiskAgent()