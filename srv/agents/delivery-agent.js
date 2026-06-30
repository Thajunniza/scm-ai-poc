'use strict'

/**
 * delivery-agent.js
 * ──────────────────
 * Delivery Tracking Agent.
 * Composes: db-helper (data) + delivery-prompt (prompt) + base-agent (orchestration)
 */

const { BaseAgent }            = require('./base-agent')
const { ENTITIES, AGENTS }     = require('../utils/constants')
const dbHelper                 = require('../helpers/db-helper')
const { buildDeliveryPrompt }  = require('../prompts/delivery-prompt')

class DeliveryAgent extends BaseAgent {

    get name()     { return AGENTS.DELIVERY }
    get entities() { return [ENTITIES.SHIPMENTS, ENTITIES.PURCHASE_ORDERS] }

    async fetchContext(message) {
        this.logger.info('Fetching delivery context via db-helper')
        return dbHelper.getDeliveryContext()
    }

    buildPrompt(message, context) {
        return buildDeliveryPrompt(message, context)
    }

    parseResponse(aiResult, context) {
        if (aiResult?.reply) return aiResult.reply
        return this.simulateResponse(context)
    }

    simulateResponse(context) {
        const { shipments, delayed, inTransit, delivered, onTimeRate } = context

        const lines = [
            `**Delivery Status Report**\n`,
            `**Overview:**`,
            `- Total Shipments: ${shipments.length}`,
            `- Delayed: ${delayed.length}`,
            `- In Transit: ${inTransit.length}`,
            `- Delivered: ${delivered.length}`,
            `- On-Time Delivery Rate: ${onTimeRate}%\n`
        ]

        if (delayed.length > 0) {
            lines.push(`🔴 **Delayed Shipments — Action Required:**`)
            delayed.forEach(s => {
                lines.push(`\n- **${s.trackingNumber}** (${s.carrier})`)
                lines.push(`  Route: ${s.origin} → ${s.destination}`)
                lines.push(`  Expected: ${s.estimatedArrival}`)
                lines.push(`  Last Location: ${s.lastLocation}`)
                lines.push(`  Reason: ${s.delayReason}`)
            })
            lines.push('')
        }

        if (inTransit.length > 0) {
            lines.push(`🟡 **In Transit:**`)
            inTransit.forEach(s => {
                lines.push(`- **${s.trackingNumber}** | ${s.carrier} | ETA: ${s.estimatedArrival} | ${s.lastLocation}`)
            })
            lines.push('')
        }

        if (delayed.length === 0) {
            lines.push(`✅ No delayed shipments. All active shipments are on schedule.`)
        }

        return lines.join('\n')
    }
}

module.exports = new DeliveryAgent()